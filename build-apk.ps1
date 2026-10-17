# Sohba - build a signed release APK
# Run from PowerShell:  powershell -ExecutionPolicy Bypass -File D:\Viraflow1\build-apk.ps1
$ErrorActionPreference = "Stop"
$root = "D:\Viraflow1"
$androidDir = Join-Path $root "mobile\android"

# 1. JDK 17+ (searches JAVA_HOME, PATH, Android Studio and the usual install folders)
function Test-Jdk($dir) {
    if (-not $dir) { return $false }
    return (Test-Path (Join-Path $dir "bin\java.exe")) -and (Test-Path (Join-Path $dir "bin\javac.exe"))
}
$candidates = @()
if ($env:JAVA_HOME) { $candidates += $env:JAVA_HOME }
$javaOnPath = Get-Command java.exe -ErrorAction SilentlyContinue
if ($javaOnPath) { $candidates += (Split-Path (Split-Path $javaOnPath.Source -Parent) -Parent) }
$studioRoots = @(
    "C:\Program Files\Android\Android Studio",
    "C:\Program Files (x86)\Android\Android Studio",
    "$env:LOCALAPPDATA\Programs\Android Studio",
    "$env:LOCALAPPDATA\Android\Android Studio",
    "D:\Android\Android Studio",
    "D:\Program Files\Android\Android Studio"
)
foreach ($root in $studioRoots) { $candidates += (Join-Path $root "jbr"); $candidates += (Join-Path $root "jre") }
$vendorRoots = @(
    "C:\Program Files\Eclipse Adoptium", "C:\Program Files\Java", "C:\Program Files\Microsoft",
    "C:\Program Files\Zulu", "C:\Program Files\Amazon Corretto", "C:\Program Files\BellSoft",
    "C:\Program Files\OpenJDK", "$env:USERPROFILE\.jdks", "$env:USERPROFILE\.gradle\jdks", "D:\Java", "D:\Program Files\Java"
)
foreach ($root in $vendorRoots) {
    if (Test-Path $root) { $candidates += (Get-ChildItem $root -Directory -ErrorAction SilentlyContinue | ForEach-Object FullName) }
}
# Any other Android Studio install (for example "Android Studio1" or a JetBrains Toolbox copy)
$candidates += (Get-ChildItem "C:\Program Files\Android", "$env:LOCALAPPDATA\JetBrains\Toolbox\apps" -Directory -Recurse -Depth 3 -Filter "jbr" -ErrorAction SilentlyContinue | ForEach-Object FullName)

$jdk = $null
foreach ($dir in ($candidates | Where-Object { $_ } | Select-Object -Unique)) {
    if (-not (Test-Jdk $dir)) { continue }
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $versionText = (& (Join-Path $dir "bin\java.exe") -version 2>&1 | Out-String)
    $ErrorActionPreference = $previousPreference
    if ($versionText -match 'version "(\d+)') {
        if ([int]$Matches[1] -ge 17) { $jdk = $dir; break }
    }
}
if (-not $jdk) {
    Write-Host "NO JDK 17+ FOUND." -ForegroundColor Red
    Write-Host "Install it with this command, then close and reopen PowerShell and run this script again:" -ForegroundColor Yellow
    Write-Host "    winget install --id EclipseAdoptium.Temurin.17.JDK -e" -ForegroundColor Cyan
    Write-Host "(or download JDK 17 from https://adoptium.net)" -ForegroundColor Yellow
    exit 1
}
$env:JAVA_HOME = $jdk
$env:Path = "$jdk\bin;$env:Path"
Write-Host "Using JDK: $jdk" -ForegroundColor Green

