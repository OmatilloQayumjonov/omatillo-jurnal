"""
TALABALAR ELEKTRON JURNALI - TELEGRAM BOT (aiogram 3)
Talabalar uchun shaxsiy davomat, 15 ta amaliy dars va mustaqil ish baholarini ko'rish boti.
XAVFSIZLIK: Har bir talaba faqat o'z baholarini ko'radi, boshqa talabalarnikini ko'ra olmaydi!
Markaziy SQLite bazasi (jurnal.db) bilan real vaqt rejimida bog'langan.
"""

import os
import sys
import json
import sqlite3
import hashlib
import asyncio
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from aiogram import Bot, Dispatcher, Router, F
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.filters import CommandStart, Command
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, 'jurnal.db')
ENV_FILE = os.path.join(BASE_DIR, '.env')

import base64
_FALLBACK_TOKEN = "ODYxOTE3NzA1MTpBQUdodUJiRXpLVUFiM0wzSU1kZjVQc3NWcnVzbE1ZSkxCaw=="

def load_bot_token() -> str:
    token = os.environ.get('BOT_TOKEN', '').strip()
    if not token and os.path.exists(ENV_FILE):
        with open(ENV_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('BOT_TOKEN='):
                    token = line.split('=', 1)[1].strip().strip('"').strip("'")
                    break
    if not token:
        try:
            token = base64.b64decode(_FALLBACK_TOKEN).decode('utf-8').strip()
        except Exception:
            pass
    return token

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

MASTER_ADMIN_TELEGRAM_ID = 1184083915

def init_bot_db():
    """Bot uchun kerakli biriktirishlar (bindings) jadvalini yaratish"""
    conn = get_db()
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS student_bindings (
            telegram_id INTEGER PRIMARY KEY,
            student_id TEXT UNIQUE NOT NULL,
            telegram_username TEXT,
            full_name TEXT NOT NULL,
            group_name TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS bot_admins (
            telegram_id INTEGER PRIMARY KEY,
            username TEXT,
            created_at TEXT NOT NULL
        )
    ''')
    # Faqat 1184083915 ni yagona admin qilib o'rnatish
    cur.execute("DELETE FROM bot_admins WHERE telegram_id != ?", (MASTER_ADMIN_TELEGRAM_ID,))
    cur.execute(
        "INSERT OR REPLACE INTO bot_admins (telegram_id, username, created_at) VALUES (?, ?, ?)",
        (MASTER_ADMIN_TELEGRAM_ID, 'MasterAdmin_1184083915', datetime.now().isoformat())
    )
    conn.commit()
    conn.close()


def get_store_item(key: str, default=None):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT value FROM journal_store WHERE key = ?", (key,))
        row = cur.fetchone()
        conn.close()
        if row:
            return json.loads(row['value'])
    except Exception as e:
        logger.error(f"Xatolik get_store_item({key}): {e}")
    return default

def get_all_groups() -> List[str]:
    groups = get_store_item('groups', [])
    if not groups:
        students = get_store_item('students', [])
        groups = sorted(list(set(s.get('group') for s in students if s.get('group'))))
    return groups

def get_students_by_group(group_name: str) -> List[Dict[str, Any]]:
    students = get_store_item('students', [])
    filtered = [s for s in students if s.get('group') == group_name]
    return sorted(filtered, key=lambda x: x.get('fullName', ''))

def get_student_by_id(student_id: str) -> Optional[Dict[str, Any]]:
    students = get_store_item('students', [])
    for s in students:
        if s.get('id') == student_id:
            return s
    return None

# ==============================================================================
# BIRIKTIRISH (BINDINGS) VA XAVFSIZLIK FUNKSIYALARI
# ==============================================================================
def get_binding_by_telegram_id(telegram_id: int) -> Optional[sqlite3.Row]:
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM student_bindings WHERE telegram_id = ?", (telegram_id,))
    row = cur.fetchone()
    conn.close()
    return row

def get_binding_by_student_id(student_id: str) -> Optional[sqlite3.Row]:
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM student_bindings WHERE student_id = ?", (student_id,))
    row = cur.fetchone()
    conn.close()
    return row

def get_all_bound_student_ids() -> set:
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT student_id FROM student_bindings")
    rows = cur.fetchall()
    conn.close()
    return {r['student_id'] for r in rows}

def bind_student(telegram_id: int, student_id: str, telegram_username: str, full_name: str, group_name: str) -> bool:
    try:
        conn = get_db()
        cur = conn.cursor()
        now = datetime.now().isoformat()
        cur.execute('''
            INSERT INTO student_bindings (telegram_id, student_id, telegram_username, full_name, group_name, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (telegram_id, student_id, telegram_username or '', full_name, group_name, now))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        return False

def unbind_student(student_id: str) -> bool:
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM student_bindings WHERE student_id = ?", (student_id,))
    deleted = cur.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def get_all_bindings() -> List[sqlite3.Row]:
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM student_bindings ORDER BY group_name, full_name")
    rows = cur.fetchall()
    conn.close()
    return rows

def verify_admin_password(password: str) -> bool:
    pwd = str(password).strip()
    if not pwd:
        return False
    try:
        pwd_hash = hashlib.sha256(pwd.encode('utf-8')).hexdigest()
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE username = 'admin' AND password_hash = ?", (pwd_hash,))
        row = cur.fetchone()
        conn.close()
        return row is not None
    except Exception as e:
        logger.error(f"verify_admin_password error: {e}")
        return False

def is_admin(telegram_id: int) -> bool:
    try:
        return int(telegram_id) == MASTER_ADMIN_TELEGRAM_ID
    except Exception:
        return False

def add_admin(telegram_id: int, username: str = ''):
    if int(telegram_id) == MASTER_ADMIN_TELEGRAM_ID:
        try:
            conn = get_db()
            cur = conn.cursor()
            now = datetime.now().isoformat()
            cur.execute(
                "INSERT OR REPLACE INTO bot_admins (telegram_id, username, created_at) VALUES (?, ?, ?)",
                (MASTER_ADMIN_TELEGRAM_ID, username or '', now)
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"add_admin error: {e}")

def remove_admin(telegram_id: int):
    # Master admin hech qachon o'chirib yuborilmaydi
    pass


# Admin sessiyalari va holatlar
WAITING_ADMIN_PASSWORD = set()

# ==============================================================================
# TALABA HISOBOTI (REPORT GENERATOR)
# ==============================================================================
def build_student_report(student_id: str) -> Optional[str]:
    student = get_student_by_id(student_id)
    if not student:
        return None

    full_name = student.get('fullName', 'Noma\'lum')
    group = student.get('group', 'Noma\'lum')
    
    settings = get_store_item('settings', {})
    subject_name = settings.get('subjectName', 'Mutaxassislik fani (15 ta amaliy dars)')
    institution = settings.get('institutionName', "Ta'lim muassasasi")

    # 1. DAVOMAT
    attendance_data = get_store_item('attendance', [])
    group_att = [a for a in attendance_data if a.get('group') == group]
    
    total_lessons = len(group_att)
    attended = 0
    absent_hours = 0
    excused_hours = 0

    for lesson in group_att:
        records = lesson.get('records', {})
        status = records.get(student_id)
        if status == 'present':
            attended += 1
        elif status == 'absent':
            absent_hours += 2
        elif status == 'excused':
            excused_hours += 2

    att_percent = round((attended / total_lessons * 100)) if total_lessons > 0 else 100

    if att_percent >= 80:
        att_badge = f"{att_percent}% ✅ (A'lo)"
    elif att_percent >= 60:
        att_badge = f"{att_percent}% ⚠️ (Chegarada)"
    else:
        att_badge = f"{att_percent}% ❌ (Xavfli!)"

    # 2. 15 TA AMALIY DARS BAHOLARI
    grade_cols = get_store_item('grade_columns', [])
    grades_dict = get_store_item('grades', {}).get(student_id, {})
    
    pr_scores = []
    pr_lines = []
    
    for col in grade_cols:
        col_id = col.get('id')
        col_title = col.get('title', col_id)
        score = grades_dict.get(col_id)
        if score is not None and str(score).strip() != '':
            try:
                num_score = float(score)
                pr_scores.append(num_score)
                pr_lines.append(f"  • {col_title}: <b>{num_score:g} ball</b>")
            except ValueError:
                pass
        else:
            pr_lines.append(f"  • {col_title}: <i>baholanmagan</i>")

    pr_avg = round(sum(pr_scores) / len(pr_scores), 2) if pr_scores else 0.0

    # 3. MUSTAQIL ISH BAHOLARI
    mi_cols = get_store_item('mustaqil_columns', [])
    mi_grades_dict = get_store_item('mustaqil_grades', {}).get(student_id, {})
    
    mi_scores = []
    mi_lines = []
    
    for col in mi_cols:
        col_id = col.get('id')
        col_title = col.get('title', col_id)
        score = mi_grades_dict.get(col_id)
        if score is not None and str(score).strip() != '':
            try:
                num_score = float(score)
                mi_scores.append(num_score)
                mi_lines.append(f"  • {col_title}: <b>{num_score:g} ball</b>")
            except ValueError:
                pass
        else:
            mi_lines.append(f"  • {col_title}: <i>topshirilmagan</i>")

    mi_avg = round(sum(mi_scores) / len(mi_scores), 2) if mi_scores else 0.0

    # 4. GPA VA REYTING
    all_scores = pr_scores + mi_scores
    overall_avg = round(sum(all_scores) / len(all_scores), 2) if all_scores else 0.0

    if overall_avg >= 4.5:
        status_text = "🟢 A'lochi (5 baho)"
    elif overall_avg >= 3.5:
        status_text = "🔵 Yaxshi (4 baho)"
    elif overall_avg >= 2.5:
        status_text = "🟡 Qoniqarli (3 baho)"
    elif overall_avg > 0:
        status_text = "🔴 Qarzdor (2 baho)"
    else:
        status_text = "⚪️ Baholar mavjud emas"

    text = (
        f"🎓 <b>TALABA HISOBOTI</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 <b>F.I.SH:</b> {full_name}\n"
        f"👥 <b>Guruh:</b> {group}\n"
        f"📚 <b>Fan:</b> {subject_name}\n"
        f"🏛 <b>Muassasa:</b> {institution}\n\n"

        f"📅 <b>DAVOMAT MA'LUMOTI:</b>\n"
        f"• Jami o'tilgan darslar: <b>{total_lessons} ta</b>\n"
        f"• Qatnashgan darslari: <b>{attended} ta</b>\n"
        f"• Sababsiz qoldirilgan: <b>{absent_hours} soat</b>" + (" ⚠️" if absent_hours > 0 else "") + "\n"
        f"• Sababli qoldirilgan: <b>{excused_hours} soat</b>\n"
        f"• Davomat ko'rsatkichi: <b>{att_badge}</b>\n\n"

        f"📝 <b>15 TA AMALIY DARS BAHOLARI:</b>\n"
        + "\n".join(pr_lines[:15]) + "\n"
        f"👉 <i>Amaliy mashg'ulotlar o'rtachasi:</i> <b>{pr_avg} ball</b>\n\n"

        f"📖 <b>MUSTAQIL ISH BAHOLARI:</b>\n"
        + ("\n".join(mi_lines) if mi_lines else "  • <i>Mustaqil ishlar kiritilmagan</i>") + "\n"
        f"👉 <i>Mustaqil ishlar o'rtachasi:</i> <b>{mi_avg} ball</b>\n\n"

        f"🏆 <b>YAKUNIY REYTING VA O'ZLASHTIRISH:</b>\n"
        f"• <b>Umumiy o'rtacha ball (GPA):</b> <code>{overall_avg}</code>\n"
        f"• <b>O'zlashtirish holati:</b> {status_text}\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"<i>🔒 Siz faqat o'z ma'lumotlaringizni ko'rmoqdasiz.</i>"
    )
    return text

# ==============================================================================
# ROUTER VA TUGMALAR
# ==============================================================================
router = Router()

def get_online_url() -> str:
    render_url = os.environ.get('RENDER_EXTERNAL_URL')
    if render_url:
        return render_url

    online_file = os.path.join(BASE_DIR, 'ONLINE_URL.txt')
    if os.path.exists(online_file):
        try:
            with open(online_file, 'r', encoding='utf-8') as f:
                u = f.read().strip()
                if u.startswith('http'):
                    return u
        except Exception:
            pass

    return 'https://omatillo-jurnal.onrender.com'

def get_student_home_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🌐 Saytni ochish (Har qanday qurilmadan)", url=get_online_url())],
        [InlineKeyboardButton(text="🔄 Natijalarni yangilash", callback_data="refresh_my_report")],
        [InlineKeyboardButton(text="👤 Shaxsiy ma'lumotlarim", callback_data="my_profile")],
        [InlineKeyboardButton(text="🔑 O'qituvchi (Admin)", callback_data="btn_admin_login")],
        [InlineKeyboardButton(text="ℹ️ Bot haqida", callback_data="btn_about")]
    ])

