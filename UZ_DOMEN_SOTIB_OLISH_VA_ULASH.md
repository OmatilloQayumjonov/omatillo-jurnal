# 🌐 .UZ Domenini Sotib Olish va Saytga Ulash — To'liq Qo'llanma

Ushbu qo'llanmada O'zbekistonning rasmiy **`.uz`** domenini 0 dan boshlab ro'yxatdan o'tkazish, Click/Payme orqali to'lash va uni elektron jurnalingizga ulash bo'yicha barcha qadamlar keltirilgan.

---

## 💰 Narx va Talablar

* **Domen narxi:** Yiliga ~**25 000 - 33 000 so'm** (bir marta to'lanadi, 1 yil davomida sizniki bo'ladi).
* **Kerakli narsalar:**
  1. Telefon raqamingiz (SMS tasdiqlash uchun).
  2. Pasportingizdagi **JSHSHIR (14 xonali PINFL)** — O'zbekiston qonunchiligiga ko'ra barcha `.uz` domenlar fuqaroning shaxsiga rasmiy biriktiriladi.
  3. **Click** yoki **Payme** (kartada 30 000 so'm atrofida mablag').

---

## 1-BOSQICH: Domen Ro'yxatdan O'tkazuvchini Tanlash

O'zbekistonda eng qulay, arzon va avtomatlashgan registrator — **Eskiz.uz** (yoki Cpanel.uz):
* Rasmiy sayt: **[https://eskiz.uz](https://eskiz.uz)**

---

## 2-BOSQICH: Domen Nomini Tanlash va Tekshirish

1. Brauzeringizda **[eskiz.uz](https://eskiz.uz)** saytini oching.
2. Qidiruv qatoriga o'zingizga yoqqan nomni yozing va **"Tekshirish"** tugmasini bosing:
   * *Misollar:*
     - `pedagog-jurnal.uz`
     - `elektron-baholar.uz`
     - `oqituvchi-kundalik.uz`
     - yoki o'z familiyangiz: `ismoilov-jurnal.uz`
3. Agar nom bo'sh bo'lsa, **"Bo'sh / Свободен"** degan yashil yozuv va narxi (masalan: *25 000 so'm*) chiqadi.
4. **"Savatga qo'shish"** (В корзину) tugmasini bosing.

---

## 3-BOSQICH: Shaxsiy Kabinet Ochish va Ro'yxatdan O'tish

1. Eskiz.uz da **"Ro'yxatdan o'tish"** (Регистрация) tugmasini bosing.
2. Quyidagi ma'lumotlarni to'ldiring:
   * **Ism, Familiya, Sharifingiz** (pasport bo'yicha).
   * **Telefon raqamingiz** (SMS orqali kod keladi).
   * **Jismoniy shaxs** tanlanadi.
   * **JSHSHIR (14 xonali PINFL)** — pasportingizning eng pastki qismidagi 14 ta raqam.
3. Yangi parol o'ylab topib, ro'yxatdan o'tishni yakunlang.

---

## 4-BOSQICH: To'lovni Amalga Oshirish

1. Savatga (Корзина) kiring.
2. Tanlangan `.uz` domenni tasdiqlang.
3. To'lov usullaridan **Click** yoki **Payme** ni tanlang.
4. Telefoningizdagi Click/Payme ilovasi orqali to'lovni tasdiqlang.
5. **Natija:** To'lov muvaffaqiyatli amalga oshgach, 5-15 daqiqa ichida domen faollashadi va sizning nomingizga rasmiylashtiriladi!

---

## 5-BOSQICH: Domenni Saytga Qanday Ulaymiz?

Domen sotib olganingizdan so'ng, uning boshqaruv panelida **DNS (DNS Records)** bo'limi bo'ladi.
Saytingiz 24 soat davomida butun dunyoga uzluksiz ishlab turishi uchun:

### Tavsiya etiladigan eng yaxshi yo'l:
1. Saytingizni **Render.com** (bepul bulutli server) ga joylaymiz.
2. Render.com sizga maxsus manzil beradi (masalan: `jurnal-xyz.onrender.com`).
3. Eskiz.uz dagi shaxsiy kabinetingizga kirib, quyidagi 2 ta DNS yozuvini kiritasiz:
   * **Type:** `CNAME` | **Name:** `@` (yoki `bo'sh`) | **Value:** `jurnal-xyz.onrender.com`
   * **Type:** `CNAME` | **Name:** `www` | **Value:** `jurnal-xyz.onrender.com`
4. **Tayyor!** Shundan so'ng sizning yangi `.uz` domeningiz (masalan: `http://pedagog-jurnal.uz`) to'g'ridan-to'g'ri ushbu elektron jurnalingizni ochadi!

---

## 💡 Nima Qilishingiz Kerak?

Hozir siz qilishingiz kerak bo'lgan yagona ish:
1. **[Eskiz.uz](https://eskiz.uz)** ga kiring.
2. O'zingiz xohlagan nomdagi `.uz` domenni tanlab, Click orqali sotib oling (~25-30 ming so'm).
3. Sotib olganingizdan keyin menga: **"Domenimning nomi: falonchi.uz"** deb yozing.
4. Men sizga uni saytga to'liq bog'lashda oxirigacha o'zim birga yordam berib, ulab beraman!
