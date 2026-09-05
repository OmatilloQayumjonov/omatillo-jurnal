"""
TALABALAR ELEKTRON JURNALI - TELEGRAM BOT (aiogram 3)
Talabalar uchun davomat, 15 ta amaliy dars va mustaqil ish baholarini ko'rish boti
Markaziy SQLite bazasi (jurnal.db) bilan real vaqt rejimida bog'langan.
"""

import os
import sys
import json
import sqlite3
import asyncio
import logging

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
from typing import Optional, Dict, Any, List

from aiogram import Bot, Dispatcher, Router, F
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.filters import CommandStart, Command
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties

# Logger sozlash
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Baza joylashuvi
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, 'jurnal.db')
ENV_FILE = os.path.join(BASE_DIR, '.env')

def load_bot_token() -> str:
    """Tokenni .env yoki muhit o'zgaruvchilaridan yuklash"""
    token = os.environ.get('BOT_TOKEN', '').strip()
    if not token and os.path.exists(ENV_FILE):
        with open(ENV_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('BOT_TOKEN='):
                    token = line.split('=', 1)[1].strip().strip('"').strip("'")
    if not token:
        token = "8619177051:AAEuxtkHtGdkeF-25elZeYUZPlVcyYutWfQ"
    return token

# ==============================================================================
# BAZA BILAN ISHLASH (SQLITE QUERIES)
# ==============================================================================
def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

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
        # Agar groups ro'yxati bo'sh bo'lsa, talabalardan ajratib olamiz
        students = get_store_item('students', [])
        groups = sorted(list(set(s.get('group') for s in students if s.get('group'))))
    return groups

def get_students_by_group(group_name: str) -> List[Dict[str, Any]]:
    students = get_store_item('students', [])
    filtered = [s for s in students if s.get('group') == group_name]
    return sorted(filtered, key=lambda x: x.get('fullName', ''))

def find_students_by_name(query: str) -> List[Dict[str, Any]]:
    query = query.lower().strip()
    students = get_store_item('students', [])
    return [s for s in students if query in s.get('fullName', '').lower()]

def get_student_by_id(student_id: str) -> Optional[Dict[str, Any]]:
    students = get_store_item('students', [])
    for s in students:
        if s.get('id') == student_id:
            return s
    return None

def build_student_report(student_id: str) -> Optional[str]:
    """Talabaning to'liq hisobot kartasini chiroyli matn sifatida tayyorlash"""
    student = get_student_by_id(student_id)
    if not student:
        return None

    full_name = student.get('fullName', 'Noma\'lum')
    group = student.get('group', 'Noma\'lum')
    
    settings = get_store_item('settings', {})
    subject_name = settings.get('subjectName', 'Mutaxassislik fani (15 ta amaliy dars)')
    institution = settings.get('institutionName', "Ta'lim muassasasi")

    # 1. DAVOMAT HISOB-KITOBI
    attendance_data = get_store_item('attendance', [])
    # Faqat talabaning guruhiga tegishli darslar
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

    missed_total_hours = absent_hours + excused_hours
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

    # 4. UMUMIY REYTING / O'RTASHA BALL
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

    # XABAR MATNINI SHAKLLANTIRISH
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
        f"<i>Barcha ma'lumotlar elektron jurnaldan jonli olindi.</i>"
    )

    return text

# ==============================================================================
# TELEGRAM BOT ROUTER VA TUGMALAR
# ==============================================================================
router = Router()

def get_main_keyboard() -> InlineKeyboardMarkup:
    kb = [
        [InlineKeyboardButton(text="📊 Natijalarimni ko'rish", callback_data="btn_groups")],
        [InlineKeyboardButton(text="🔍 F.I.SH bo'yicha qidirish", callback_data="btn_search_hint")],
        [InlineKeyboardButton(text="ℹ️ Bot haqida", callback_data="btn_about")]
    ]
    return InlineKeyboardMarkup(inline_keyboard=kb)