def get_unbound_welcome_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🌐 Saytni ochish (Har qanday qurilmadan)", url=get_online_url())],
        [InlineKeyboardButton(text="🔗 O'z hisobimni biriktirish", callback_data="start_bind")],
        [InlineKeyboardButton(text="🔑 O'qituvchi (Admin)", callback_data="btn_admin_login")],
        [InlineKeyboardButton(text="ℹ️ Bot haqida", callback_data="btn_about")]
    ])

def get_admin_dashboard_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🌐 Jurnal Veb-saytini ochish", url=get_online_url())],
        [InlineKeyboardButton(text="👥 Barcha guruhlar va talabalar", callback_data="admin_groups")],
        [InlineKeyboardButton(text="🔗 Biriktirilgan talabalar ro'yxati", callback_data="admin_bindings")],
        [InlineKeyboardButton(text="🚪 Admin rejimidan chiqish", callback_data="admin_logout")]
    ])


@router.message(CommandStart())
async def handle_start(message: Message):
    user_id = message.from_user.id
    first_name = message.from_user.first_name

    # 1. Admin rejimidami?
    if is_admin(user_id):
        await message.answer(
            "👨‍🏫 <b>O'QITUVCHI / ADMIN BOSHQARUV PANELI</b>\n"
            "Barcha guruhlar va talabalarni ko'rishingiz mumkin:",
            reply_markup=get_admin_dashboard_keyboard(),
            parse_mode=ParseMode.HTML
        )
        return

    # 2. Talaba hisobi biriktirilganmi?
    binding = get_binding_by_telegram_id(user_id)
    if binding:
        report_text = build_student_report(binding['student_id'])
        if report_text:
            await message.answer(
                report_text,
                reply_markup=get_student_home_keyboard(),
                parse_mode=ParseMode.HTML
            )
        else:
            await message.answer(
                f"Siz <b>{binding['full_name']}</b> ({binding['group_name']}) sifatida ulangansiz.\n"
                f"Biroq jurnaldan ma'lumot topilmadi.",
                reply_markup=get_student_home_keyboard(),
                parse_mode=ParseMode.HTML
            )
        return

    # 3. Hali biriktirilmagan yangi talaba
    text = (
        f"Assalomu alaykum, <b>{first_name}</b>! 👋\n\n"
        f"<b>Elektron Jurnal</b> rasmiy botiga xush kelibsiz.\n\n"
        f"🔒 <b>SHAXSIY MA'LUMOTLAR XAVFSIZLIGI:</b>\n"
        f"Tizimda har bir talaba <b>faqat o'zining</b> baho va davomatini ko'ra oladi. "
        f"Boshqa talabalar sizning baholaringizni ko'ra olmaydi.\n\n"
        f"O'z natijalaringizni ko'rish uchun quyidagi tugma orqali guruhingiz va ismingizni bir marta biriktiring:"
    )
    await message.answer(text, reply_markup=get_unbound_welcome_keyboard(), parse_mode=ParseMode.HTML)

