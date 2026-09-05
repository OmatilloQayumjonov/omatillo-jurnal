@echo off
chcp 65001 > nul
title Elektron Jurnal - Telegram Boti (@TalabaInfo_bot)

echo ===============================================================
echo     ELEKTRON JURNAL TELEGRAM BOTI ISHGA TUSHMOQDA...
echo     Bot manzili: https://t.me/TalabaInfo_bot
echo ===============================================================
echo.

where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    py -3 run.py
) else (
    python run.py
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [XATOLIK] Bot to'xtab qoldi. Yuqoridagi xatolikni ko'ring.
    pause
)
