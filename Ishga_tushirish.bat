@echo off
chcp 65001 > nul
title Talabalar Elektron Jurnali
echo ===================================================
echo     TALABALAR ELEKTRON JURNALI SAYTI
echo ===================================================
echo.
echo Dastur brauzeringizda ochilmoqda...
echo.

start "" "%~dp0index.html"

echo Dastur muvaffaqiyatli ishga tushirildi!
echo Ushbu oynani yopishingiz mumkin.
timeout /t 3 > nul
exit