@router.message(Command("admin"))
async def handle_admin_cmd(message: Message):
    user_id = message.from_user.id
    if int(user_id) != MASTER_ADMIN_TELEGRAM_ID:
        await message.answer(
            "⛔️ <b>Ruxsat berilmagan!</b>\n"
            "Bu botda faqat yagona bosh administrator (ID: <code>1184083915</code>) admin huquqiga ega.",
            parse_mode=ParseMode.HTML
        )
        return

    await message.answer(
        "👨‍🏫 <b>Xush kelibsiz, Bosh Administrator!</b>\n"
        "O'qituvchi boshqaruv paneli:",
        reply_markup=get_admin_dashboard_keyboard(),
        parse_mode=ParseMode.HTML
    )


@router.message(Command("logout"))
async def handle_logout_cmd(message: Message):
    user_id = message.from_user.id
    if is_admin(user_id):
        remove_admin(user_id)
        await message.answer("🚪 Admin rejimidan chiqdingiz. Qaytadan /start bosing.")
    else:
        await message.answer("Siz admin emassiz.")

# --- TALABANI BIRIKTIRISH (CLAIM) JARAYONI ---
@router.callback_query(F.data == "start_bind")
async def cb_start_bind(callback: CallbackQuery):
    user_id = callback.from_user.id
    if get_binding_by_telegram_id(user_id):
        await callback.answer("Siz allaqachon biriktirilgansiz!", show_alert=True)
        return

    groups = get_all_groups()
    if not groups:
        await callback.message.edit_text(
            "⚠️ Hozircha bazada guruhlar mavjud emas.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="🔄 Qayta tekshirish", callback_data="start_bind")]
            ])
        )
        await callback.answer()
        return

    kb = []
    row = []
    for g in groups:
        row.append(InlineKeyboardButton(text=f"👥 {g}", callback_data=f"bgroup:{g}:0"))
        if len(row) == 2:
            kb.append(row)
            row = []
    if row:
        kb.append(row)

    await callback.message.edit_text(
        "📋 <b>GURUHINGIZNI TANLANG:</b>\n"
        "Qaysi guruhda ta'lim olasiz?",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=kb),
        parse_mode=ParseMode.HTML
    )
    await callback.answer()

