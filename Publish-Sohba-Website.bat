@echo off
title Sohba - publish the download page
cd /d D:\Viraflow1
if exist "D:\Viraflow1\sohba-site.zip" powershell -NoProfile -Command "Expand-Archive -Force 'D:\Viraflow1\sohba-site.zip' 'D:\Viraflow1\sohba'"
cd /d D:\Viraflow1\sohba
echo === Checking your Vercel sign-in ===
call npx --yes vercel@latest whoami > "D:\Viraflow1\.claude-sync\vercel-whoami.txt" 2>&1
if errorlevel 1 (
  echo A browser window will open: sign in to Vercel and confirm, then come back here.
  call npx --yes vercel@latest login
)
echo === Publishing the page ===
call npx --yes vercel@latest deploy --prod --yes > "D:\Viraflow1\.claude-sync\vercel-deploy.txt" 2>&1
type "D:\Viraflow1\.claude-sync\vercel-deploy.txt"
echo.
echo === Done. You can close this window. ===
pause
