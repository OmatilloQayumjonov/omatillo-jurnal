# 🌐 Saytni Ommaviy Internetga Joylash va ".uz" Domenini Ulash Qo'llanmasi

Ushbu qo'llanma orqali saytingizni internetga chiqarib, xohlagan qurilmadan (kompyuter, telefon, planshet) istalgan joyda (hatto mobil internet 4G/5G orqali) kirishni va unga rasmiy **`.uz`** domenini ulashni o'rganasiz.

---

## 1-USUL: Uy yoki Ishxona Wi-Fi orqali Telefonda Darhol Ishlatish (Bepul va 0 daqiqa)

Agar kompyuteringiz va telefoningiz bitta Wi-Fi ga ulangan bo'lsa:
1. Kompyuteringizda **`Serverni_boshlash.bat`** faylini bosing.
2. Qora oynada telefoningiz uchun maxsus manzil ko'rinadi (masalan: `http://192.168.0.116:5000`).
3. Telefoningizda Chrome yoki Safari brauzerini ochib, ushbu manzilni yozing:
   👉 **`http://192.168.0.116:5000`**
4. Admin parolini tering (`admin` / `admin123`).
5. **Natija:** Barcha ma'lumotlar kompyuter bilan jonli sinxron ishlaydi! Kompyuterda o'zgartirsangiz telefonda, telefonda davomat olsangiz kompyuterda darhol saqlanadi.

---

## 2-USUL: Butun Dunyo Bo'ylab Internetga Chiqarish (4G/5G da kirish) — BEPUL

Agar siz maktabda, uyda, yo'lda yoki mashinada bo'lganingizda ham telefoningizdan saytga kirishni xohlasangiz, saytni bepul bulutli xostingga (masalan **Render.com** yoki **Railway.app**) joylash mumkin:

### Render.com orqali 3 daqiqada bepul joylash:
1. **GitHub** (github.com) ga kiring va bepul ro'yxatdan o'ting.
2. Yangi repository oching (masalan: `jurnal-sayt`) va ushbu papkadagi barcha fayllarni yuklang (`server.py`, `requirements.txt`, `Procfile`, `index.html`, `js/`, `css/`, `lib/`).
3. **Render.com** saytiga kiring va GitHub orqali ro'yxatdan o'ting (bepul).
4. **"New +" -> "Web Service"** tugmasini bosing.
5. GitHub'dagi `jurnal-sayt` loyihangizni tanlang.
6. Sozlamalar:
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn server:app`
7. **"Create Web Service"** tugmasini bosing.
8. 2 daqiqada sizga doimiy ishlovchi bepul HTTPS manzil beriladi (masalan: **`https://jurnal-sayt.onrender.com`**).
9. Ushbu manzil orqali istalgan odam, istalgan telefon va kompyuterdan kirishi mumkin!

---

## 3-USUL: Shaxsiy ".uz" Domenini Ulash (Masalan: `jurnalim.uz`)

Saytingizni nufuzli, rasmiy va chiroyli qilish uchun shaxsiy `.uz` domenini ulash mumkin:

### 1-qadam: Domen sotib olish
1. O'zbekiston domen registratorlaridan biriga kiring:
   - **Eskiz.uz** yoki **Cpanel.uz** yoki **Reg.uz** yoki **Arsenal-d.uz**.
2. O'zingizga yoqqan nomni qidiring (masalan: `jurnalim.uz`, `oqituvchi-baholar.uz`, `talabalar-jurnali.uz`).
3. Domen narxi yiliga atigi ~25 000 - 35 000 so'm atrofida bo'ladi. Click yoki Payme orqali to'lang.

### 2-qadam: Domenni Render.com saytingizga ulash
1. Render.com dagi loyihangizga kiring -> **"Settings"** -> **"Custom Domains"** bo'limiga o'ting.
2. **"Add Custom Domain"** tugmasini bosib, sotib olgan domeningizni kiriting (masalan: `jurnalim.uz` va `www.jurnalim.uz`).
3. Render sizga **DNS CNAME** yoki **A record** yozuvini beradi.
4. Eskiz.uz / Cpanel.uz dagi shaxsiy kabinetingizga kirib, **DNS boshqaruvi (DNS Records)** bo'limiga Render bergan manzilni nusxalab qo'ying.
5. **Tayyor!** 10-15 daqiqa ichida saytingiz rasmiy **`https://jurnalim.uz`** manzilida to'liq ishga tushadi!

---

## 🔒 Xavfsizlik va Admin Paroli

- Boshlang'ich Admin login: **`admin`**
- Boshlang'ich Admin parol: **`admin123`**
- Parolni sayt ichidagi **"Sozlamalar"** bo'limiga kirib, o'zingiz biladigan maxfiy parolga almashtiring!
- Faqat parolni bilgan odamgina talabalar davomati va baholarini o'zgartira oladi.