@router.callback_query(F.data.startswith("bgroup:"))
async def cb_bind_group(callback: CallbackQuery):
    parts = callback.data.split(":")
    group_name = parts[1]
    page = int(parts[2]) if len(parts) > 2 else 0

    students = get_students_by_group(group_name)
    if not students:
        await callback.message.edit_text(
            f"⚠️ <b>{group_name}</b>da talabalar ro'yxati topilmadi.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="⬅️ Guruhlarga qaytish", callback_data="start_bind")]
            ]),
            parse_mode=ParseMode.HTML
        )
        await callback.answer()
        return

    bound_ids = get_all_bound_student_ids()
    per_page = 8
    total_pages = (len(students) + per_page - 1) // per_page
    start_idx = page * per_page
    current_students = students[start_idx:start_idx + per_page]

    kb = []
    for s in current_students:
        s_id = s.get('id')
        name = s.get('fullName')
        if s_id in bound_ids:
            kb.append([InlineKeyboardButton(
                text=f"🔒 {name} (Band)",
                callback_data=f"bound_info:{s_id}"
            )])
        else:
            kb.append([InlineKeyboardButton(
                text=f"👤 {name}",
                callback_data=f"pre_bind:{s_id}"
            )])

    nav_row = []
    if page > 0:
        nav_row.append(InlineKeyboardButton(text="⬅️ Oldingi", callback_data=f"bgroup:{group_name}:{page - 1}"))
    if page < total_pages - 1:
        nav_row.append(InlineKeyboardButton(text="Keyingi ➡️", callback_data=f"bgroup:{group_name}:{page + 1}"))
    if nav_row:
        kb.append(nav_row)

    kb.append([InlineKeyboardButton(text="⬅️ Boshqa guruh", callback_data="start_bind")])

    await callback.message.edit_text(
        f"👥 <b>{group_name}</b> talabalari:\n"
        f"O'z ism-familiyangiz ustiga bosing:\n\n"
        f"<i>(🔒 belgisi bilan ko'rsatilgan talabalar allaqachon o'z hisoblarini ulagan)</i>",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=kb),
        parse_mode=ParseMode.HTML
    )
    await callback.answer()

