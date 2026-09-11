@echo off
chcp 65001 > nul
title Talabalar Elektron Jurnali va Telegram Boti (Markaziy Tizim)
echo ===============================================================
echo     TALABALAR ELEKTRON JURNALI VA TELEGRAM BOTI
echo ===============================================================
echo.
echo [1] Veb-sayt va Telegram bot birgalikda ishga tushirilmoqda...
echo.
echo 🌐 Sayt manzili:  http://localhost:5000
echo 🤖 Telegram bot:  https://t.me/TalabaInfo_bot
echo 🔑 Admin login:   admin
echo 🔑 Admin parol:   admin123
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

