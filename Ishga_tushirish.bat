@echo off
chcp 65001 > nul
title Talabalar Elektron Jurnali va Telegram Boti (Markaziy Tizim)
echo ===============================================================
echo     TALABALAR ELEKTRON JURNALI VA TELEGRAM BOTI
echo ===============================================================
echo.
echo [1] Veb-sayt, Telegram bot va Internet Tunnel ishga tushmoqda...
echo.
echo 🌐 Kompyuterda ochish:       http://localhost:5000
echo 🤖 Telegram bot:             https://t.me/TalabaInfo_bot
echo 🔑 Admin login:              admin (yoki 1184083915)
echo 🔑 Admin parol:              admin123
echo.
echo Sayt brauzerda ochilmoqda...
start "" "http://localhost:5000"


where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    py -3 run.py
) else (
    python run.py
)
pause