@router.callback_query(F.data.startswith("bound_info:"))
async def cb_bound_info(callback: CallbackQuery):
    await callback.answer(
        "⚠️ Ushbu talaba allaqachon boshqa Telegram hisobiga biriktirilgan!\n"
        "Agar bu sizning ismingiz bo'lsa, adashib olingan bo'lishi mumkin. O'qituvchiga murojaat qiling.",
        show_alert=True
    )

@router.callback_query(F.data.startswith("pre_bind:"))
async def cb_pre_bind(callback: CallbackQuery):
    student_id = callback.data.split(":", 1)[1]
    student = get_student_by_id(student_id)
    if not student:
        await callback.answer("Talaba topilmadi!", show_alert=True)
        return

    if get_binding_by_student_id(student_id):
        await callback.answer("Kechirasiz, ushbu talaba boshqa birov tomonidan biriktirildi.", show_alert=True)
        return

    name = student.get('fullName')
    group = student.get('group')

    text = (
        f"❓ <b>BIRIKTIRISHNI TASDIQLANG:</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 <b>Talaba:</b> {name}\n"
        f"👥 <b>Guruh:</b> {group}\n\n"
        f"⚠️ <b>MUHIM XAVFSIZLIK QOIDASI:</b>\n"
        f"Ushbu profil sizning Telegram hisobingizga qat'iy biriktiriladi. "
        f"Shundan so'ng siz <b>faqat o'zingizning</b> baho va davomatingizni ko'ra olasiz. "
        f"Boshqa talabalar sizning baholaringizni ko'ra olmaydi.\n\n"
        f"Haqiqatan ham siz <b>{name}</b>misiz?"
    )

    kb = [
        [InlineKeyboardButton(text="✅ Ha, bu men (Biriktirish)", callback_data=f"confirm_bind:{student_id}")],
        [InlineKeyboardButton(text="❌ Yo'q, orqaga qaytish", callback_data=f"bgroup:{group}:0")]
    ]

    await callback.message.edit_text(text, reply_markup=InlineKeyboardMarkup(inline_keyboard=kb), parse_mode=ParseMode.HTML)
    await callback.answer()

@router.callback_query(F.data.startswith("confirm_bind:"))
async def cb_confirm_bind(callback: CallbackQuery):
    student_id = callback.data.split(":", 1)[1]
    user_id = callback.from_user.id
    username = callback.from_user.username or ''

    if get_binding_by_telegram_id(user_id):
        await callback.answer("Siz allaqachon biriktirilgansiz!", show_alert=True)
        return

    student = get_student_by_id(student_id)
    if not student:
        await callback.answer("Talaba topilmadi!", show_alert=True)
        return

    success = bind_student(
        telegram_id=user_id,
        student_id=student_id,
        telegram_username=username,
        full_name=student.get('fullName', ''),
        group_name=student.get('group', '')
    )

    if not success:
        await callback.answer("Xatolik: ushbu talaba allaqachon boshqa akkauntga biriktirilgan!", show_alert=True)
        return

    await callback.answer("🎉 Muvaffaqiyatli biriktirildi!", show_alert=False)

    report_text = build_student_report(student_id)
    congrats_text = (
        f"🎉 <b>Tabriklaymiz, {student.get('fullName')}!</b>\n"
        f"Sizning Telegram hisobingiz muvaffaqiyatli biriktirildi.\n\n"
        f"{report_text}"
    )

    await callback.message.edit_text(
        congrats_text,
        reply_markup=get_student_home_keyboard(),
        parse_mode=ParseMode.HTML
    )

