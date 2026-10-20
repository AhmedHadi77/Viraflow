@echo off
title Sohba - update server
cd /d D:\Viraflow1
set TAG=%RANDOM%%RANDOM%
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\Viraflow1\push-to-github.ps1" > "D:\Viraflow1\.claude-sync\push-%TAG%.txt" 2>&1
powershell -NoProfile -Command "Get-Content 'D:\Viraflow1\.claude-sync\push-%TAG%.txt' -Tail 3"
echo.
echo === Done. Render is updating the server. You can close this window. ===
pause