def get_groups_keyboard() -> InlineKeyboardMarkup:
    groups = get_all_groups()
    kb = []
    # 2 tadan qatorda
    row = []
    for g in groups:
        row.append(InlineKeyboardButton(text=f"👥 {g}", callback_data=f"group:{g}"))
        if len(row) == 2:
            kb.append(row)
            row = []
    if row:
        kb.append(row)

    kb.append([InlineKeyboardButton(text="⬅️ Bosh menyuga qaytish", callback_data="btn_home")])
    return InlineKeyboardMarkup(inline_keyboard=kb)

def get_students_keyboard(group_name: str, page: int = 0) -> InlineKeyboardMarkup:
    students = get_students_by_group(group_name)
    per_page = 8
    total_pages = (len(students) + per_page - 1) // per_page if students else 1
    
    start_idx = page * per_page
    end_idx = start_idx + per_page
    current_students = students[start_idx:end_idx]

    kb = []
    for s in current_students:
        kb.append([InlineKeyboardButton(
            text=f"👤 {s.get('fullName')}",
            callback_data=f"student:{s.get('id')}"
        )])

    # Navigatsiya tugmalari (Oldingi / Keyingi sahifa)
    nav_row = []
    if page > 0:
        nav_row.append(InlineKeyboardButton(text="⬅️ Oldingi", callback_data=f"page:{group_name}:{page - 1}"))
    if page < total_pages - 1:
        nav_row.append(InlineKeyboardButton(text="Keyingi ➡️", callback_data=f"page:{group_name}:{page + 1}"))

    if nav_row:
        kb.append(nav_row)

    kb.append([
        InlineKeyboardButton(text="👥 Boshqa guruh", callback_data="btn_groups"),
        InlineKeyboardButton(text="🏠 Bosh menyu", callback_data="btn_home")
    ])
    return InlineKeyboardMarkup(inline_keyboard=kb)

def get_report_keyboard(student_id: str, group_name: str) -> InlineKeyboardMarkup:
    kb = [
        [InlineKeyboardButton(text="🔄 Yangilash (So'nggi baholar)", callback_data=f"refresh:{student_id}")],
        [InlineKeyboardButton(text="👥 Guruh ro'yxatiga qaytish", callback_data=f"group:{group_name}")],
        [InlineKeyboardButton(text="🏠 Bosh menyu", callback_data="btn_home")]
    ]
    return InlineKeyboardMarkup(inline_keyboard=kb)

# --- HANDLERS ---
@router.message(CommandStart())
async def handle_start(message: Message):
    welcome_text = (
        f"Assalomu alaykum, <b>{message.from_user.first_name}</b>! 👋\n\n"
        f"<b>Elektron Jurnal</b> tizimining rasmiy botiga xush kelibsiz.\n\n"
        f"Bu yerda siz o'zingizning:\n"
        f"• 📅 <b>Davomat</b> (qoldirilgan soatlar va davomat foizi)\n"
        f"• 📝 <b>15 ta amaliy dars</b> bo'yicha olgan baholaringiz\n"
        f"• 📖 <b>Mustaqil ish</b> ballari\n"
        f"• 🏆 <b>Umumiy o'rtacha ballingiz (GPA)</b>ni\n"
        f"istalgan vaqtda bilib olishingiz mumkin!\n\n"
        f"O'z ma'lumotlaringizni ko'rish uchun quyidagi tugmani bosing:"
    )
    await message.answer(welcome_text, reply_markup=get_main_keyboard(), parse_mode=ParseMode.HTML)

@router.callback_query(F.data == "btn_home")
async def cb_home(callback: CallbackQuery):
    await callback.message.edit_text(
        "Boshqaruv menyusi. O'zingizga kerakli bo'limni tanlang:",
        reply_markup=get_main_keyboard()
    )
    await callback.answer()

