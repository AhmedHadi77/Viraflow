@echo off
title Sohba - check
cd /d D:\Viraflow1
node scripts\check-server-update.cjs
echo.
echo === Done. You can close this window. ===
pause
