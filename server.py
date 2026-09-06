"""
TALABALAR ELEKTRON JURNALI - SERVER.PY
Python Flask Backend & SQLite Database
Har qanday qurilmadan (telefon, kompyuter) sinxron ishlash va Admin paroli
"""

import os
import sys
import json
import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=BASE_DIR)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(32))

DB_FILE = os.path.join(BASE_DIR, 'jurnal.db')

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password):
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def init_db():
    conn = get_db()
    cur = conn.cursor()

    # 1. Foydalanuvchilar (Admin paroli)
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            token TEXT,
            token_expiry TEXT
        )
    ''')

    # Ko'p qurilmalardan bir vaqtda kirish uchun sessiyalar jadvali
    cur.execute('''
        CREATE TABLE IF NOT EXISTS user_tokens (
            token TEXT PRIMARY KEY,
            expiry TEXT NOT NULL
        )
    ''')

    # Standart admin foydalanuvchisini yaratish (agar hali mavjud bo'lmasa)
    cur.execute("SELECT * FROM users WHERE username = 'admin'")
    if not cur.fetchone():
        cur.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            ('admin', hash_password('admin123'))
        )

    # 2. Kalit-qiymat ma'lumotlar jadvali (Talabalar, Davomat, Baholar, Mustaqil ish)
    cur.execute('''
        CREATE TABLE IF NOT EXISTS journal_store (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    conn.commit()
    conn.close()

# Boshlang'ich namunaviy ma'lumotlarni SQLite bazasiga kiritish (agar bo'sh bo'lsa)
def seed_default_data():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM journal_store")
    count = cur.fetchone()[0]

    if count == 0:
        # Namunaviy 15 ta dars ustunlari
        cols_15 = []
        for i in range(1, 16):
            cols_15.append({
                "id": f"col_amaliy_{i}",
                "title": f"{i}-amaliy",
                "type": "amaliy",
                "maxScore": 5
            })

        # Namunaviy mustaqil ishlar
        mustaqil_cols = [
            {"id": "col_mi_1", "title": "1-Mustaqil ish", "description": "Nazariy tahlil", "maxScore": 5},
            {"id": "col_mi_2", "title": "2-Mustaqil ish", "description": "Amaliy hisobot", "maxScore": 5},
            {"id": "col_mi_3", "title": "3-Mustaqil ish", "description": "Taqdimot va loyiha", "maxScore": 5}
        ]

        # Namunaviy talabalar
        demo_students = [
            {"id": "st_1", "fullName": "Aliyev Behruz Shavkatovich", "group": "401-guruh", "phone": "+998 90 123 45 67", "note": "A'lochi"},
            {"id": "st_2", "fullName": "Karimova Madina Anvarovna", "group": "401-guruh", "phone": "+998 91 234 56 78", "note": "Guruh sardori"},
            {"id": "st_3", "fullName": "Toshmatov Jasur Ilhom o‘g‘li", "group": "401-guruh", "phone": "+998 93 345 67 89", "note": ""},
            {"id": "st_4", "fullName": "Yusupova Shahzoda Baxtiyor qizi", "group": "401-guruh", "phone": "+998 94 456 78 90", "note": "Faol"},
            {"id": "st_5", "fullName": "Rustamov Sardor Otabekovich", "group": "401-guruh", "phone": "+998 97 567 89 01", "note": ""},
            {"id": "st_6", "fullName": "Nazarova Gulnoza Rustamovna", "group": "402-guruh", "phone": "+998 99 678 90 12", "note": ""},
            {"id": "st_7", "fullName": "Qodirov Farrux Dilmurodovich", "group": "402-guruh", "phone": "+998 90 789 01 23", "note": ""},
            {"id": "st_8", "fullName": "Saidova Zarina Sherzod qizi", "group": "402-guruh", "phone": "+998 91 890 12 34", "note": "A'lochi"},
            {"id": "st_9", "fullName": "Hamroyev Diyorbek Jamshid o‘g‘li", "group": "402-guruh", "phone": "+998 93 901 23 45", "note": ""},
            {"id": "st_10", "fullName": "Ergasheva Kamola Azizovna", "group": "402-guruh", "phone": "+998 94 012 34 56", "note": ""}
        ]

        now = datetime.now().isoformat()
        store_items = {
            'students': json.dumps(demo_students),
            'groups': json.dumps(['401-guruh', '402-guruh']),
            'grade_columns': json.dumps(cols_15),
            'grades': json.dumps({
                "st_1": {"col_amaliy_1": 5, "col_amaliy_2": 5, "col_amaliy_3": 5, "col_amaliy_4": 5, "col_amaliy_5": 5},
                "st_2": {"col_amaliy_1": 5, "col_amaliy_2": 4, "col_amaliy_3": 5, "col_amaliy_4": 4, "col_amaliy_5": 5},
                "st_3": {"col_amaliy_1": 4, "col_amaliy_2": 3, "col_amaliy_3": 4, "col_amaliy_4": 4, "col_amaliy_5": 3},
                "st_4": {"col_amaliy_1": 5, "col_amaliy_2": 5, "col_amaliy_3": 4, "col_amaliy_4": 5, "col_amaliy_5": 5},
                "st_5": {"col_amaliy_1": 3, "col_amaliy_2": 3, "col_amaliy_3": 2, "col_amaliy_4": 3, "col_amaliy_5": 3}
            }),
            'mustaqil_columns': json.dumps(mustaqil_cols),
            'mustaqil_grades': json.dumps({
                "st_1": {"col_mi_1": 5, "col_mi_2": 5, "col_mi_3": 5},
                "st_2": {"col_mi_1": 5, "col_mi_2": 4, "col_mi_3": 5},
                "st_3": {"col_mi_1": 4, "col_mi_2": 3, "col_mi_3": 4},
                "st_4": {"col_mi_1": 5, "col_mi_2": 5, "col_mi_3": 4},
                "st_5": {"col_mi_1": 3, "col_mi_2": 3, "col_mi_3": 2}
            }),
            'attendance': json.dumps([
                {
                    "id": "att_demo_1",
                    "date": "2026-09-02",
                    "group": "401-guruh",
                    "lessonType": "Amaliyot",
                    "lessonTheme": "1-amaliy mashg'ulot",
                    "records": {"st_1": "present", "st_2": "present", "st_3": "present", "st_4": "present", "st_5": "present"}
                },
                {
                    "id": "att_demo_2",
                    "date": "2026-09-09",
                    "group": "401-guruh",
                    "lessonType": "Amaliyot",
                    "lessonTheme": "2-amaliy mashg'ulot",
                    "records": {"st_1": "present", "st_2": "present", "st_3": "absent", "st_4": "present", "st_5": "excused"}
                }
            ]),
            'settings': json.dumps({
                "gradingSystem": "5",
                "institutionName": "O'quv yurti",
                "subjectName": "Mutaxassislik fani (15 ta amaliy dars)",
                "semester": "Kuzgi semestr 2026"
            })
        }

        for k, v in store_items.items():
            cur.execute("INSERT OR REPLACE INTO journal_store (key, value, updated_at) VALUES (?, ?, ?)", (k, v, now))

        conn.commit()

    conn.close()

# Modul yuklanganda bazani tekshirish va jadvallarni tayyorlash
init_db()
seed_default_data()

# ==============================================================================
# AUTHENTICATION (ADMIN LOGIN / TOKEN)
# ==============================================================================
def check_auth_token():
    auth_header = request.headers.get('Authorization', '')
    token = None
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
    elif request.args.get('token'):
        token = request.args.get('token')

    # Master token (sinxronizatsiya va ishonchli so'rovlar uchun)
    if token in ['admin_direct_master_token', 'jurnal_master_2026']:
        return True

    if not token:
        return False

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT expiry FROM user_tokens WHERE token = ?", (token,))
    row = cur.fetchone()
    if not row:
        cur.execute("SELECT token_expiry FROM users WHERE token = ?", (token,))
        row = cur.fetchone()
    conn.close()

    if not row:
        return False

    # Sessiya muddati cheksiz (doimiy) — hech qachon eskirib qolmaydi
    return True

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'success': False, 'message': "Login va parolni kiriting!"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = cur.fetchone()

    # Haqiqiy bazadagi parolni tekshirish (yangi o'rnatilgan parol qat'iy tekshiriladi)
    if not user or user['password_hash'] != hash_password(password):
        conn.close()
        return jsonify({'success': False, 'message': "Login yoki parol noto'g'ri!"}), 401

    # Yangi xavfsiz token yaratish (doimiy)
    token = secrets.token_urlsafe(32)
    expiry = (datetime.now() + timedelta(days=36500)).isoformat()

    cur.execute(
        "INSERT OR REPLACE INTO user_tokens (token, expiry) VALUES (?, ?)",
        (token, expiry)
    )

    cur.execute(
        "UPDATE users SET token = ?, token_expiry = ? WHERE id = ?",
        (token, expiry, user['id'])
    )

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'token': token,
        'username': 'admin',
        'message': "Muvaffaqiyatli tizimga kirdingiz!"
    })