@router.callback_query(F.data == "btn_groups")
async def cb_groups(callback: CallbackQuery):
    groups = get_all_groups()
    if not groups:
        await callback.message.edit_text(
            "⚠️ Hozircha tizimda guruhlar mavjud emas.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="🏠 Bosh menyu", callback_data="btn_home")]
            ])
        )
        await callback.answer()
        return

    await callback.message.edit_text(
        "📋 <b>Guruhni tanlang:</b>\nQaysi guruhda ta'lim olasiz?",
        reply_markup=get_groups_keyboard(),
        parse_mode=ParseMode.HTML
    )
    await callback.answer()

@router.callback_query(F.data.startswith("group:"))
async def cb_select_group(callback: CallbackQuery):
    group_name = callback.data.split(":", 1)[1]
    students = get_students_by_group(group_name)

    if not students:
        await callback.message.edit_text(
            f"⚠️ <b>{group_name}</b>da hali talabalar ro'yxati shakllantirilmagan.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="👥 Boshqa guruh", callback_data="btn_groups")]
            ]),
            parse_mode=ParseMode.HTML
        )
        await callback.answer()
        return

    await callback.message.edit_text(
        f"👥 <b>{group_name}</b> talabalari:\nO'z ism-familiyangiz ustiga bosing:",
        reply_markup=get_students_keyboard(group_name, page=0),
        parse_mode=ParseMode.HTML
    )
    await callback.answer()

@router.callback_query(F.data.startswith("page:"))
async def cb_paginate_students(callback: CallbackQuery):
    parts = callback.data.split(":")
    group_name = parts[1]
    page = int(parts[2])

    await callback.message.edit_text(
        f"👥 <b>{group_name}</b> talabalari:\nO'z ism-familiyangiz ustiga bosing:",
        reply_markup=get_students_keyboard(group_name, page=page),
        parse_mode=ParseMode.HTML
    )
    await callback.answer()

@router.callback_query(F.data.startswith("student:"))
async def cb_show_student(callback: CallbackQuery):
    student_id = callback.data.split(":", 1)[1]
    report_text = build_student_report(student_id)

    if not report_text:
        await callback.answer("Talaba ma'lumoti topilmadi!", show_alert=True)
        return

    student = get_student_by_id(student_id)
    group_name = student.get('group', '') if student else ''

    await callback.message.edit_text(
        report_text,
        reply_markup=get_report_keyboard(student_id, group_name),
        parse_mode=ParseMode.HTML
    )
    await callback.answer()

@router.callback_query(F.data.startswith("refresh:"))
async def cb_refresh_report(callback: CallbackQuery):
    student_id = callback.data.split(":", 1)[1]
    report_text = build_student_report(student_id)

    if not report_text:
        await callback.answer("Ma'lumot topilmadi!", show_alert=True)
        return

    student = get_student_by_id(student_id)
    group_name = student.get('group', '') if student else ''

    try:
        await callback.message.edit_text(
            report_text,
            reply_markup=get_report_keyboard(student_id, group_name),
            parse_mode=ParseMode.HTML
        )
        await callback.answer("✅ Natijalar jurnaldan qayta yangilandi!")
    except Exception:
        await callback.answer("Ma'lumotlar allaqachon eng so'nggi holatda.")

@router.callback_query(F.data == "btn_search_hint")
async def cb_search_hint(callback: CallbackQuery):
    text = (
        "🔍 <b>Ism bo'yicha qidirish juda oson!</b>\n\n"
        "Shunchaki botga o'z ismingiz yoki familiyangizni xabar qilib yozib yuboring.\n"
        "<i>Masalan:</i> <code>Aliyev</code> yoki <code>Madina</code>\n\n"
        "Bot darhol sizni topib natijalarni chiqaradi!"
    )
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="👥 Guruhlar orqali tanlash", callback_data="btn_groups")],
        [InlineKeyboardButton(text="🏠 Bosh menyu", callback_data="btn_home")]
    ])
    await callback.message.edit_text(text, reply_markup=kb, parse_mode=ParseMode.HTML)
    await callback.answer()

