@echo off
chcp 65001 > nul
title Elektron Jurnal - Telegram Boti

echo ===============================================================
echo     ELEKTRON JURNAL TELEGRAM BOTINI ISHGA TUSHIRISH
echo ===============================================================
echo.

:: .env mavjudligini tekshirish
if not exist ".env" (
    echo # TELEGRAM BOT TOKEN > .env
    echo BOT_TOKEN=>> .env
)

:: Tokenni .env dan o'qish
set TOKEN=
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="BOT_TOKEN" set TOKEN=%%b
)

:: Agar token bo'sh bo'lsa, foydalanuvchidan so'rash
if "%TOKEN%"=="" (
    echo [DIQQAT] Telegram Bot Tokeni topilmadi!
    echo.
    echo 1. Telegramda @BotFather ga kiring.
    echo 2. /newbot buyrug'i orqali yangi bot oching.
    echo 3. @BotFather bergan API tokenni shu yerga joylashtiring (Ctrl+V).
    echo.
    set /p INPUT_TOKEN="Bot Tokeningizni kiriting: "
    if not "%INPUT_TOKEN%"=="" (
        echo BOT_TOKEN=%INPUT_TOKEN%>.env
        echo.
        echo [OK] Token saqlandi!
    ) else (
        echo Token kiritilmadi. Bot to'xtatildi.
        pause
        exit /b
    )
)

echo.
echo Bot ishga tushirilmoqda...
echo Markaziy baza: jurnal.db bilan bog'lanmoqda...
echo.

py -3 bot.py

pause
