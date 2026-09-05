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
    """Telegram botni asinxron ishga tushirish"""
    try:
        asyncio.run(bot.main())
    except (KeyboardInterrupt, SystemExit):
        print("Telegram bot to'xtatildi.")

if __name__ == '__main__':
    print("\n" + "=" * 65)
    print("  ELEKTRON JURNAL & TELEGRAM BOT — 24/7 BIRLASHTIRILGAN TIZIM")
    print("=" * 65)

    # 1. Ma'lumotlar bazalarini ishga tushirish
    init_db()
    seed_default_data()
    bot.init_bot_db()
    print("  [OK] Baza (jurnal.db) va xavfsizlik jadvallari tayyor.")

    # 2. Veb-sayt serverini alohida daemon оqimda ishga tushiramiz
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    # 3. Asosiy оqimda Telegram botni yurgizamiz
    try:
        run_telegram_bot()
    except (KeyboardInterrupt, SystemExit):
        print("\nTizim to'liq to'xtatildi.")