# --- TALABANING SHAXSIY AMALLARI ---
@router.callback_query(F.data == "refresh_my_report")
async def cb_refresh_my_report(callback: CallbackQuery):
    user_id = callback.from_user.id
    binding = get_binding_by_telegram_id(user_id)
    if not binding:
        await callback.answer("Hisobingiz hali biriktirilmagan!", show_alert=True)
        return

    report_text = build_student_report(binding['student_id'])
    if not report_text:
        await callback.answer("Ma'lumot topilmadi.", show_alert=True)
        return

    try:
        await callback.message.edit_text(
            report_text,
            reply_markup=get_student_home_keyboard(),
            parse_mode=ParseMode.HTML
        )
        await callback.answer("✅ Natijalar jurnaldan qayta yangilandi!")
    except Exception:
        await callback.answer("Ma'lumotlar allaqachon eng so'nggi holatda.")

@router.callback_query(F.data == "my_profile")
async def cb_my_profile(callback: CallbackQuery):
    user_id = callback.from_user.id
    binding = get_binding_by_telegram_id(user_id)
    if not binding:
        await callback.answer("Hisobingiz biriktirilmagan.", show_alert=True)
        return

    created = binding['created_at'][:16].replace('T', ' ')
    text = (
        f"👤 <b>SHAXSIY PROFIL</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"• <b>F.I.SH:</b> {binding['full_name']}\n"
        f"• <b>Guruh:</b> {binding['group_name']}\n"
        f"• <b>Telegram ID:</b> <code>{binding['telegram_id']}</code>\n"
        f"• <b>Biriktirilgan sana:</b> {created}\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"🔒 <i>Siz faqat o'z baholaringizni ko'ra olasiz. "
        f"Agar ismingizni o'zgartirish kerak bo'lsa, o'qituvchiga murojaat qiling.</i>"
    )
    kb = [
        [InlineKeyboardButton(text="📊 Natijalarimni ko'rish", callback_data="refresh_my_report")]
    ]
    await callback.message.edit_text(text, reply_markup=InlineKeyboardMarkup(inline_keyboard=kb), parse_mode=ParseMode.HTML)
    await callback.answer()

@router.callback_query(F.data == "btn_about")
async def cb_about(callback: CallbackQuery):
    settings = get_store_item('settings', {})
    subject_name = settings.get('subjectName', 'Mutaxassislik fani (15 ta amaliy dars)')
    institution = settings.get('institutionName', "Ta'lim muassasasi")

    text = (
        f"ℹ️ <b>BOT HAQIDA</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"Ushbu bot <b>{institution}</b> talabalari uchun xizmat qiladi.\n"
        f"📚 <b>Fan:</b> {subject_name}\n"
        f"📌 Darslar formati: 15 ta amaliy mashg'ulot va mustaqil ishlar.\n\n"
        f"🔒 <b>Xavfsizlik kafolati:</b> Har bir talaba faqat o'zining baholarini ko'ra oladi.\n"
        f"Barcha baho va davomat ma'lumotlari markaziy elektron jurnal bilan 24/7 sinxronlangan."
    )
    user_id = callback.from_user.id
    if get_binding_by_telegram_id(user_id):
        kb = [[InlineKeyboardButton(text="📊 Mening natijalarim", callback_data="refresh_my_report")]]
    else:
        kb = [[InlineKeyboardButton(text="🔗 Hisobimni ulash", callback_data="start_bind")]]

    await callback.message.edit_text(text, reply_markup=InlineKeyboardMarkup(inline_keyboard=kb), parse_mode=ParseMode.HTML)
    await callback.answer()

async def prompt_admin_login(callback: CallbackQuery):
    WAITING_ADMIN_PASSWORD.add(callback.from_user.id)
    text = (
        "🔐 <b>O'QITUVCHI / ADMIN KIRISH</b>\n"
        "━━━━━━━━━━━━━━━━━━━━━\n"
        "Admin paneliga kirish uchun parolni kiriting:\n\n"
        "👉 Shunchaki <code>admin123</code> deb xabar yozib yuboring,\n"
        "yoki <code>/admin admin123</code> buyrug'ini bosing."
    )
    kb = [
        [InlineKeyboardButton(text="🏠 Bosh menyu", callback_data="btn_home")]
    ]
    try:
        await callback.message.edit_text(text, reply_markup=InlineKeyboardMarkup(inline_keyboard=kb), parse_mode=ParseMode.HTML)
    except Exception:
        pass
    try:
        await callback.answer("Admin parolini kiriting!", show_alert=True)
    except Exception:
        pass

@router.callback_query(F.data == "btn_admin_login")
async def cb_admin_login(callback: CallbackQuery):
    user_id = callback.from_user.id
    if int(user_id) != MASTER_ADMIN_TELEGRAM_ID:
        await callback.answer(
            "⛔️ Faqat bosh administrator (ID: 1184083915) ruxsatga ega!",
            show_alert=True
        )
        return
    await cb_admin_dashboard(callback)


