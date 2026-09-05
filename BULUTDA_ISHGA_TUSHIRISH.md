# 🌐 Loyihani 24/7 Bulutda (Cloud) Ishga Tushirish Qo'llanmasi

Kompyuteringiz o'chgan holatda ham **Sayt** va **Telegram Bot** uzluksiz (24/7) ishlashi uchun uni bepul yoki arzon bulutli serverga (Cloud) joylashtirish lozim.

Loyiha uchun barcha kerakli fayllar (`run.py`, `Procfile`, `render.yaml`, `requirements.txt`) to'liq tayyorlangan va GitHub repozitoriyangizga yuklangan:
👉 **GitHub:** `https://github.com/OmatilloQayumjonov/omatillo-jurnal.git`

---

## 🚀 1-USUL: Render.com orqali Bepul 24/7 Ishga Tushirish (Eng oson)

Render.com — GitHub repozitoriyangizdagi dasturlarni avtomatik o'rnatib, 24/7 internetda bepul yurgizib beradigan xizmat.

### Bosqichlar:
1. **Saytga kiring:** [https://render.com](https://render.com) ga kiring va **"Get Started for Free"** tugmasini bosing.
2. **GitHub orqali kiring:** Ro'yxatdan o'tishda o'zingizning GitHub hisobingiz (`OmatilloQayumjonov`) orqali kiring.
3. **Yangi xizmat qo'shish:**
   - Asosiy paneldan **"New +"** tugmasini bosing;
   - **"Web Service"** ni tanlang;
   - **"Build and deploy from a Git repository"** ni tanlab, ro'yxatdan `omatillo-jurnal` repozitoriyasini toping va **"Connect"** tugmasini bosing.
4. **Sozlamalar (avtomatik to'ldiriladi):**
   - **Name:** `omatillo-jurnal`
   - **Region:** Frankfurt yoki Singapore
   - **Branch:** `main`
   - **Language:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python run.py`
   - **Instance Type:** `Free` (bepul)
5. **Muhit o'zgaruvchisi (Environment Variables):**
   - Pastroqdagi "Environment Variables" bo'limiga:
     - `Key`: `BOT_TOKEN`
     - `Value`: `8619177051:AAEuxtkHtGdkeF-25elZeYUZPlVcyYutWfQ`
6. **"Create Web Service"** tugmasini bosing!

✅ **Natija:**
Render loyihangizni bir necha daqiqada ishga tushiradi. Sizga bepul veb-manzil beradi (masalan: `https://omatillo-jurnal.onrender.com`).
Kompyuteringizni butunlay o'chirib qo'ysangiz ham:
- Sayt internetda ochiq turadi;
- Telegram bot (@TalabaInfo_bot) 24/7 talabalarning savollariga javob berib, baholarni ko'rsatib turadi!

---

## 🏢 2-USUL: aHOST.uz yoki VPS Serverda Ishga Tushirish

Agar siz O'zbekiston ichidagi VPS (masalan aHOST.uz) orqali yurgizmoqchi bo'lsangiz:

1. VPS serveringizga (Ubuntu/Debian) SSH orqali kiring:
   ```bash
   ssh root@SERVER_IP
   ```
2. Loyihani yuklab oling:
   ```bash
   git clone https://github.com/OmatilloQayumjonov/omatillo-jurnal.git
   cd omatillo-jurnal
   ```
3. Python va kutubxonalarni o'rnating:
   ```bash
   sudo apt update && sudo apt install python3-pip python3-venv -y
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
4. Doimiy 24/7 xizmat (systemd service) yaratish:
   ```bash
   sudo nano /etc/systemd/system/jurnal.service
   ```
   Quyidagilarni yozing:
   ```ini
   [Unit]
   Description=Elektron Jurnal va Telegram Bot 24/7
   After=network.target

   [Service]
   User=root
   WorkingDirectory=/root/omatillo-jurnal
   ExecStart=/root/omatillo-jurnal/venv/bin/python run.py
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```
5. Xizmatni yoqib qo'ying:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable jurnal
   sudo systemctl start jurnal
   ```

✅ Shundan so'ng server qayta yonsa ham dastur avtomatik tarzda 24/7 ishlab turadi!