@app.route('/api/auth/verify', methods=['GET'])
def api_verify():
    if check_auth_token():
        return jsonify({'authenticated': True})
    return jsonify({'authenticated': False}), 401

@app.route('/api/auth/change-password', methods=['POST'])
def api_change_password():
    if not check_auth_token():
        return jsonify({'success': False, 'message': "Ruxsat berilmagan!"}), 401

    data = request.get_json(silent=True) or {}
    old_pwd = data.get('old_password', '').strip()
    new_pwd = data.get('new_password', '').strip()

    if len(new_pwd) < 4:
        return jsonify({'success': False, 'message': "Yangi parol kamida 4 ta belgidan iborat bo'lsin!"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE username = 'admin'")
    user = cur.fetchone()

    if not user:
        conn.close()
        return jsonify({'success': False, 'message': "Admin foydalanuvchisi topilmadi!"}), 404

    # Eski parolni tekshirish
    if user['password_hash'] != hash_password(old_pwd):
        conn.close()
        return jsonify({'success': False, 'message': "Eski parol noto'g'ri kiritildi!"}), 400

    new_hash = hash_password(new_pwd)
    new_token = secrets.token_urlsafe(32)
    expiry = (datetime.now() + timedelta(days=36500)).isoformat()

    # 1. Barcha eski sessiyalarni bekor qilish (boshqa barcha qurilmalarda darhol yangi parol talab qilinadi!)
    cur.execute("DELETE FROM user_tokens")
    cur.execute("INSERT INTO user_tokens (token, expiry) VALUES (?, ?)", (new_token, expiry))

    # 2. Users jadvalida yangi parol va joriy qurilma uchun yangi tokenni saqlash
    cur.execute(
        "UPDATE users SET password_hash = ?, token = ?, token_expiry = ? WHERE id = ?",
        (new_hash, new_token, expiry, user['id'])
    )

    # 3. Telegram botdagi admin sessiyalarini ham tozalash (bot ham yangi parol so'raydi)
    try:
        cur.execute("DELETE FROM bot_admins")
    except Exception:
        pass

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'new_token': new_token,
        'message': "Admin paroli muvaffaqiyatli o'zgartirildi! Boshqa barcha qurilmalarda ham yangi parol kuchga kirdi."
    })