@router.callback_query(F.data == "btn_about")
async def cb_about(callback: CallbackQuery):
    settings = get_store_item('settings', {})
    subject_name = settings.get('subjectName', '15 ta amaliy dars')
    institution = settings.get('institutionName', "Ta'lim muassasasi")

    text = (
        f"ℹ️ <b>BOT HAQIDA</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"Ushbu bot <b>{institution}</b> talabalari uchun yaratilgan.\n"
        f"📚 <b>Fan:</b> {subject_name}\n"
        f"📌 Darslar formati: 15 ta amaliy dars va mustaqil ishlar.\n\n"
        f"Barcha baholar va dars davomati to'g'ridan-to'g'ri o'qituvchining "
        f"markaziy elektron jurnali bilan real vaqtda sinxronlangan."
    )
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📊 Natijalarni ko'rish", callback_data="btn_groups")],
        [InlineKeyboardButton(text="🏠 Bosh menyu", callback_data="btn_home")]
    ])
    await callback.message.edit_text(text, reply_markup=kb, parse_mode=ParseMode.HTML)
    await callback.answer()

# --- TEXT SEARCH HANDLER ---
@router.message(F.text)
async def handle_text_search(message: Message):
    query = message.text.strip()
    if len(query) < 2:
        await message.answer("Iltimos, kamida 2 ta harf yozing.")
        return

    matches = find_students_by_name(query)
    if not matches:
        await message.answer(
            f"❌ <b>\"{query}\"</b> bo'yicha talaba topilmadi.\n"
            f"Ism yoki familiyangizni to'g'ri yozganingizga ishonch hosil qiling, "
            f"yoki guruhlar orqali qidiring:",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="👥 Guruhlar ro'yxati", callback_data="btn_groups")]
            ]),
            parse_mode=ParseMode.HTML
        )
        return

    if len(matches) == 1:
        # Bitta talaba topilsa, darhol uning kartasini ko'rsatamiz
        st = matches[0]
        report_text = build_student_report(st.get('id'))
        await message.answer(
            report_text,
            reply_markup=get_report_keyboard(st.get('id'), st.get('group', '')),
            parse_mode=ParseMode.HTML
        )
    else:
        # Bir nechta talaba topilsa, tugma qilib tanlashni taklif qilamiz
        kb = []
        for s in matches[:10]:
            kb.append([InlineKeyboardButton(
                text=f"👤 {s.get('fullName')} ({s.get('group')})",
                callback_data=f"student:{s.get('id')}"
            )])
        kb.append([InlineKeyboardButton(text="🏠 Bosh menyu", callback_data="btn_home")])

        await message.answer(
            f"🔍 <b>Topilgan talabalar:</b>\nO'z ismingiz ustiga bosing:",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=kb),
            parse_mode=ParseMode.HTML
        )

# ==============================================================================
# ASOSIY ISHGA TUSHIRISH (RUNNER)
# ==============================================================================
async def main():
    token = load_bot_token()
    if not token:
        print("\n" + "=" * 65)
        print(" [DIQQAT] TELEGRAM BOT TOKENI TOPILMADI!")
        print(" Iltimos, Telegramdagi @BotFather orqali yangi bot oching va")
        print(" olingan tokenni .env fayliga BOT_TOKEN=... qilib yozing.")
        print("=" * 65 + "\n")
        return

    bot = Bot(token=token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()
    dp.include_router(router)

    me = await bot.get_me()
    print("\n" + "=" * 65)
    print(f"  [OK] TELEGRAM BOT ISHGA TUSHDI: @{me.username}")
    print(f"  Markaziy baza: {DB_FILE}")
    print(f"  Talabalar dars qoldirganlari va baholari jonli ulandi!")
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
