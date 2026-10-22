# Sohba - commit the latest changes and push them to GitHub so Render redeploys
# Run: powershell -ExecutionPolicy Bypass -File D:\Viraflow1\push-to-github.ps1
Set-Location "D:\Viraflow1"

# Stage everything except the APK, the old android folder, editor settings and the duplicate json.
# Secrets (.env files, keystores, admin keys) are already excluded by .gitignore.
# Commit author (only set if this PC has no Git identity yet)
if (-not (git config user.email)) { git config user.email "ahmed777hady@gmail.com" }
if (-not (git config user.name)) { git config user.name "Ahmed Hadi" }

git add -A -- . ':!*.apk' ':!android' ':!.vscode' ':!mobile/google-services (2).json' ':!.claude-sync' ':!sohba' ':!sohba-site.zip'
git commit -m "Sohba 1.0.14: Daylight redesign (white, cobalt, Manrope), fix chat and order database rules" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01Y5eZbnuB2VMsVoRpWv7ru8"
$commitCode = $LASTEXITCODE
git push origin main
$pushCode = $LASTEXITCODE
if ($commitCode -ne 0 -and -not (git status --porcelain)) { $commitCode = 0 }

# Publish the database security rules (calls + reports were added)
npm run firebase:deploy:rules
if ($LASTEXITCODE -ne 0) {
    Write-Host "RULES NOT PUBLISHED - paste firestore.rules into Firebase console > Firestore > Rules and press Publish." -ForegroundColor Yellow
}

if ($pushCode -eq 0 -and $commitCode -eq 0) {
    Write-Host "PUSHED - Render will now redeploy the backend." -ForegroundColor Green
} else {
    Write-Host "PUSH FAILED - copy the error above and send it to Claude." -ForegroundColor Red
}