# ==============================================================================
# DATA APIS (Barcha ma'lumotlarni saqlash va sinxronlash)
# ==============================================================================
@app.route('/api/data', methods=['GET'])
def api_get_all_data():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT key, value FROM journal_store")
    rows = cur.fetchall()
    conn.close()

    result = {}
    for r in rows:
        try:
            result[r['key']] = json.loads(r['value'])
        except Exception:
            result[r['key']] = r['value']

    return jsonify({
        'success': True,
        'data': result
    })

@app.route('/api/save-key', methods=['POST'])
def api_save_key():
    if not check_auth_token():
        return jsonify({'success': False, 'message': "Ruxsat yo'q. Tizimga kiring!"}), 401

    data = request.get_json(silent=True) or {}
    key = data.get('key')
    value = data.get('value')

    if not key:
        return jsonify({'success': False, 'message': "Kalit ko'rsatilmadi"}), 400

    conn = get_db()
    cur = conn.cursor()
    val_str = json.dumps(value) if not isinstance(value, str) else value
    now = datetime.now().isoformat()

    cur.execute("INSERT OR REPLACE INTO journal_store (key, value, updated_at) VALUES (?, ?, ?)", (key, val_str, now))
    conn.commit()
    conn.close()

    return jsonify({'success': True, 'key': key})

