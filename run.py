"""
YAGONA MARKAZIY ISHGA TUSHIRUVCHI (UNIFIED RUNNER)
Elektron Jurnal Veb-serveri (server.py) va Telegram Botini (bot.py) bir vaqtda 24/7 ishlatadi.
Bulutli hostinglar (Render, Railway, Koyeb, VPS) hamda lokal kompyuter uchun to'liq moslangan.
"""

import os
import sys
import threading
import asyncio
import logging

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from server import app, init_db, seed_default_data
import bot

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_flask():
    """Flask veb-saytini alohida оqimda (thread) ishga tushirish"""
    port = int(os.environ.get('PORT', 5000))
    host = '0.0.0.0'
    print(f"  [OK] Veb-sayt serveri ishga tushdi: http://{host}:{port}")
    app.run(host=host, port=port, debug=False, use_reloader=False)

def run_telegram_bot():
    """Telegram botni asinxron ishga tushirish (uzluksiz qayta ulanish bilan)"""
    import time
    while True:
        try:
            asyncio.run(bot.main())
        except (KeyboardInterrupt, SystemExit):
            print("Telegram bot to'xtatildi.")
            break
        except Exception as e:
            logger.error(f"Telegram botda kutilmagan xatolik: {e}. 5 soniyadan so'ng qayta ulanadi...")
            time.sleep(5)

def run_keep_alive():
    """Render.com da server uxlab qolmasligi uchun muntazam o'zini-o'zi ping qilib turish"""
    import time
    import urllib.request
    url = os.environ.get('RENDER_EXTERNAL_URL') or 'https://omatillo-jurnal.onrender.com'
    print(f"  [OK] Render 24/7 Keep-Alive faollashtirildi: {url}")
    while True:
        time.sleep(300)
        try:
            req = urllib.request.Request(f"{url}/api/settings", headers={'User-Agent': 'Render-KeepAlive/1.0'})
            urllib.request.urlopen(req, timeout=15)
        except Exception:
            pass

def get_local_ip() -> str:
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def run_tunnel():
    """Lokal kompyuterni har qanday telefon va qurilmadan kirish uchun Cloudflare HTTPS orqali internetga ulash"""
    import subprocess
    import re
    import time

    cf_exe = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cloudflared.exe')
    if not os.path.exists(cf_exe) or sys.platform != 'win32':
        return

    time.sleep(2)
    try:
        proc = subprocess.Popen(
            [cf_exe, 'tunnel', '--url', 'http://localhost:5000'],
            stderr=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True,
            encoding='utf-8',
            errors='replace'
        )

        while True:
            line = proc.stderr.readline()
            if not line:
                break
            m = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
            if m:
                tunnel_url = m.group(0)
                print("\n" + "=" * 65)
                print(f"  [JONLI INTERNET SAYT — BARCHA TELEFON VA QURILMALARDAN KIRISH]")
                print(f"  --> {tunnel_url}")
                print("=" * 65 + "\n")

                try:
                    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ONLINE_URL.txt'), 'w', encoding='utf-8') as fp:
                        fp.write(tunnel_url)
                except Exception:
                    pass

                try:
                    desktop = os.path.expandvars(r'%USERPROFILE%\Desktop')
                    shortcut_path = os.path.join(desktop, 'TELEFONDA_OCHISH.url')
                    with open(shortcut_path, 'w', encoding='utf-8') as sc:
                        sc.write(f"[InternetShortcut]\nURL={tunnel_url}\n")
                except Exception:
                    pass
                break
    except Exception as e:
        logger.error(f"Cloudflare tunnel ishga tushirishda xatolik: {e}")

if __name__ == '__main__':
    local_ip = get_local_ip()
    print("\n" + "=" * 65)
    print("  ELEKTRON JURNAL & TELEGRAM BOT — BARCHA QURILMALAR UCHUN")
    print("=" * 65)

    # 1. Ma'lumotlar bazalarini ishga tushirish
    init_db()
    seed_default_data()
    bot.init_bot_db()
    print("  [OK] Baza (jurnal.db) va xavfsizlik jadvallari tayyor.")
    print(f"  [OK] Kompyuterda ochish:         http://localhost:5000")
    print(f"  [OK] Bir xil Wi-Fi dagi telefonda: http://{local_ip}:5000")

    # 2. Veb-sayt serverini alohida daemon оqimda ishga tushiramiz
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    # 3. Internetga avtomatik tunnel ochish (agar kompyuterda bo'lsa)
    tunnel_thread = threading.Thread(target=run_tunnel, daemon=True)
    tunnel_thread.start()

    # 4. Agar Render bulutida bo'lsa, uxlab qolmaslik uchun keep-alive оqimini yoqamiz
    keep_alive_thread = threading.Thread(target=run_keep_alive, daemon=True)
    keep_alive_thread.start()

    # 5. Asosiy оqimda Telegram botni yurgizamiz
    try:
        run_telegram_bot()
    except (KeyboardInterrupt, SystemExit):
        print("\nTizim to'liq to'xtatildi.")

