@echo off
chcp 65001 > nul
title Yangi GitHub Repozitoriyasiga Yuklash

echo =====================================================================
echo   ELEKTRON JURNAL & TELEGRAM BOT — YANGI GITHUBGA YUKLASH
echo   Muallif pochtasi: qayumjonovomatillo7@gmail.com
echo =====================================================================
echo.

set /p REPO_URL="Yangi GitHub repozitoriy havolasini kiriting (masalan: https://github.com/.../...git): "

if "%REPO_URL%"=="" (
    echo [XATOLIK] Repozitoriy havolasi kiritilmadi!
    pause
    exit /b
)

echo.
echo [1/4] Git foydalanuvchi sozlamalari yangilanmoqda...
git config user.email "qayumjonovomatillo7@gmail.com"
git config user.name "Omatillo"

echo [2/4] Yangi repozitoriy manzili o'rnatilmoqda: %REPO_URL%
git remote set-url origin %REPO_URL%

echo [3/4] Barcha fayllar va o'zgarishlar saqlanmoqda...
git add .
git commit -m "Elektron jurnal va Telegram bot - qayumjonovomatillo7@gmail.com hisobiga to'liq ko'chirildi" 2>nul

echo [4/4] Yangi GitHub repozitoriyasiga yuklanmoqda (Push)...
git branch -M main
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =====================================================================
    echo   [MUVAFFAQIN QALISHTIRILDI!] Loyiha yangi GitHub ga to'liq yuklandi!
    echo   Endi Render.com da "Continue with GitHub" orqali ulab deploy qilishingiz mumkin.
    echo =====================================================================
) else (
    echo.
    echo [DIQQAT] Yuklashda GitHub login/parol so'rashi mumkin.
    echo Brauzerda ochilgan oynada yangi hisobingizga ruxsat bering.
)

echo.
pause
