@echo off
title Sohba - upload the APK for download
cd /d D:\Viraflow1
echo === Uploading the newest Sohba APK to your download link. This can take a few minutes. ===
node scripts\publish-apk-release.cjs
echo.
echo === Done. You can close this window. ===
pause