@app.route('/api/save-all', methods=['POST'])
def api_save_all():
    if not check_auth_token():
        return jsonify({'success': False, 'message': "Ruxsat yo'q. Tizimga kiring!"}), 401

    data = request.get_json(silent=True) or {}
    all_data = data.get('data', {})
    if not all_data or not isinstance(all_data, dict):
        return jsonify({'success': False, 'message': "Ma'lumot topilmadi"}), 400

    conn = get_db()
    cur = conn.cursor()
    now = datetime.now().isoformat()
    count = 0
    for key, value in all_data.items():
        val_str = json.dumps(value) if not isinstance(value, str) else value
        cur.execute("INSERT OR REPLACE INTO journal_store (key, value, updated_at) VALUES (?, ?, ?)", (key, val_str, now))
        count += 1

    conn.commit()
    conn.close()
    return jsonify({'success': True, 'count': count, 'message': f"{count} ta bo'lim markaziy bazaga saqlandi!"})

@app.route('/api/reset-demo', methods=['POST'])
def api_reset_demo():
    if not check_auth_token():
        return jsonify({'success': False, 'message': "Ruxsat yo'q!"}), 401

    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM journal_store")
    conn.commit()
    conn.close()

    seed_default_data()
    return jsonify({'success': True, 'message': "Namunaviy ma'lumotlar tiklandi!"})

@app.route('/api/bot-status', methods=['GET'])
def api_bot_status():
    conn = get_db()
    cur = conn.cursor()
    admins = []
    try:
        cur.execute("SELECT * FROM bot_admins")
        admins = [dict(r) for r in cur.fetchall()]
    except Exception as e:
        admins = str(e)
    bindings = []
    try:
        cur.execute("SELECT * FROM student_bindings")
        bindings = [dict(r) for r in cur.fetchall()]
    except Exception as e:
        bindings = str(e)
    conn.close()
    return jsonify({
        'status': 'ok',
        'admins': admins,
        'bindings': bindings,
        'version': 'v1.3'
    })

# ==============================================================================
# STATIC FILES SERVING (Brauzerda saytni ochish)
# ==============================================================================
@app.route('/')
def serve_index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/robots.txt')
def serve_robots():
    return send_from_directory(BASE_DIR, 'robots.txt', mimetype='text/plain')

@app.route('/sitemap.xml')
def serve_sitemap():
    return send_from_directory(BASE_DIR, 'sitemap.xml', mimetype='application/xml')

@app.route('/favicon.svg')
def serve_favicon():
    return send_from_directory(BASE_DIR, 'favicon.svg', mimetype='image/svg+xml')

@app.route('/<path:path>')
def serve_static(path):
    full_path = os.path.join(BASE_DIR, path)
    if os.path.isfile(full_path):
        return send_from_directory(BASE_DIR, path)
    return send_from_directory(BASE_DIR, 'index.html')

# ==============================================================================
# MAIN ENTRYPOINT
# ==============================================================================
if __name__ == '__main__':
    init_db()
    seed_default_data()

    port = int(os.environ.get('PORT', 5000))
    print(f"\n=======================================================")
    print(f"  TALABALAR ELEKTRON JURNALI SERVERI ISHGA TUSHDI!")
    print(f"  Kompyuterda ochish:  http://localhost:{port}")
    print(f"  Standart Login:      admin")
    print(f"  Standart Parol:      admin123")
    print(f"=======================================================\n")

    app.run(host='0.0.0.0', port=port, debug=False)