# 1b. Android SDK. Installed automatically (command-line tools only, no Android Studio needed).
$sdkCandidates = @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, "$env:LOCALAPPDATA\Android\Sdk", "C:\Android\Sdk", "D:\Android\Sdk") | Where-Object { $_ }
$sdk = $sdkCandidates | Where-Object { Test-Path (Join-Path $_ "cmdline-tools\latest\bin\sdkmanager.bat") } | Select-Object -First 1
if (-not $sdk) {
    $sdk = "$env:LOCALAPPDATA\Android\Sdk"
    Write-Host "Android SDK not found. Downloading the official Android command-line tools (about 160 MB)..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $sdk | Out-Null
    $zip = Join-Path $env:TEMP "android-cmdline-tools.zip"
    $ProgressPreference = "SilentlyContinue"
    Invoke-WebRequest -Uri "https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip" -OutFile $zip -UseBasicParsing
    $hash = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
    if ($hash -ne "90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a") {
        Write-Host "The download is corrupted (checksum mismatch). Run the script again." -ForegroundColor Red
        exit 1
    }
    $unpack = Join-Path $env:TEMP "android-cmdline-tools"
    if (Test-Path $unpack) { Remove-Item $unpack -Recurse -Force }
    Expand-Archive $zip -DestinationPath $unpack -Force
    New-Item -ItemType Directory -Force -Path (Join-Path $sdk "cmdline-tools") | Out-Null
    $latest = Join-Path $sdk "cmdline-tools\latest"
    if (Test-Path $latest) { Remove-Item $latest -Recurse -Force }
    Move-Item (Join-Path $unpack "cmdline-tools") $latest
    Remove-Item $zip -Force
}
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$sdkmanager = Join-Path $sdk "cmdline-tools\latest\bin\sdkmanager.bat"
$needed = @("platform-tools", "platforms;android-36", "build-tools;36.0.0", "ndk;27.1.12297006", "cmake;3.22.1")
$missing = $needed | Where-Object { -not (Test-Path (Join-Path $sdk ($_ -replace ';', '\'))) }
if ($missing) {
    Write-Host "Installing Android SDK parts (first time only, about 3 GB - this takes a while): $($missing -join ', ')" -ForegroundColor Yellow
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    ("y`n" * 40) | & $sdkmanager --sdk_root="$sdk" --licenses | Out-Null
    & $sdkmanager --sdk_root="$sdk" @missing
    $sdkExit = $LASTEXITCODE
    $ErrorActionPreference = $previousPreference
    if ($sdkExit -ne 0) {
        Write-Host "ANDROID SDK INSTALL FAILED - copy the error above and send it to Claude." -ForegroundColor Red
        exit 1
    }
}
Set-Content -Path (Join-Path $androidDir "local.properties") -Value ("sdk.dir=" + ($sdk -replace '\\', '\\')) -Encoding ASCII
Write-Host "Using Android SDK: $sdk" -ForegroundColor Green

# 2. Release signing (same key as the installed app, otherwise phones refuse the update)
$keystoreProps = Join-Path $androidDir "keystore.properties"
if (-not (Test-Path $keystoreProps)) {
    $legacyProps = Join-Path $root "android\keystore.properties"
    $legacyStore = Join-Path $root "android\app\pulseora-release.keystore"
    if ((Test-Path $legacyProps) -and (Test-Path $legacyStore)) {
        Copy-Item $legacyProps $keystoreProps
        Copy-Item $legacyStore (Join-Path $androidDir "app\pulseora-release.keystore")
        Write-Host "Copied release keystore into mobile\android." -ForegroundColor Green
    } else {
        Write-Host "Missing mobile\android\keystore.properties - see keystore.properties.example." -ForegroundColor Red
        exit 1
    }
}

# 3. JS dependencies (always run, so newly added native modules such as react-native-webrtc get installed)
Write-Host "Installing npm packages..." -ForegroundColor Yellow
Push-Location $root
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Host "npm install FAILED - copy the error above and send it to Claude." -ForegroundColor Red
    exit 1
}
Pop-Location

# 4. Build
Set-Location $androidDir
.\gradlew clean assembleRelease
if ($LASTEXITCODE -ne 0) {
    Write-Host "BUILD FAILED - copy the error above and send it to Claude." -ForegroundColor Red
    exit 1
}

$version = (Get-Content (Join-Path $root "mobile\app.json") -Raw | ConvertFrom-Json).expo.version
$apk = Join-Path $androidDir "app\build\outputs\apk\release\app-release.apk"
$output = Join-Path $root "Sohba-$version-android-release.apk"
Copy-Item $apk $output -Force

Write-Host ""
Write-Host "BUILD SUCCEEDED" -ForegroundColor Green
Write-Host "APK ready at: $output"
Write-Host "Copy it to your phone and tap it to install."