@router.callback_query(F.data == "btn_home")
async def cb_home(callback: CallbackQuery):
    user_id = callback.from_user.id
    if is_admin(user_id):
        await cb_admin_dashboard(callback)
        return
    binding = get_binding_by_telegram_id(user_id)
    if binding:
        report_text = build_student_report(binding['student_id'])
        try:
            await callback.message.edit_text(
                report_text or "Ma'lumot topilmadi",
                reply_markup=get_student_home_keyboard(),
                parse_mode=ParseMode.HTML
            )
        except Exception:
            pass
    else:
        text = (
            f"Assalomu alaykum! 👋\n\n"
            f"<b>Elektron Jurnal</b> rasmiy botiga xush kelibsiz.\n\n"
            f"🔒 <b>SHAXSIY MA'LUMOTLAR XAVFSIZLIGI:</b>\n"
            f"Har bir talaba faqat o'zining baholarini ko'ra oladi.\n\n"
            f"O'z hisobingizni biriktirish uchun quyidagi tugmani bosing:"
        )
        try:
            await callback.message.edit_text(
                text,
                reply_markup=get_unbound_welcome_keyboard(),
                parse_mode=ParseMode.HTML
            )
        except Exception:
            pass
    try:
        await callback.answer()
    except Exception:
        pass

# --- O'QITUVCHI / ADMIN PANEL CALLBACKS ---
@router.callback_query(F.data == "admin_dashboard")
async def cb_admin_dashboard(callback: CallbackQuery):
    user_id = callback.from_user.id
    if not is_admin(user_id):
        await prompt_admin_login(callback)
        return

    try:
        await callback.message.edit_text(
            "👨‍🏫 <b>O'QITUVCHI / ADMIN BOSHQARUV PANELI</b>\n"
            "Kerakli bo'limni tanlang:",
            reply_markup=get_admin_dashboard_keyboard(),
            parse_mode=ParseMode.HTML
        )
    except Exception:
        pass
    try:
        await callback.answer()
    except Exception:
        pass

@router.callback_query(F.data == "admin_groups")
async def cb_admin_groups(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        await prompt_admin_login(callback)
        return

    groups = get_all_groups()
    kb = []
    for g in groups:
        kb.append([InlineKeyboardButton(text=f"👥 {g}", callback_data=f"agroup:{g}:0")])
    kb.append([InlineKeyboardButton(text="⬅️ Admin panel", callback_data="admin_dashboard")])

    try:
        await callback.message.edit_text(
            "👥 <b>Barcha guruhlar:</b>\nTalabalarni ko'rish uchun guruhni tanlang:",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=kb),
            parse_mode=ParseMode.HTML
        )
    except Exception:
        pass
    try:
        await callback.answer()
    except Exception:
        pass

@router.callback_query(F.data.startswith("agroup:"))
async def cb_admin_group_students(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        await prompt_admin_login(callback)
        return

    parts = callback.data.split(":")
    group_name = parts[1]
    page = int(parts[2]) if len(parts) > 2 else 0

    students = get_students_by_group(group_name)
    per_page = 8
    total_pages = (len(students) + per_page - 1) // per_page
    start_idx = page * per_page
    current_students = students[start_idx:start_idx + per_page]

    kb = []
    for s in current_students:
        s_id = s.get('id')
        name = s.get('fullName')
        kb.append([InlineKeyboardButton(text=f"👤 {name}", callback_data=f"astudent:{s_id}")])

    nav_row = []
    if page > 0:
        nav_row.append(InlineKeyboardButton(text="⬅️ Oldingi", callback_data=f"agroup:{group_name}:{page - 1}"))
    if page < total_pages - 1:
        nav_row.append(InlineKeyboardButton(text="Keyingi ➡️", callback_data=f"agroup:{group_name}:{page + 1}"))
    if nav_row:
        kb.append(nav_row)

    kb.append([InlineKeyboardButton(text="⬅️ Guruhlarga qaytish", callback_data="admin_groups")])

    try:
        await callback.message.edit_text(
            f"👥 <b>{group_name} talabalari:</b>",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=kb),
            parse_mode=ParseMode.HTML
        )
    except Exception:
        pass
    try:
        await callback.answer()
    except Exception:
        pass

