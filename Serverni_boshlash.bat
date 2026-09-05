@echo off
chcp 65001 > nul
title Talabalar Jurnali Serveri

echo ===============================================================
echo     TALABALAR ELEKTRON JURNALI SERVERI ISHGA TUSHMOQDA...
echo ===============================================================
echo.

:: IP manzilni aniqlash
for /f "tokens=4" %%a in ('route print 0.0.0.0 ^| findstr 0.0.0.0 ^| findstr /v "Default"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip

echo [1] Kompyuterda ochish manzili:     http://localhost:5000
echo [2] Telefonda (Wi-Fi orqali):       http://%LOCAL_IP%:5000
echo.
echo     Standart Admin Login: admin
echo     Standart Admin Parol: admin123
echo.
echo ===============================================================
echo [3] INTERNETGA CHIQARILMOQDA (Istalgan joydan kirish uchun)...
echo ===============================================================
echo.

:: Python serverini fonda ishga tushirish
start /b "" py -3 server.py > server.log 2>&1

:: Brauzerda avtomatik ochish
timeout /t 2 > nul
start "" "http://localhost:5000"

:: Cloudflare Tunnel orqali dunyo bo'ylab jonli HTTPS havola yaratish
if exist "cloudflared.exe" (
    echo.
    echo Istalgan telefon va kompyuterdan kirish uchun INTERNET HAVOLANGIZ (HTTPS):
    echo Quyidagi yashil ramkada havolangiz ko'rinadi:
    echo.
    cloudflared.exe tunnel --url http://localhost:5000
) else (
    echo Lokal rejimda server ishlamoqda.
    pause
)