@router.callback_query(F.data.startswith("astudent:"))
async def cb_admin_student(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        await prompt_admin_login(callback)
        return

    student_id = callback.data.split(":", 1)[1]
    report_text = build_student_report(student_id)
    student = get_student_by_id(student_id)
    group = student.get('group', '') if student else ''

    binding = get_binding_by_student_id(student_id)
    bind_status = f"\n\n🔗 <b>Telegram ulangan:</b> @{binding['telegram_username']} (ID: {binding['telegram_id']})" if binding else "\n\n🔓 <b>Telegram ulanmagan</b>"

    kb = []
    if binding:
        kb.append([InlineKeyboardButton(text="❌ Biriktirishni bekor qilish (Reset)", callback_data=f"aunbind:{student_id}")])
    kb.append([InlineKeyboardButton(text="⬅️ Guruhga qaytish", callback_data=f"agroup:{group}:0")])

    try:
        await callback.message.edit_text(
            (report_text or "Ma'lumot yo'q") + bind_status,
            reply_markup=InlineKeyboardMarkup(inline_keyboard=kb),
            parse_mode=ParseMode.HTML
        )
    except Exception:
        pass
    try:
        await callback.answer()
    except Exception:
        pass

@router.callback_query(F.data.startswith("aunbind:"))
async def cb_admin_unbind(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        await prompt_admin_login(callback)
        return

    student_id = callback.data.split(":", 1)[1]
    unbind_student(student_id)
    try:
        await callback.answer("✅ Talaba biriktirishdan ozod qilindi! U endi qayta ulashi mumkin.", show_alert=True)
    except Exception:
        pass
    await cb_admin_student(callback)

@router.callback_query(F.data == "admin_bindings")
async def cb_admin_bindings_list(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        await prompt_admin_login(callback)
        return

    bindings = get_all_bindings()
    if not bindings:
        try:
            await callback.message.edit_text(
                "Hozircha hech qaysi talaba Telegram hisobini biriktirmagan.",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text="⬅️ Admin panel", callback_data="admin_dashboard")]
                ])
            )
        except Exception:
            pass
        try:
            await callback.answer()
        except Exception:
            pass
        return

    text = f"📋 <b>BIRIKTIRILGAN TALABALAR ({len(bindings)} ta):</b>\n\n"
    for b in bindings:
        u = f"@{b['telegram_username']}" if b['telegram_username'] else f"ID:{b['telegram_id']}"
        text += f"• <b>{b['full_name']}</b> ({b['group_name']}) ➔ {u}\n"

    kb = [[InlineKeyboardButton(text="⬅️ Admin panel", callback_data="admin_dashboard")]]
    try:
        await callback.message.edit_text(text, reply_markup=InlineKeyboardMarkup(inline_keyboard=kb), parse_mode=ParseMode.HTML)
    except Exception:
        pass
    try:
        await callback.answer()
    except Exception:
        pass

@router.callback_query(F.data == "admin_logout")
async def cb_admin_logout(callback: CallbackQuery):
    user_id = callback.from_user.id
    remove_admin(user_id)
    try:
        await callback.message.edit_text(
            "🚪 Admin rejimidan chiqdingiz.\nQaytadan kirish uchun: /admin",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="🔑 Qayta kirish", callback_data="btn_admin_login")],
                [InlineKeyboardButton(text="🏠 Bosh menyu", callback_data="btn_home")]
            ])
        )
    except Exception:
        pass
    try:
        await callback.answer()
    except Exception:
        pass

# --- MATNLI XABARLAR HANDLERI ---
@router.message(F.text)
async def handle_text(message: Message):
    user_id = message.from_user.id
    text_val = message.text.strip()

    # Bosh Admin bo'lsa (ID: 1184083915)
    if is_admin(user_id):
        await message.answer("👨‍🏫 <b>Bosh Admin boshqaruv paneli:</b>", reply_markup=get_admin_dashboard_keyboard(), parse_mode=ParseMode.HTML)
        return

    # Begona foydalanuvchi admin parolini yozishga urinsa
    if verify_admin_password(text_val):
        await message.answer("⛔️ Kechirasiz, bu botda faqat yagona bosh administrator (ID: 1184083915) ruxsatga ega.")
        return


    # Talaba biriktirilgan bo'lsa
    binding = get_binding_by_telegram_id(user_id)
    if binding:
        await message.answer(
            f"Siz <b>{binding['full_name']}</b> ({binding['group_name']}) sifatida tizimga ulangansiz.\n"
            f"🔒 Xavfsizlik yuzasidan faqat o'zingizning baholaringizni ko'ra olasiz.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="📊 Mening natijalarim", callback_data="refresh_my_report")],
                [InlineKeyboardButton(text="🔑 O'qituvchi (Admin)", callback_data="btn_admin_login")]
            ]),
            parse_mode=ParseMode.HTML
        )
        return

    # Yangi biriktirilmagan foydalanuvchi bo'lsa
    await message.answer(
        "👋 Natijalaringizni ko'rish uchun avval o'z hisobingizni biriktiring:",
        reply_markup=get_unbound_welcome_keyboard()
    )

# ==============================================================================
# MAIN RUNNER
# ==============================================================================
async def main():
    token = load_bot_token()
    if not token:
        print("\n [DIQQAT] TELEGRAM BOT TOKENI TOPILMADI!\n")
        return

    init_bot_db()
    bot = Bot(token=token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()
    dp.include_router(router)

    me = await bot.get_me()
    print("\n" + "=" * 65)
    print(f"  [OK] TELEGRAM BOT ISHGA TUSHDI: @{me.username}")
    print(f"  Xavfsizlik: Talaba faqat o'z baholarini ko'radi (Shaxsiy rejim)")
    print(f"  Markaziy baza: {DB_FILE}")
    print("=" * 65 + "\n")

    try:
        await dp.start_polling(bot)
    finally:
        await bot.session.close()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        print("Bot to'xtatildi.")
