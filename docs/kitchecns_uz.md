TEXNIK TOPSHIRIQ (TZ)

Kitchens.uz
Multi-Kompaniya SaaS Platformasi
Oshxona, Kafe va Restoran uchun Universal Boshqaruv Tizimi

Platformalar: Web + Telegram Mini App
Backend: Laravel 11+ (PHP 8.2+) | Frontend: React + TypeScript + shadcn/ui
Arxitektura: Multi-Tenant SaaS
Versiya: 1.6 | Sana: 2026-yil, aprel

O'ZGARISHLAR JURNALI (v1.0 → v1.6)

| # | O'zgarish | Soha |
|---|-----------|------|
| 1 | Menejer tasdiqsiz — buyurtma to'g'ridan oshxonaga | Buyurtma |
| 2 | Menejer faqat bekor qilish (sabab majburiy) | Buyurtma |
| 3 | Chegirma qo'llash (foiz yoki summa) | Buyurtma |
| 4 | Split bill — bir stolga bir nechta chek | Buyurtma |
| 5 | Qarzdorlik (nasiya) olib tashlandi | To'lov |
| 6 | Xizmat haqi restoran belgilaydi | To'lov |
| 7 | Kurier faqat Telegram orqali | Rollar |
| 8 | Kurier: mashina, guvohnoma, telefon majburiy | Kurier |
| 9 | Doimiy kurierlar ro'yxatga qo'shish | Kurier |
| 10 | Taksi orqali yetkazish (qo'lda kiritish) | Yetkazish |
| 11 | Taksi xarajatini kim to'laydi — sozlamada | Yetkazish |
| 12 | Kurier/taksi — menejer tanlaydi | Yetkazish |
| 13 | Retsept tizimi olib tashlandi (oddiy kirim-chiqim) | Ombor |
| 14 | Taomlar porsiya VA kg asosida, min miqdor, avto-narx | Menyu |
| 15 | Multi-kompaniya SaaS: branding, subdomen, Super Admin | Arxitektura |
| 16 | Tarif tizimi: Free / Pro / Premium (oylik obuna) | Biznes model |
| 17 | Taom modifikatorlari (piyozsiz, kam tuzli, achchiq) | Menyu |
| 18 | Taom qo'shimchalari — pullik (sous, limon, pishloq) | Menyu |
| 19 | Combo / Set menyu (biznes lanch) | Menyu |
| 20 | Qaytarish (Refund) tizimi | To'lov |
| 21 | Kassa ochish/yopish (smena boshqaruvi) | To'lov |
| 22 | Sodiqlik dasturi (Loyalty ball to'plash) | Mijoz |
| 23 | Offline rejim (internetsiz ishlash) | Infra |
| 24 | Stol ko'chirish va birlashtirish | Stol |
| 25 | Filiallar arasi ombor transfer | Ombor |
| 26 | Oshxona printer (KDS + printer) | Oshxona |
| 27 | Qayta buyurtma tugmasi (takrorlash) | Buyurtma |
| 28 | Oshpaz buyurtmani qabul qilishi majburiy EMAS | Oshxona |
| 29 | Bekor qilish vaqt chegarasi — admin sozlamada belgilaydi | Buyurtma |
| 30 | Xavfsizlik talablari bo'limi qo'shildi | Xavfsizlik |
| 31 | Non-functional talablar qo'shildi | Infra |
| 32 | Barcha API endpointlar to'liq yozildi | API |
| 33 | Bildirishnoma tizimi batafsil yozildi | Bildirishnoma |
| 34 | Promo-kod tizimi batafsil yozildi | Marketing |
| 35 | Mijoz identifikatsiyasi global qilindi | Arxitektura |
| 36 | JSON maydonlar alohida jadvallarga ajratildi | DB |
| 37 | Stol bron (reservations) jadvali va API qo'shildi | Stol |
| 38 | Qisman qaytarish uchun refund_items jadvali | To'lov |
| 39 | Aralash to'lov (mixed) tafsiloti va payments jadvali kengaytirildi | To'lov |
| 40 | Yetkazish holatlari state machine qo'shildi | Yetkazish |
| 41 | Xodim-filial bog'lanishi (branch_id) qo'shildi | Xodimlar |
| 42 | DGI soliq integratsiya tafsilotlari va fiscal_receipts jadvali | Soliq |
| 43 | Ombor o'lchov birliklari standartlashtirildi | Ombor |
| 44 | settings_json tarkibi batafsil yozildi | Sozlamalar |
| 45 | Stol jadvaliga assigned_waiter_id va merged_with_table_id qo'shildi | Stol |

MAXFIY HUJJAT — Ruxsatsiz tarqatish taqiqlanadi

---

MUNDARIJA

1. LOYIHA HAQIDA UMUMIY MA'LUMOT
2. FUNKTSIONAL TALABLAR
3. MA'LUMOTLAR BAZASI
4. API ARXITEKTURASI
5. XAVFSIZLIK TALABLARI
6. NON-FUNCTIONAL TALABLAR
7. RIVOJLANTIRISH BOSQICHLARI

---

# 1. LOYIHA HAQIDA UMUMIY MA'LUMOT

## 1.1. Loyiha nomi va maqsadi

Loyiha nomi: **Kitchens.uz — Multi-Kompaniya SaaS Platformasi**

Loyihaning asosiy maqsadi — bir nechta restoran, kafe va oshxona kompaniyalarini yagona platforma orqali boshqarish. Har bir kompaniya o'z branding (logo, rang, nom) bilan ishlaydi, ma'lumotlar to'liq ajratilgan.

## 1.2. Multi-Tenant SaaS arxitekturasi

⚠ [v1.6 YANGI] Kitchens.uz endi multi-kompaniya (multi-tenant) SaaS platformasi sifatida quriladi.

### 1.2.1. Platforma tuzilishi

Ierarxiya quyidagicha:

```
Kitchens.uz Platform (Super Admin boshqaradi)
├── Kompaniya 1 (o'z admin, branding, subdomen)
│   ├── Filial 1, Filial 2...
│   └── Xodimlar, Menyu, Ombor, Buyurtmalar...
├── Kompaniya 2 (o'z admin, branding, subdomen)
│   └── Filial 1...
└── Kompaniya N...
```

### 1.2.2. Kompaniya (Company) ma'lumotlari

| Maydon | Turi | Majburiy | Izoh |
|--------|------|----------|------|
| id | BIGINT | Ha | Avtomatik ID |
| name | VARCHAR(255) | Ha | Kompaniya nomi (masalan: "Oq Saroy") |
| slug | VARCHAR(100) | Ha | Subdomen uchun (masalan: oq-saroy), UNIQUE |
| logo | VARCHAR | Yo'q | Logotip URL (default: Kitchens.uz logotipi) |
| primary_color | VARCHAR(7) | Yo'q | Asosiy rang HEX (default: #F59E0B) |
| phone | VARCHAR | Ha | Aloqa telefon |
| email | VARCHAR | Yo'q | Kompaniya email |
| address | TEXT | Yo'q | Yuridik manzil |
| inn | VARCHAR(20) | Yo'q | Soliq raqami |
| subdomain_enabled | BOOLEAN | Ha | Subdomen faolmi (default: true) |
| is_active | BOOLEAN | Ha | Kompaniya faolmi |
| settings_json | JSON | Yo'q | Tarkibi quyida |
| created_at | TIMESTAMP | Ha | Yaratilgan sana |

**`settings_json` tarkibi:**

```json
{
  "service_charge_pct": 10,
  "max_discount_pct": 20,
  "cancel_time_limit_minutes": 60,
  "delivery_fee": 15000,
  "delivery_fee_paid_by": "customer",
  "loyalty_enabled": true,
  "loyalty_points_per_1000": 1,
  "loyalty_min_redeem": 5000,
  "loyalty_conversion_rate": 1,
  "default_language": "uz",
  "currency": "UZS",
  "timezone": "Asia/Tashkent",
  "printer_auto_print": true,
  "telegram_bot_token": "encrypted:...",
  "click_merchant_id": "encrypted:...",
  "click_service_id": "encrypted:...",
  "payme_merchant_id": "encrypted:...",
  "dgi_inn": "123456789",
  "dgi_ofd_key": "encrypted:..."
}
```

### 1.2.3. Subdomen tizimi

⚠ [v1.6 YANGI] Har bir kompaniya o'z subdomenida ishlashi mumkin:

- Format: `{kompaniya-slug}.kitchens.uz`
- Misol: `oq-saroy.kitchens.uz`, `milliy-taom.kitchens.uz`
- Admin subdomen yoqish/o'chirishni tanlaydi
- Subdomen o'chirilsa: asosiy domen orqali login paytida kompaniya tanlanadi
- Telegram Mini App da: kompaniya bot orqali aniqlanadi (har bir kompaniyaning o'z boti)
- Subdomen wildcard SSL sertifikati orqali himoyalanadi (`*.kitchens.uz`)

### 1.2.4. Dinamik branding tizimi

⚠ [v1.6 YANGI] Har bir kompaniya o'z ko'rinishiga ega:

- Kompaniya yaratilganda: logo, asosiy rang (primary_color), nom kiritiladi
- Kiritilmasa — default qiymatlar ishlatiladi:
  - Default logo: Kitchens.uz logotipi
  - Default rang: #F59E0B (Amber)
  - Default nom: "Kitchens.uz"
- Asosiy rangdan qolgan ranglar avtomatik hisoblanadi:
  - `primary-light`: asosiy rangning 10% opacity versiyasi
  - `primary-dark`: asosiy rangning qoraytirilgan versiyasi
  - `primary-hover`: hover holati uchun
- Barcha UI elementlarda CSS custom properties ishlatiladi:
  - `--color-primary`, `--color-primary-light`, `--color-primary-dark`
  - Logo: sidebar, login sahifa, chek, Telegram Mini App da ko'rsatiladi
  - Kompaniya nomi: header, chek, hisobotlarda ko'rsatiladi

### 1.2.5. Ma'lumotlar ajratilishi (Data Isolation)

- Barcha tenant-specific jadvallar `company_id` maydoni orqali ajratiladi
- Har bir so'rov avtomatik `company_id` filtrlanadi (Laravel Global Scope)
- Kompaniya A hech qachon Kompaniya B ma'lumotlarini ko'ra olmaydi
- Super Admin barcha kompaniyalar ma'lumotlarini ko'ra oladi
- **Child jadvallar qoidasi**: `orders`, `payments`, `order_items` kabi child jadvallar parent orqali `company_id` ga ega. Lekin tezkor so'rovlar uchun tez-tez so'raladigan child jadvallar (`payments`, `order_checks`) ga ham denormalizatsiya sifatida `company_id` qo'shiladi.

## 1.3. Foydalanuvchi rollari

| Rol | Daraja | Platforma | Vazifalari |
|-----|--------|-----------|------------|
| super_admin | Platforma | Web | Kompaniyalar yaratish, barcha kompaniyalarni boshqarish, platforma sozlamalari |
| company_admin | Kompaniya | Web | O'z kompaniyasi: xodimlar, menyu, ombor, moliya, filiallar, branding |
| manager | Kompaniya | Web | Buyurtma BEKOR qilish, ofitsiantlar nazorati, kurier/taksi tanlash |
| waiter | Kompaniya | Web (mobil) | Buyurtma yaratish, stol tanlash, chegirma, split bill |
| chef | Kompaniya | Web (KDS) | Buyurtma ko'rish, tayyor belgilash |
| cashier | Kompaniya | Web | To'lov qabul, chek, kun yopish |
| courier | Kompaniya | Telegram | Yetkazish buyurtmalari, status yangilash |
| customer | Global | Telegram | Menyu, buyurtma, to'lov, kuzatish |

⚠ [v1.6 YANGI] `super_admin` — yangi rol. Platformani boshqaradi. `company_admin` — avvalgi admin rolining yangi nomi.

## 1.4. Platformalar

### 1.4.1. Web platforma

- Super Admin panel: kompaniyalar CRUD, platforma statistikasi
- Kompaniya Admin panel: o'z kompaniyasi boshqaruvi (branding bilan)
- Ofitsiant, Oshxona, Kassir interfeyslari (kompaniya branding bilan)
- Responsiv dizayn: desktop, planshet, telefon
- Real-time: Laravel Echo + Reverb (WebSocket)

### 1.4.2. Telegram Mini App

- Har bir kompaniyaning o'z Telegram boti
- Mijoz menyuni ko'rish, buyurtma berish (kompaniya branding bilan)
- Kurier interfeysi (Telegram ichida)
- To'lov: Click, Payme

## 1.5. Texnologiyalar steki

| Qatlam | Texnologiya | Izoh |
|--------|-------------|------|
| Backend | Laravel 11+ (PHP 8.2+) | Multi-tenant arxitektura |
| Ma'lumotlar bazasi | PostgreSQL 16+ | company_id bilan ajratish |
| Kesh | Redis 7+ | Sessiya, navbat, cache |
| Frontend | React 18+ + TypeScript + Vite | SPA arxitektura |
| UI | shadcn/ui + Tailwind CSS | Dinamik branding (CSS variables) |
| Real-time | Laravel Echo + Reverb | WebSocket |
| Telegram | React + TG SDK + nutgram | Mini App + Bot |
| To'lov | Click / Payme | O'zbekiston uchun |
| Fayl saqlash | S3 / MinIO | Kompaniya logolari, taom rasmlari |
| CI/CD | GitHub Actions + Docker | Avtomatik deploy |
| Autentifikatsiya | Laravel Sanctum | Token-based, SPA cookies |
| Monitoring | Laravel Telescope + Sentry | Xatoliklarni kuzatish |

---

# 2. FUNKTSIONAL TALABLAR

## 2.1. Super Admin moduli

⚠ [v1.6 YANGI] Super Admin — platformaning eng yuqori darajali boshqaruvchisi.

### 2.1.1. Kompaniya boshqaruvi

- Yangi kompaniya yaratish (nom, slug, logo, rang, telefon)
- Kompaniya ma'lumotlarini tahrirlash
- Kompaniyani faollashtirish / bloklash
- Kompaniya statistikasi: buyurtmalar, tushum, xodimlar soni
- Kompaniya adminini tayinlash

### 2.1.2. Platforma dashboard

- Barcha kompaniyalar umumiy statistikasi
- Eng faol kompaniyalar reytingi
- Platforma darajasidagi hisobotlar
- Tizim holati monitoring

### 2.1.3. Super Admin API endpointlar

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/super/companies | Barcha kompaniyalar ro'yxati |
| POST | /api/v1/super/companies | Yangi kompaniya yaratish |
| PUT | /api/v1/super/companies/{id} | Kompaniya tahrirlash |
| PATCH | /api/v1/super/companies/{id}/toggle | Faol/nofaol qilish |
| GET | /api/v1/super/dashboard | Platforma statistikasi |
| GET | /api/v1/super/companies/{id}/stats | Kompaniya statistikasi |
| POST | /api/v1/super/companies/{id}/admin | Admin tayinlash |
| GET | /api/v1/super/plans | Tarif rejalari ro'yxati |
| POST | /api/v1/super/plans | Yangi tarif yaratish |
| PUT | /api/v1/super/plans/{id} | Tarif tahrirlash |
| POST | /api/v1/super/companies/{id}/subscription | Kompaniyaga tarif tayinlash (qo'lda) |
| GET | /api/v1/super/subscriptions | Barcha obunalar ro'yxati |
| GET | /api/v1/super/subscription-payments | To'lov tarixi |

## 2.2. Tarif tizimi (PRICING)

⚠ [v1.6 YANGI] Kompaniyalar uchun oylik obuna tarif tizimi.

### 2.2.1. Tarif rejalari

| | Free | Pro | Premium |
|---|------|-----|---------|
| Oylik narx | 0 so'm | 500 000 so'm | 1 500 000 so'm |
| Filiallar soni | 1 ta | 5 tagacha | Cheksiz |
| Xodimlar soni | 5 ta | 20 tagacha | Cheksiz |
| Hisobotlar | Faqat kunlik | To'liq (kunlik, haftalik, oylik, P&L) | To'liq + kengaytirilgan analitika |
| Ombor moduli | Yo'q | Ha | Ha |
| Branding (logo, rang) | Yo'q (default) | Yo'q (default) | Ha (to'liq sozlash) |
| Subdomen | Yo'q | Yo'q | Ha (kompaniya.kitchens.uz) |
| Telegram Bot | Ha (asosiy) | Ha (to'liq) | Ha (to'liq) |
| Yetkazish moduli | Ha | Ha | Ha |
| Qo'llab-quvvatlash | Email | Email + Telegram | 24/7 shaxsiy menejer |

### 2.2.2. Tarif tayinlash

- Super Admin qo'lda: kompaniya yaratishda yoki keyinroq tarif belgilaydi
- Onlayn to'lov: Kompaniya admin o'zi tarif tanlaydi va Click/Payme orqali to'laydi
- Yangi kompaniya default: Free tarif
- Tarif o'zgarishi: keyingi to'lov davridan boshlab kuchga kiradi
- Tarif pasayishi: ortiqcha filial/xodimlar bloklanadi (o'chirilmaydi)

### 2.2.3. Cheklovlar nazorati

- Filiallar: limitga yetganda yangi filial qo'shib bo'lmaydi (xatolik xabari)
- Xodimlar: limitga yetganda yangi xodim qo'shib bo'lmaydi
- Ombor: Free tarifda ombor moduli ko'rinmaydi (UI da yashiriladi)
- Hisobotlar: Free da faqat kunlik tushum ko'rinadi, haftalik/oylik bloklanadi
- Branding: Premium dan pastda branding sozlamalari ko'rinmaydi
- Subdomen: Premium dan pastda subdomen sozlanmaydi
- Har bir cheklovda "Tarifni yangilang" tugmasi ko'rsatiladi

### 2.2.4. Obuna davri va to'lov

- Obuna davri: 1 oy (30 kun)
- To'lov usullari: Click, Payme
- Avtomatik eslatma: obuna tugashiga 7 kun va 1 kun qolganda
- Obuna tugasa: kompaniya Free tarifga tushadi (ma'lumotlar saqlanadi)
- To'lov tarixini ko'rish: kompaniya admin va super admin
- Chek/faktura: har bir to'lov uchun elektron faktura

### 2.2.5. Sinov muddati (Trial)

- Yangi kompaniya: 14 kunlik Pro tarif sinov muddati
- Sinov tugaganda: Free ga avtomatik o'tadi
- Sinov bir marta beriladi (qayta faollashtirilmaydi)

### 2.2.6. Tarif (Plan) ma'lumotlari

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| name | VARCHAR | Tarif nomi: free, pro, premium |
| display_name | VARCHAR | Ko'rsatish nomi: Free, Pro, Premium |
| price_monthly | DECIMAL(12,2) | Oylik narx (so'mda) |
| max_branches | INT | Maks filiallar (0 = cheksiz) |
| max_staff | INT | Maks xodimlar (0 = cheksiz) |
| has_inventory | BOOLEAN | Ombor moduli bormi |
| has_full_reports | BOOLEAN | To'liq hisobotlar bormi |
| has_branding | BOOLEAN | Branding sozlash mumkinmi |
| has_subdomain | BOOLEAN | Subdomen mumkinmi |
| is_active | BOOLEAN | Tarif faolmi |

### 2.2.7. Obuna (Subscription) ma'lumotlari

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| company_id | FK | Kompaniya |
| plan_id | FK | Tarif rejasi |
| status | ENUM | active, trial, expired, cancelled |
| trial_ends_at | TIMESTAMP | Sinov muddati tugash sanasi |
| current_period_start | TIMESTAMP | Joriy davr boshi |
| current_period_end | TIMESTAMP | Joriy davr oxiri |
| cancelled_at | TIMESTAMP | Bekor qilingan sana (null agar faol) |

### 2.2.8. To'lov tarixi (Subscription Payment)

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| subscription_id | FK | Obuna |
| amount | DECIMAL(12,2) | To'lov summasi |
| method | ENUM | click, payme |
| transaction_id | VARCHAR | Tranzaksiya ID |
| status | ENUM | pending, paid, failed |
| invoice_url | VARCHAR | Elektron faktura URL |
| paid_at | TIMESTAMP | To'langan sana |

## 2.3. Autentifikatsiya (AUTH)

### 2.3.1. Web login jarayoni

1. Foydalanuvchi login sahifasiga kiradi
2. Subdomen orqali: kompaniya avtomatik aniqlanadi
3. Asosiy domen orqali: avval kompaniyani tanlaydi (ro'yxatdan)
4. Email + parol kiritadi
5. Tizim kompaniya branding bilan ochiladi (logo, rang)
6. Super Admin: asosiy domendan kiradi, kompaniya tanlamasdan

### 2.3.2. Telegram autentifikatsiya

- Har bir kompaniyaning o'z boti orqali
- Telegram InitData avtomatik autentifikatsiya
- Mijoz birinchi kirishda telefon kiritadi

### 2.3.3. Parol tiklash jarayoni

1. Foydalanuvchi "Parolni unutdim" tugmasini bosadi
2. Email manzilini kiritadi
3. Tizim email ga 6 raqamli tasdiqlash kodi yuboradi (15 daqiqa amal qiladi)
4. Foydalanuvchi kodni kiritadi
5. Yangi parol o'rnatadi (parol talablari: kamida 8 belgi, 1 katta harf, 1 raqam)
6. Barcha mavjud sessiyalar bekor qilinadi (force logout)
7. Kuniga maksimum 5 ta parol tiklash so'rovi (brute force himoyasi)

### 2.3.4. Xodim qo'shish jarayoni

1. Company Admin "Yangi xodim" tugmasini bosadi
2. Xodim ma'lumotlarini kiritadi: ism, email, telefon, rol
3. Tizim xodimga email orqali taklif yuboradi (link 48 soat amal qiladi)
4. Xodim link orqali kirib, parolini o'rnatadi
5. Agar xodim emailni olmasa — admin qayta yuborishi yoki parolni qo'lda belgilashi mumkin
6. Kurier roli: Telegram ID majburiy, web panel kirish yo'q

## 2.4. Buyurtma boshqaruvi (ORDERS)

### 2.4.1. Buyurtma turlari

| Turi | Kod | Izoh |
|------|-----|------|
| Restoranda | dine_in | Stol buyurtmasi |
| Olib ketish | takeaway | Mijoz o'zi olib ketadi |
| Yetkazish | delivery | Kurier/taksi orqali |

### 2.4.2. Buyurtma holatlari

⚠ [v1.6 YANGI] Menejer tasdiqsiz. Buyurtma to'g'ridan oshxonaga tushadi.

| Holat | Kod | Kim o'zgartiradi | Izoh |
|-------|-----|------------------|------|
| Tayyorlanmoqda | preparing | Tizim (avtomatik) | Darhol oshxonaga tushadi |
| Tayyor | ready | Oshpaz | Taom tayyor, signal yuboriladi |
| Berildi | served | Ofitsiant | Mijozga berildi |
| To'langan | paid | Kassir | To'lov amalga oshdi |
| Yopilgan | closed | Tizim | Buyurtma yakunlandi |
| Bekor qilingan | cancelled | Menejer/Admin | Sabab MAJBURIY |
| Yetkazilmoqda | delivering | Kurier | Yo'lda |
| Yetkazildi | delivered | Kurier | Topshirildi |

**Holat o'tish qoidalari (State Machine):**

```
[dine_in]:  preparing → ready → served → paid → closed
[takeaway]: preparing → ready → paid → closed
[delivery]: preparing → ready → delivering → delivered → paid → closed
[har qanday holat] → cancelled (faqat ruxsat etilgan vaqt ichida)
```

### 2.4.3. Bekor qilish qoidalari

- Faqat Menejer va Admin bekor qila oladi
- ⚠ [YANGI] Vaqt chegarasi: buyurtma tushganidan N daqiqa/soat ichida bekor qilish mumkin
- ⚠ [YANGI] N qiymatini Admin sozlamalarda belgilaydi (masalan: 30 daq, 1 soat, 2 soat)
- ⚠ [YANGI] Vaqt o'tgandan keyin bekor qilib BO'LMAYDI — tugma nofaol bo'ladi
- ⚠ [YANGI] Sozlamalar > "Bekor qilish muddati (daqiqa)" maydoni
- Sabab MAJBURIY kiritiladi
- Audit log ga yoziladi
- Agar buyurtma uchun to'lov amalga oshgan bo'lsa — avval refund jarayoni ishga tushadi

### 2.4.4. Chegirma tizimi

⚠ [v1.6 YANGI] Chegirma turi: foizli (%) yoki qat'iy summa (so'm).

- Ofitsiant va menejer chegirma qo'llashi mumkin
- Max chegirma chegarasi admin belgilaydi (masalan, max 20%)
- Promo-kod orqali ham chegirma mumkin (2.14-bo'limga qarang)
- Chek va hisobotlarda alohida ko'rsatiladi
- Chegirma xizmat haqidan OLDIN hisoblanadi (ya'ni: summa - chegirma = bazis, bazis × xizmat haqi %)
- Bir buyurtmaga faqat bitta chegirma turi qo'llanadi (foiz YOKI summa, ikkalasi emas)

### 2.4.5. Split Bill

⚠ [v1.6 YANGI] Bir stolda bir nechta alohida chek yaratish imkoniyati.

- Ofitsiant taomlarni cheklar o'rtasida taqsimlaydi
- Har bir chek alohida to'lanadi
- Teng bo'lish varianti ham bor
- Xizmat haqi har bir chekka proporsional taqsimlanadi (chek summasi / jami × xizmat haqi)
- Split bill yaratilgandan keyin yangi taom qo'shilsa — default chekka tushadi

### 2.4.6. Qayta buyurtma (Reorder)

⚠ [v1.6 YANGI] Doimiy mijoz avvalgi buyurtmasini bir tugma bilan takrorlash.

- Telegram Mini App da: "Buyurtmalarim" bo'limida har bir buyurtma yonida "Takrorlash" tugmasi
- Tugma bosilganda: avvalgi buyurtmadagi barcha taomlar savatchaga qo'shiladi
- Agar biror taom hozir mavjud emas bo'lsa: ogohlantirish chiqadi, boshqa taomlar qoladi
- Agar narx o'zgargan bo'lsa: yangi narx bilan ko'rsatiladi
- Ofitsiant ham stolda doimiy mijozning avvalgi buyurtmasini ko'ra oladi
- Sevimli taomlar: mijoz sevimli taomlar ro'yxatiga qo'sha oladi (yurak tugmasi)

## 2.5. Menyu boshqaruvi (MENU)

### 2.5.1. Sotish turi: Porsiya va Kg

⚠ [v1.6 YANGI] Har bir taom porsiyada YOKI kg/gramm asosida sotilishi mumkin.

| Maydon | Turi | Izoh |
|--------|------|------|
| sell_type | ENUM: portion, weight | Sotish turi |
| price | DECIMAL(12,2) | Narx: porsiya = 1 dona narxi, weight = 1 kg narxi |
| min_weight | DECIMAL(6,3) | Kg uchun minimal buyurtma miqdori (masalan: 0.3 kg) |
| weight_step | DECIMAL(6,3) | Kg uchun qadam (masalan: 0.1 kg). Default: 0.1 |

### 2.5.2. Porsiya asosida sotish

- Sotish turi: `portion`
- Narx: 1 porsiya uchun (masalan: 35 000 so'm)
- Buyurtmada: 1, 2, 3... porsiya tanlash
- Hisob: miqdor × narx
- Misol: Osh — 2 porsiya × 35 000 = 70 000 so'm

### 2.5.3. Kg asosida sotish

⚠ [v1.6 YANGI]:

- Sotish turi: `weight`
- Narx: 1 kg uchun ko'rsatiladi (masalan: 180 000 so'm/kg)
- Minimal buyurtma: `min_weight` maydonida (masalan: 0.3 kg)
- Qadam: `weight_step` maydonida (masalan: 0.1 kg)
- Hisob: kg × narx (avtomatik hisoblash)
- Interfeys: 1 kg narxi + hisoblangan narx ko'rsatiladi
- Misol: Shashlik — 0.5 kg × 180 000 = 90 000 so'm
- Menyuda ko'rsatilishi: "Shashlik — 180 000 so'm/kg"

### 2.5.4. Ofitsiant interfeysi (porsiya vs kg)

- Porsiya taom: +/− tugmalari bilan miqdor tanlash (1, 2, 3...)
- Kg taom: raqam kiritish maydoni (0.3, 0.5, 0.7, 1.0...)
- Kg taom uchun `min_weight` dan kam bo'lsa xatolik chiqadi
- Savatchada: porsiya = "2 porsiya", kg = "0.5 kg"
- Jami narx avtomatik hisoblanadi

### 2.5.5. Telegram Mini App (porsiya vs kg)

- Porsiya taom: +/− tugmalari
- Kg taom: slider yoki raqam kiritish (min dan boshlanadi)
- Narx real-time yangilanadi: "0.5 kg = 90 000 so'm"

### 2.5.6. Taom (MenuItem) to'liq ma'lumotlari

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| company_id | FK | Qaysi kompaniyaga tegishli |
| category_id | FK | Kategoriya |
| name_uz | VARCHAR(255) | O'zbekcha nom |
| name_ru | VARCHAR(255) | Ruscha nom |
| description_uz | TEXT | O'zbekcha tavsif |
| description_ru | TEXT | Ruscha tavsif |
| sell_type | ENUM(portion, weight) | Sotish turi: porsiya yoki kg |
| price | DECIMAL(12,2) | Narx (porsiya = 1 dona, kg = 1 kg) |
| min_weight | DECIMAL(6,3) | Kg uchun min miqdor (default: 0.3) |
| weight_step | DECIMAL(6,3) | Kg uchun qadam (default: 0.1) |
| image | VARCHAR | Rasm URL |
| cooking_time | INT | Tayyorlanish vaqti (daqiqa) |
| is_available | BOOLEAN | Hozir bor/yo'q |
| is_popular | BOOLEAN | Mashhur taom |
| sort_order | INT | Tartib |
| allergens | JSON | Allergenlar |

### 2.5.7. Taom modifikatorlari

⚠ [v1.6 YANGI] Taom tayyorlash usulini o'zgartirish (BEPUL). Narxga ta'sir qilmaydi.

- Misollar: "Piyozsiz", "Kam tuzli", "Achchiq qilish", "Yaxshi pishgan"
- Admin modifikatorlar ro'yxatini yaratadi (kompaniya darajasida)
- Har bir taomga tegishli modifikatorlar biriktiriladi
- Ofitsiant buyurtma paytida modifikator tanlaydi
- Oshxona displeyida modifikatorlar aniq ko'rsatiladi (rangli belgi)
- Chekda ham ko'rsatiladi

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| company_id | FK | Kompaniya |
| name_uz | VARCHAR(100) | O'zbekcha nom (Piyozsiz, Kam tuzli) |
| name_ru | VARCHAR(100) | Ruscha nom |
| is_active | BOOLEAN | Faolmi |

### 2.5.8. Taom qo'shimchalari (Add-ons)

⚠ [v1.6 YANGI] Qo'shimcha ingredientlar — PULLIK. Buyurtma narxiga qo'shiladi.

- Misollar: "Sous +3 000", "Limon +2 000", "Qo'shimcha pishloq +5 000", "Qaymog' +4 000"
- Admin qo'shimchalar ro'yxatini yaratadi (nom + narx)
- Har bir taomga tegishli qo'shimchalar biriktiriladi
- Ofitsiant buyurtma paytida qo'shimcha tanlaydi
- Narx avtomatik buyurtmaga qo'shiladi
- Chekda alohida qator: "+ Sous: 3 000 so'm"
- Telegram Mini App da ham tanlash mumkin

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| company_id | FK | Kompaniya |
| name_uz | VARCHAR(100) | O'zbekcha nom (Sous, Limon, Pishloq) |
| name_ru | VARCHAR(100) | Ruscha nom |
| price | DECIMAL(12,2) | Qo'shimcha narxi (so'mda) |
| is_active | BOOLEAN | Faolmi |

Buyurtma tarkibida:

| Jadval | Izoh |
|--------|------|
| order_item_modifiers | order_item_id, modifier_id — bepul modifikatorlar |
| order_item_addons | order_item_id, addon_id, price — pullik qo'shimchalar |

### 2.5.9. Combo / Set menyu

⚠ [v1.6 YANGI] Bir nechta taomni to'plam sifatida arzonroq narxda sotish.

- Misol: "Biznes lanch" = Osh + Achichuk + Choy = 40 000 so'm (alohida: 55 000)
- Admin combo yaratadi: nom, tarkib (taomlar ro'yxati), combo narx
- Combo narxi alohida taomlar yig'indisidan past bo'lishi kerak
- Vaqt chegarasi: faqat 11:00–15:00 (tushlik combo) kabi
- **Kun chegarasi**: haftaning qaysi kunlari mavjud (masalan: faqat Dush–Jum)
- Menyuda alohida "Combo" kategoriyasi
- Ofitsiant va Telegram da combo tanlash mumkin
- Chekda: combo nomi + tarkibi ko'rsatiladi
- Agar combo tarkibidagi taom `is_available=false` bo'lsa — combo ham ko'rinmaydi

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| company_id | FK | Kompaniya |
| name_uz | VARCHAR | O'zbekcha nom |
| name_ru | VARCHAR | Ruscha nom |
| price | DECIMAL(12,2) | Combo narxi (chegirmali) |
| available_from | TIME | Boshlanish vaqti (null = doim) |
| available_until | TIME | Tugash vaqti (null = doim) |
| available_days | JSON | Haftaning kunlari: [1,2,3,4,5] = Dush-Jum. null = har kuni |
| is_active | BOOLEAN | Faolmi |

**Combo tarkibi — alohida jadval** (`combo_items`):

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| combo_id | FK | Combo |
| menu_item_id | FK | Taom (referensial butunlik) |
| quantity | INT | Miqdor |

## 2.6. Stol boshqaruvi (TABLES)

- Stol ma'lumotlari: raqam, sig'im, zona, holat, QR-kod, ofitsiant
- Holatlari: `free`, `occupied`, `reserved`, `cleaning`, `merged`
- Bron: mijoz nomi, telefon, sana/vaqt, 15 daqiqa kutish
- QR-kod: Telegram Mini App ochiladi, stol avtomatik belgilanadi

### 2.6.1. Stol bron (Reservation)

- Ofitsiant yoki menejer stolni bron qiladi
- Bron ma'lumotlari: mijoz nomi, telefon, sana, vaqt, mehmonlar soni, izoh
- Bron vaqtidan 15 daqiqa oldin: stol holati `reserved` ga o'tadi
- Mijoz 15 daqiqa ichida kelmasa: bron avtomatik bekor qilinadi, stol `free` ga qaytadi
- Telegram orqali bron qilish: mijoz botga yozadi (kelajakda)
- Bron qilingan stolga boshqa buyurtma yaratib bo'lmaydi

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| company_id | FK | Kompaniya |
| branch_id | FK | Filial |
| table_id | FK | Stol |
| customer_name | VARCHAR(255) | Mijoz nomi |
| customer_phone | VARCHAR(20) | Telefon |
| guest_count | INT | Mehmonlar soni |
| reserved_at | TIMESTAMP | Bron sanasi va vaqti |
| note | TEXT | Izoh (ixtiyoriy) |
| status | ENUM | pending / confirmed / cancelled / completed |
| created_by | FK | Kim yaratgan (xodim) |
| created_at | TIMESTAMP | Yaratilgan sana |

### 2.6.2. QR kod formati va ishlash tartibi

- QR kod URL formati: `https://{kompaniya-slug}.kitchens.uz/tg/table/{table_id}?token={hmac_token}`
- `hmac_token` — stol ID va company_id asosida generatsiya qilinadi (o'zgartirishdan himoya)
- Subdomen o'chirilgan kompaniyalar uchun: `https://kitchens.uz/tg/{company_slug}/table/{table_id}?token={hmac_token}`
- QR skanerlanganda:
  1. Telegram Mini App ochiladi (deep link orqali)
  2. Kompaniya avtomatik aniqlanadi (subdomen yoki slug orqali)
  3. Stol avtomatik belgilanadi
  4. Mijoz menyuni ko'radi va buyurtma beradi
- QR kodlar admin paneldan yuklab olinadi (PDF formatda, A4 da 4 ta)

### 2.6.3. Stol ko'chirish (Transfer)

⚠ [v1.6 YANGI] Mehmonlar boshqa stolga o'tganda buyurtma ham ko'chadi.

- Ofitsiant yoki menejer stolni tanlaydi va "Ko'chirish" bosadi
- Maqsad stol `free` holatda bo'lishi kerak
- Barcha faol buyurtmalar yangi stolga ko'chadi
- Avvalgi stol avtomatik `free` holatiga o'tadi
- Audit log da yoziladi: qaysi stoldan qaysi stolga, kim ko'chirgan, vaqt

### 2.6.4. Stollarni birlashtirish (Merge)

⚠ [v1.6 YANGI] 2 ta stolni birlashtirish (katta guruh kelganda).

- Menejer 2 ta stolni tanlaydi va "Birlashtirish" bosadi
- Barcha buyurtmalar bitta stolga birlashadi
- Ikkinchi stol `merged` holatiga o'tadi (boshqa buyurtma qabul qilmaydi)
- Chek yig'ilganda ikkala stol raqami ko'rsatiladi
- Ajratish ham mumkin (menejer) — ikkinchi stol `free` holatga qaytadi

## 2.7. Oshxona displey — KDS (KITCHEN)

⚠ [v1.6 YANGI] Buyurtma menejer tasdiqisiz DARHOL oshxonada paydo bo'ladi.
⚠ [v1.6 YANGI] Oshpaz buyurtmani QABUL QILISHI majburiy emas. Buyurtma tushadi — oshpaz shunchaki tayyorlaydi va "Tayyor" tugmasini bosadi.

- Real-time yangilanadigan buyurtmalar ro'yxati
- Kg taomlar uchun miqdor ko'rsatiladi: "Shashlik — 0.5 kg"
- Rangli kodlash: yashil (yangi, < 5 daq), sariq (tayyorlanmoqda, 5-15 daq), qizil (kechikkan, > 15 daq)
- Ovoz signali: yangi buyurtma kelganda
- Modifikatorlar KATTA harfda va rangli ko'rsatiladi
- Qo'shimchalar (add-ons) alohida qatorda
- Buyurtma turi ko'rsatiladi: [STOL #5], [OLIB KETISH], [YETKAZISH]

### 2.7.1. Oshxona printer

⚠ [v1.6 YANGI] KDS displeydan tashqari, oshxona printeriga ham buyurtma chiqarish.

- Yangi buyurtma kelganda avtomatik printer ga chiqadi
- Printer chiqarmasi: stol raqami, taomlar, modifikatorlar, izohlar, vaqt
- Modifikatorlar KATTA harfda ajratib yoziladi
- Qo'shimchalar (add-ons) alohida qatorda ko'rsatiladi
- Printer sozlamasi: avtomatik / qo'lda chiqarish
- Bir nechta printer: issiq tsex, sovuq tsex, bar ga alohida chiqarish (ixtiyoriy)
- Har bir taom kategoriyasiga printer tayinlanadi (admin sozlamada)

### 2.7.2. Printer ulanish texnologiyasi

- **Asosiy usul**: Printer server (Node.js yoki Python) — mahalliy tarmoqda ishlovchi kichik dastur
  - Brauzer → WebSocket → Printer Server → ESC/POS → Printer
  - Printer server admin paneldan yuklab olinadi (Windows/Linux/macOS)
- **Muqobil usul**: Web Print API (brauzer print dialog orqali) — fallback
- **Tarmoq printerlari**: IP manzil orqali to'g'ridan-to'g'ri (Ethernet/WiFi printer)
- Qo'llab-quvvatlanadigan protokollar: ESC/POS (termal printer uchun)

## 2.8. Kassa moduli (POS)

### 2.8.1. To'lov turlari

| To'lov | Kod | Izoh |
|--------|-----|------|
| Naqd pul | cash | Qaytim hisoblash |
| Plastik karta | card | Terminal orqali |
| Click | click | Onlayn |
| Payme | payme | Onlayn |
| Aralash | mixed | Bir necha usul |

[O'CHIRILDI] Qarzdorlik (nasiya) tizimi olib tashlandi.

**Aralash to'lov (mixed) tafsiloti:**
- Bir buyurtma bir nechta usul bilan to'lanishi mumkin (masalan: 50 000 naqd + 30 000 karta)
- Har bir to'lov alohida `payments` yozuvi sifatida saqlanadi
- Buyurtma `paid` holatiga o'tish uchun: barcha to'lovlar yig'indisi >= buyurtma jami summasi
- Qaytim faqat naqd to'lovda hisoblanadi
- Hisobot va Z-hisobotda har bir to'lov usuli alohida ko'rsatiladi

**Payments jadvali:**

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| company_id | FK | Kompaniya |
| order_id | FK | Buyurtma |
| order_check_id | FK (nullable) | Split bill cheki (null = butun buyurtma) |
| cash_shift_id | FK (nullable) | Kassa smenasi (naqd to'lovda) |
| method | ENUM | cash / card / click / payme |
| amount | DECIMAL(12,2) | To'lov summasi |
| change_amount | DECIMAL(12,2) | Qaytim (faqat naqd, default: 0) |
| transaction_id | VARCHAR (nullable) | Onlayn tranzaksiya ID |
| status | ENUM | pending / completed / failed / refunded |
| paid_at | TIMESTAMP | To'langan vaqt |

### 2.8.2. Xizmat haqi

⚠ [v1.6 YANGI] Foizini har bir kompaniya o'zi belgilaydi (0–15%). Admin sozlamalarda o'zgartiradi.

- Xizmat haqi buyurtma jami summasiga (chegirmadan keyin) qo'shiladi
- Formula: `xizmat_haqi = (jami_summa - chegirma) × xizmat_haqi_foizi / 100`
- Split bill da: xizmat haqi chek summasiga proporsional taqsimlanadi
- Chekda alohida qator: "Xizmat haqi (10%): 5 000 so'm"
- Xizmat haqi 0% bo'lishi mumkin (admin sozlamasi)

### 2.8.3. Chek

- Termal printer (ESC/POS) + Elektron chek (Telegram/SMS)
- Kompaniya logotipi va nomi chekda ko'rsatiladi
- Kg taomlar: miqdor kg da ko'rsatiladi
- Chegirma alohida qator
- Split bill: har bir chek alohida
- Chek raqami formati: `{filial_kodi}-{sana}-{tartib}` (masalan: F01-20260406-0042)

### 2.8.4. Qaytarish (Refund)

⚠ [v1.6 YANGI] To'langan buyurtma yoki taomni qaytarish va pul qaytarish.

- Faqat Admin va Menejer qaytarish mumkin
- To'liq qaytarish: butun buyurtma bekor, to'liq pul qaytariladi
- Qisman qaytarish: faqat ayrim taomlar qaytariladi
- Qaytarish sababi MAJBURIY kiritiladi
- Naqd to'lov: kassadan naqd qaytariladi
- Onlayn to'lov: Click/Payme orqali avtomatik qaytarish (API)
- **Onlayn qaytarish muvaffaqiyatsiz bo'lsa**: status `refund_pending` ga o'tadi, admin qo'lda hal qiladi
- Qaytarish hisobotda alohida ko'rsatiladi (salbiy summa)
- Audit log ga yoziladi

**Refund jadvali:**

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| company_id | FK | Kompaniya |
| order_id | FK | Buyurtma |
| user_id | FK | Kim qaytargan |
| type | ENUM | full / partial |
| amount | DECIMAL(12,2) | Qaytarilgan summa |
| reason | TEXT | Sabab (majburiy) |
| refund_method | ENUM | cash / click / payme |
| status | ENUM | completed / pending / failed |
| transaction_id | VARCHAR | Onlayn qaytarish tranzaksiya ID |
| created_at | TIMESTAMP | Sana |

**Qisman qaytarish tarkibi** (`refund_items`) — qaysi taomlar qaytarilganini saqlaydi:

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| refund_id | FK | Qaytarish (refund) |
| order_item_id | FK | Buyurtma taomi |
| quantity | INT | Qaytarilgan miqdor (porsiya) |
| weight_kg | DECIMAL(6,3) | Qaytarilgan miqdor (kg, null agar porsiya) |
| amount | DECIMAL(12,2) | Shu taom uchun qaytarilgan summa |

### 2.8.5. Kassa smena boshqaruvi

⚠ [v1.6 YANGI] Kassir smenasi ochish va yopish jarayoni.

- Smena ochish: kassir boshlang'ich naqd summa kiritadi
- Smena davomida: barcha to'lovlar qayd etiladi
- Smena yopish: kassir kassadagi naqd pulni sanaydi
- Tizim farqni hisoblaydi: kutilgan vs haqiqiy summa
- Farq bo'lsa: sabab kiritiladi (ortiqcha / kam)
- Z-hisobot chop etiladi: jami tushum, to'lov usullari, qaytarishlar, farq
- Menejer/admin barcha smenalar tarixini ko'ra oladi
- **Bir filialda bir vaqtda faqat bitta ochiq smena** bo'lishi mumkin
- Smena ochilmagan bo'lsa — naqd to'lov qabul qilib bo'lmaydi (onlayn to'lov ruxsat etiladi)

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| company_id | FK | Kompaniya |
| branch_id | FK | Filial |
| user_id | FK | Kassir |
| opening_amount | DECIMAL(12,2) | Boshlang'ich naqd summa |
| closing_amount | DECIMAL(12,2) | Yopish paytidagi haqiqiy summa |
| expected_amount | DECIMAL(12,2) | Tizim hisoblagan summa |
| difference | DECIMAL(12,2) | Farq (ortiqcha +, kam -) |
| difference_reason | TEXT | Farq sababi |
| opened_at | TIMESTAMP | Ochilgan vaqt |
| closed_at | TIMESTAMP | Yopilgan vaqt |
| status | ENUM | open / closed |

**`shifts` va `cash_shifts` bog'lanishi**: `shifts` — xodimning ish smenasi (kelish/ketish vaqti). `cash_shifts` — kassirning kassa smenasi. Bir xodim bir kunda bir ish smenasida ishlaydi, lekin kassa smenasini tushlik uchun yopib, keyin qayta ochishi mumkin. Shuning uchun `cash_shifts` da `shift_id` FK mavjud — har bir kassa smenasi ish smenasiga bog'langan.

## 2.9. Omborxona (INVENTORY)

⚠ [v1.6 YANGI] Oddiy kirim-chiqim tizimi (retseptsiz).

- Mahsulotlar: nom, kategoriya, o'lchov birligi, zaxira, min chegara, narx
- O'lchov birliklari (unit): `kg`, `g`, `l`, `ml`, `dona`, `paket`, `quti`, `banka`
- Kirim: yetkazib beruvchidan qabul qilish, hujjat
- Chiqim: qo'lda kiritish (sarflangan, buzilgan)
- Inventarizatsiya: haqiqiy qoldiq kiritish
- Ogohlantirish: minimal chegaradan past bo'lganda (bildirishnoma yuboriladi)
- Yetkazib beruvchilar: CRUD, xarid tarixi

### 2.9.1. Filiallar arasi transfer

⚠ [v1.6 YANGI] Bir filialdan boshqa filialga mahsulot o'tkazish.

- Yuboruvchi filial: chiqim hujjati yaratadi (mahsulotlar, miqdor)
- Qabul qiluvchi filial: kirim sifatida qabul qiladi
- Transfer holatlari: `created` → `sent` → `received`
- Ikkala filialda ombor avtomatik yangilanadi (yuboruvchida `sent` paytida kamayadi, qabul qiluvchida `received` paytida ortadi)
- Transfer tarixi va hisoboti

**Transfer tarkibi — alohida jadval** (`inventory_transfer_items`):

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| transfer_id | FK | Transfer |
| inventory_item_id | FK | Ombor mahsuloti (referensial butunlik) |
| quantity | DECIMAL(10,3) | Miqdor |

**Inventory transfer:**

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| company_id | FK | Kompaniya |
| from_branch_id | FK | Yuboruvchi filial |
| to_branch_id | FK | Qabul qiluvchi filial |
| status | ENUM | created / sent / received |
| note | TEXT | Izoh |
| created_by | FK | Kim yaratgan |
| received_by | FK | Kim qabul qilgan |

## 2.10. Moliyaviy boshqaruv (FINANCE)

- Daromadlar: buyurtmalar, xizmat haqi, yetkazish
- Xarajatlar: oziq-ovqat, ish haqi, kommunal, ijara, soliq
- Hisobotlar: kunlik, haftalik, oylik P&L, ombor, xodimlar, chegirmalar, bekor qilinganlar
- Dashboard KPI: tushum, o'rtacha chek, food cost, top taomlar, stol aylanmasi
- **Hisobot eksporti**: PDF va Excel (XLSX) formatlarida yuklab olish
- **Hisobot yuborish**: Har kuni/haftada/oyda avtomatik email ga yuborish (admin sozlamasi)

⚠ [v1.6 YANGI] Kompaniya admin faqat o'z kompaniyasi hisobotlarini ko'radi. Super Admin barchasini ko'radi.

## 2.11. Yetkazib berish (DELIVERY)

⚠ [v1.6 YANGI] Ikki usul: O'z kurieri yoki Taksi. Menejer tanlaydi.

### 2.11.1. O'z kurieri

- Doimiy kurierlar ro'yxatdan o'tkaziladi
- Majburiy: ism, telefon, mashina raqami, guvohnoma raqami, Telegram ID
- Kurier Telegram Mini App orqali buyurtma oladi va status yangilaydi

### 2.11.2. Taksi orqali

- Menejer haydovchi ma'lumotlarini qo'lda kiritadi: ism, telefon, mashina raqami
- API integratsiya yo'q — faqat qo'lda

### 2.11.3. Yetkazish holatlari (State Machine)

```
assigned → picked_up → delivering → delivered
[har qanday holat] → cancelled (menejer tomonidan)
```

| Holat | Kod | Kim | Izoh |
|-------|-----|-----|------|
| Tayinlangan | assigned | Menejer | Kurier/taksi tayinlandi |
| Olingan | picked_up | Kurier | Taom oshxonadan olindi |
| Yo'lda | delivering | Kurier | Mijozga yo'lda |
| Yetkazildi | delivered | Kurier | Mijozga topshirildi |
| Bekor | cancelled | Menejer | Sabab bilan |

### 2.11.4. Yetkazish xarajati

- Kim to'laydi — kompaniya sozlamasida belgilanadi:
  - **Variant 1**: Restoran to'laydi — yetkazish narxi buyurtma summasiga qo'shiladi, mijoz to'laydi
  - **Variant 2**: Restoran o'zi ko'taradi — mijoz faqat taom narxini to'laydi
- Yetkazish narxi: admin belgilaydi (qat'iy summa yoki masofa bo'yicha — v1 da faqat qat'iy summa)

## 2.12. Sozlamalar (SETTINGS)

### 2.12.1. Super Admin sozlamalari

- Platforma umumiy sozlamalari
- Kompaniyalar boshqaruvi
- Default branding (rang, logo)

### 2.12.2. Kompaniya sozlamalari

- Kompaniya profili: nom, manzil, telefon, logotip, asosiy rang
- Filiallar boshqaruvi
- Xizmat haqi foizi (0–15%)
- Maksimal chegirma chegarasi (%)
- ⚠ [YANGI] Bekor qilish muddati (daqiqa) — necha daqiqa/soat ichida bekor qilish mumkin
- Yetkazish xarajati siyosati (kim to'laydi, qancha)
- Doimiy kurierlar ro'yxati
- Telegram Bot token
- To'lov tizimlari kalitlari (Click/Payme)
- Printer sozlamalari (IP manzil, port, auto/manual)
- Til sozlamalari (UZ/RU) — default til va qo'shimcha til
- Sodiqlik dasturi sozlamalari (ball foizi, konvertatsiya kursi)

## 2.13. Sodiqlik dasturi (LOYALTY)

⚠ [v1.6 YANGI] Telegram mijozlar uchun ball to'plash va chegirmaga almashtirish.

### 2.13.1. Ball tizimi

- Har bir buyurtma uchun ball beriladi (masalan: 1000 so'm = 1 ball)
- Ball foizi admin sozlamalarda belgilanadi
- Ball to'plash: buyurtma to'langandan keyin avtomatik
- Ball ko'rish: Telegram Mini App da "Mening ballarim" bo'limi

### 2.13.2. Ballarni sarflash

- Ball bilan to'lash: keyingi buyurtmada ball ishlatish
- Ball konvertatsiyasi: 1 ball = 1 so'm (yoki admin belgilagan kurs)
- Minimal ball sarflash: 5 000 balldan boshlab
- Ball + pul aralash to'lov mumkin

### 2.13.3. Sodiqlik darajalari (ixtiyoriy)

| Daraja | Ball oralig'i | Imtiyoz |
|--------|---------------|---------|
| Bronze | 0 – 50 000 | Standart |
| Silver | 50 000 – 200 000 | 5% qo'shimcha chegirma |
| Gold | 200 000+ | 10% qo'shimcha chegirma + bepul yetkazish |

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| customer_id | FK | Mijoz |
| company_id | FK | Kompaniya |
| total_earned | INT | Jami to'plangan ball |
| total_spent | INT | Jami sarflangan ball |
| current_balance | INT | Joriy balans |
| tier | ENUM | bronze / silver / gold |

## 2.14. Promo-kod tizimi (PROMO)

⚠ [v1.6 YANGI] Marketing va mijozlarni jalb qilish uchun promo-kod tizimi.

### 2.14.1. Promo-kod turlari

| Turi | Kod | Izoh |
|------|-----|------|
| Foizli chegirma | percentage | Buyurtma summasidan N% (masalan: 15%) |
| Qat'iy summa | fixed_amount | Belgilangan summa (masalan: 10 000 so'm) |
| Bepul yetkazish | free_delivery | Yetkazish narxi 0 |
| Bepul taom | free_item | Belgilangan taom bepul qo'shiladi |

### 2.14.2. Promo-kod cheklovlari

| Cheklov | Izoh |
|---------|------|
| Minimal buyurtma summasi | `min_order` — masalan, 50 000 so'mdan oshgan buyurtmalarga |
| Maksimal chegirma summasi | `max_discount` — foizli chegirmada limit (masalan, max 30 000 so'm) |
| Foydalanish limiti | `max_uses` — jami necha marta ishlatilishi mumkin |
| Foydalanuvchi limiti | `max_uses_per_user` — bitta mijoz necha marta (default: 1) |
| Amal qilish muddati | `starts_at`, `expires_at` — boshlanish va tugash sanasi |
| Faqat yangi mijozlar | `new_customers_only` — faqat birinchi buyurtmaga |
| Buyurtma turi | `order_type` — faqat delivery yoki faqat dine_in |

### 2.14.3. Promo-kod boshqaruvi

- Admin/menejer promo-kod yaratadi
- Tasodifiy yoki qo'lda kiritilgan kod (masalan: YANGI2026, TUSHLIK15)
- Kod uzunligi: 4-20 belgi, faqat harflar va raqamlar
- Faol/nofaol qilish
- Foydalanish statistikasi: nechta ishlatilgan, qancha chegirma berilgan

### 2.14.4. Promo-kod qo'llash jarayoni

1. Mijoz (Telegram) yoki ofitsiant (Web) promo-kodni kiritadi
2. Tizim validatsiya qiladi: amal muddati, limit, minimal summa, foydalanuvchi cheklovi
3. Agar yaroqli — chegirma buyurtmaga qo'shiladi
4. Agar yaroqsiz — aniq xatolik xabari ko'rsatiladi (masalan: "Promo-kod muddati tugagan")
5. Promo-kod va oddiy chegirma birgalikda qo'llanilMAYDI (bitta tanlanadi)

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| company_id | FK | Kompaniya |
| code | VARCHAR(20) | Promo-kod (UNIQUE per company) |
| type | ENUM | percentage / fixed_amount / free_delivery / free_item |
| value | DECIMAL(12,2) | Qiymat (foiz yoki summa) |
| free_item_id | FK (nullable) | Bepul taom uchun menu_item_id |
| min_order | DECIMAL(12,2) | Minimal buyurtma summasi (null = cheklovsiz) |
| max_discount | DECIMAL(12,2) | Maks chegirma summasi (null = cheklovsiz) |
| max_uses | INT | Jami foydalanish limiti (0 = cheksiz) |
| max_uses_per_user | INT | Foydalanuvchi uchun limit (default: 1) |
| used_count | INT | Joriy ishlatilganlar soni |
| new_customers_only | BOOLEAN | Faqat yangi mijozlarga (default: false) |
| order_type | ENUM (nullable) | dine_in / takeaway / delivery / null (barcha) |
| starts_at | TIMESTAMP | Boshlanish sanasi |
| expires_at | TIMESTAMP | Tugash sanasi |
| is_active | BOOLEAN | Faolmi |
| created_at | TIMESTAMP | Yaratilgan sana |

**Promo-kod foydalanish tarixi** (`promo_usages`):

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| promo_id | FK | Promo-kod |
| order_id | FK | Buyurtma |
| customer_id | FK | Mijoz |
| discount_amount | DECIMAL(12,2) | Berilgan chegirma summasi |
| used_at | TIMESTAMP | Ishlatilgan sana |

## 2.15. Bildirishnoma tizimi (NOTIFICATIONS)

### 2.15.1. Bildirishnoma kanallari

| Kanal | Texnologiya | Kimga |
|-------|-------------|-------|
| Web Push | Laravel Echo + WebSocket | Barcha web foydalanuvchilar |
| Telegram | Bot API xabar | Mijozlar, kurierlar |
| Email | SMTP (Laravel Mail) | Admin, menejer |
| Ovoz signali | Brauzer Audio API | KDS (oshxona), kassir |

### 2.15.2. Bildirishnoma hodisalari

| Hodisa | Kimga | Kanal | Izoh |
|--------|-------|-------|------|
| Yangi buyurtma | Oshpaz, Kassir | Web Push + Ovoz | Real-time |
| Buyurtma tayyor | Ofitsiant | Web Push | Taom tayyor signali |
| Buyurtma bekor qilindi | Menejer, Kassir | Web Push | Sababi ko'rsatiladi |
| Yangi yetkazish | Kurier | Telegram | Manzil va taomlar |
| Buyurtma holati o'zgardi | Mijoz | Telegram | Status yangilanishi |
| Ombor minimum | Admin, Menejer | Web Push + Email | Mahsulot nomi va qoldiq |
| Kassa farqi | Admin | Web Push + Email | Smena yopilganda farq bo'lsa |
| Obuna tugayapti | Company Admin | Email + Web Push | 7 kun va 1 kun oldin |
| Obuna tugadi | Company Admin | Email + Web Push | Free ga tushdi |
| Tarif limiti yaqin | Company Admin | Web Push | Filial/xodim 90% ga yetganda |
| Transfer yuborildi | Qabul qiluvchi filial admin | Web Push | Yangi transfer keldi |
| Yangi promo-kod ishlatildi | Admin | Web Push | Statistika |
| To'lov muvaffaqiyatsiz | Kassir, Admin | Web Push | Onlayn to'lov xatosi |
| Refund muvaffaqiyatsiz | Admin | Web Push + Email | Qo'lda hal qilish kerak |

### 2.15.3. Bildirishnoma sozlamalari

- Har bir foydalanuvchi o'ziga keladigan bildirishnomalarni sozlashi mumkin (on/off)
- Email bildirishnomalar uchun: kunlik digest rejimi mavjud (barcha xabarlar 1 ta emailda)
- Ovoz signali: Admin har bir hodisa uchun ovozni yoqish/o'chirish sozlashi mumkin
- "Bezovta qilmaslik" rejimi: belgilangan soatlarda bildirishnoma kelmaydi

### 2.15.4. Bildirishnoma jadvali

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| company_id | FK | Kompaniya |
| user_id | FK (nullable) | Kimga (null = broadcast) |
| type | VARCHAR | Hodisa turi (order_new, order_ready, stock_low...) |
| channel | ENUM | web_push / telegram / email / sound |
| title | VARCHAR | Sarlavha |
| body | TEXT | Mazmun |
| data_json | JSON | Qo'shimcha ma'lumot (order_id, table_id va h.k.) |
| read_at | TIMESTAMP | O'qilgan vaqt (null = o'qilmagan) |
| created_at | TIMESTAMP | Yaratilgan sana |

## 2.16. Offline rejim

⚠ [v1.6 YANGI] Internet uzilib qolganda asosiy funksiyalar ishlashda davom etadi.

### 2.16.1. Offline da ishlaydigan funksiyalar

- Buyurtma yaratish (ofitsiant): IndexedDB da mahalliy saqlash
- Menyu ko'rish: oxirgi yuklangan menyu keshdan olinadi
- Stollar holati: oxirgi ma'lum holat ko'rsatiladi (yangilanmaydi)
- Kassa: naqd to'lov qabul qilish (faqat ochiq smena mavjud bo'lsa)

### 2.16.2. Offline da ishlaMAYdigan funksiyalar

- Onlayn to'lov (Click, Payme) — internet kerak
- Real-time yangilanish (WebSocket) — qayta ulanadi
- Telegram buyurtmalar — Telegram o'zi internet talab qiladi
- Split bill — murakkab sinxronizatsiya talab qilinganligi sababli
- Promo-kod validatsiya — server tekshiruvi kerak
- Chegirma qo'llash — max chegirma tekshiruvi server tarafda

### 2.16.3. Sinxronizatsiya (Sync)

- Internet qayta ulanganda: barcha offline buyurtmalar serverga FIFO tartibda yuboriladi
- **Konflikt hal qilish strategiyasi**:
  - Buyurtma yaratish: har doim qabul qilinadi (yangi buyurtma — konflikt bo'lmaydi)
  - Stol holati: server versiyasi ustunlik qiladi
  - Naqd to'lov: offline to'lov yozuvlari serverga yuboriladi, kassa smenasiga qo'shiladi
  - Agar stol boshqa ofitsiant tomonidan band qilingan bo'lsa: ogohlantirish + stol qayta tanlash
- **Chek raqam unikallik**: Offline chek raqamiga `OFF-` prefiksi qo'shiladi + `{device_id}-{timestamp}` formati. Sync paytida server doimiy raqam tayinlaydi.
- Ofitsiantga ogohlantirish: "3 ta buyurtma sinxronlandi"
- Offline ishlash davri: maksimum 4 soat
  - 3 soatda ogohlantirish: "1 soat qoldi, internet ulaning"
  - 4 soatdan keyin: faqat mavjud buyurtmalarni ko'rish mumkin, yangi buyurtma yaratib bo'lmaydi
- Service Worker texnologiyasi (PWA)
- Offline ma'lumotlar hajmi: maksimum 50 MB (IndexedDB limit)

## 2.17. Audit log

Barcha muhim operatsiyalar qayd etiladi.

### 2.17.1. Audit log yoziladigan hodisalar

| Kategoriya | Hodisalar |
|------------|-----------|
| Buyurtma | Yaratish, bekor qilish, chegirma qo'llash, stol ko'chirish |
| To'lov | To'lov, qaytarish (refund), smena ochish/yopish |
| Menyu | Taom qo'shish/tahrirlash/o'chirish, narx o'zgartirish |
| Xodimlar | Qo'shish, o'chirish, rol o'zgartirish |
| Ombor | Kirim, chiqim, transfer, inventarizatsiya |
| Sozlamalar | Xizmat haqi, chegirma limiti, tarif o'zgarishi |
| Auth | Login, logout, muvaffaqiyatsiz login, parol tiklash |

### 2.17.2. Audit log ma'lumotlari

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| company_id | FK | Kompaniya |
| user_id | FK | Kim bajardi |
| action | VARCHAR | create / update / delete / login / logout |
| model | VARCHAR | Model nomi (Order, Payment, MenuItem...) |
| model_id | BIGINT | Yozuv ID |
| old_values | JSON | Eski qiymatlar (update/delete da) |
| new_values | JSON | Yangi qiymatlar (create/update da) |
| ip_address | VARCHAR(45) | IP manzil |
| user_agent | VARCHAR | Brauzer/qurilma |
| created_at | TIMESTAMP | Sana |

### 2.17.3. Audit log qoidalari

- Saqlash muddati: **12 oy** (1 yil). 12 oydan eski loglar arxivlanadi (S3 ga).
- Admin va menejer audit loglarni ko'rishi mumkin (faqat o'z kompaniyasi)
- Super Admin barcha kompaniyalar loglarini ko'ra oladi
- Eksport: CSV formatda yuklab olish
- Audit loglar o'zgartirib yoki o'chirib BO'LMAYDI (immutable)

---

# 3. MA'LUMOTLAR BAZASI

## 3.1. Asosiy jadvallar

⚠ [v1.6 YANGI] Barcha tenant-specific jadvallar `company_id` orqali ajratiladi.

### Global jadvallar (company_id yo'q)

| Jadval | Asosiy maydonlar | Izoh |
|--------|------------------|------|
| companies | id, name, slug, logo, primary_color, phone, is_active, settings_json | Kompaniyalar |
| customers | id, telegram_id, name, phone, created_at | Global mijozlar (platforma darajasida) |
| plans | id, name, display_name, price_monthly, max_branches, max_staff, has_inventory, has_full_reports, has_branding, has_subdomain | Tarif rejalari |

### Tenant-specific jadvallar (company_id bor)

| Jadval | Asosiy maydonlar | Izoh |
|--------|------------------|------|
| users | id, company_id, branch_id, name, email, phone, role, password, avatar, is_active, invited_at, invite_token | Xodimlar. company_id NULL = super_admin. branch_id = tayinlangan filial |
| branches | id, company_id, name, address, phone | Filiallar |
| categories | id, company_id, parent_id, name_uz, name_ru, icon, sort_order | Kategoriyalar |
| menu_items | id, company_id, category_id, name_uz, name_ru, sell_type, price, min_weight, weight_step, image, cooking_time, is_available | Menyu. sell_type, min_weight, weight_step YANGI |
| tables | id, company_id, branch_id, number, seats, zone, status, qr_code, qr_token, assigned_waiter_id, merged_with_table_id | Stollar. qr_token, assigned_waiter_id, merged_with_table_id YANGI |
| orders | id, company_id, branch_id, table_id, user_id, customer_id, type, status, total, discount_type, discount_value, service_charge_pct, promo_id | type ENUM(dine_in, takeaway, delivery), promo_id YANGI |
| order_items | id, order_id, menu_item_id, quantity, weight_kg, unit_price, total_price, note | weight_kg YANGI (kg taomlar uchun) |
| order_checks | id, company_id, order_id, check_number, total, paid_at | YANGI: Split bill. company_id qo'shildi |
| check_items | id, order_check_id, order_item_id, quantity | YANGI: Chek tarkibi (JSON o'rniga) |
| payments | id, company_id, order_id, order_check_id, method, amount, transaction_id, status | company_id qo'shildi |
| order_cancellations | id, company_id, order_id, user_id, reason, cancelled_at | YANGI: company_id qo'shildi |
| order_item_modifiers | id, order_item_id, modifier_id | YANGI: Buyurtma modifikatorlari |
| order_item_addons | id, order_item_id, addon_id, price | YANGI: Buyurtma qo'shimchalari |
| modifiers | id, company_id, name_uz, name_ru, is_active | Taom modifikatorlari. Ko'p tilli |
| menu_item_modifiers | id, menu_item_id, modifier_id | Taom-modifikator bog'lash |
| addons | id, company_id, name_uz, name_ru, price, is_active | Pullik qo'shimchalar. Ko'p tilli |
| menu_item_addons | id, menu_item_id, addon_id | Taom-qo'shimcha bog'lash |
| combos | id, company_id, name_uz, name_ru, price, available_from, available_until, available_days, is_active | Combo/Set. available_days va ko'p tilli YANGI |
| combo_items | id, combo_id, menu_item_id, quantity | YANGI: Combo tarkibi (JSON o'rniga, FK bilan) |
| inventory_items | id, company_id, branch_id, name, category, unit, current_stock, min_stock, cost_price | Ombor mahsulotlari |
| inventory_transactions | id, company_id, item_id, type, quantity, price, supplier_id, note, user_id | Kirim/chiqim. company_id qo'shildi |
| inventory_transfers | id, company_id, from_branch_id, to_branch_id, status, note, created_by, received_by | Transfer. items_json O'CHIRILDI |
| inventory_transfer_items | id, transfer_id, inventory_item_id, quantity | YANGI: Transfer tarkibi (JSON o'rniga, FK bilan) |
| suppliers | id, company_id, name, phone, address, inn | Yetkazib beruvchilar |
| couriers | id, company_id, user_id, name, phone, car_number, license_number, telegram_id, status, rating | Doimiy kurierlar |
| delivery_orders | id, company_id, order_id, method, courier_id, driver_name, driver_phone, car_number, address, delivery_fee, fee_paid_by, status | Kurier + taksi. company_id qo'shildi |
| customer_companies | id, customer_id, company_id, total_orders, total_spent, first_order_at | YANGI: Mijoz-kompaniya bog'lanishi |
| customer_favorites | id, customer_id, company_id, menu_item_id | YANGI: company_id qo'shildi |
| expenses | id, company_id, branch_id, category, amount, description, date | Xarajatlar |
| notifications | id, company_id, user_id, type, channel, title, body, data_json, read_at | Bildirishnomalar. channel, data_json YANGI |
| audit_logs | id, company_id, user_id, action, model, model_id, old_values, new_values, ip_address, user_agent | ip_address, user_agent YANGI |
| shifts | id, company_id, user_id, branch_id, start_at, end_at | Ish smenalari |
| cash_shifts | id, company_id, branch_id, user_id, shift_id, opening_amount, closing_amount, expected_amount, difference, difference_reason, opened_at, closed_at, status | shift_id FK YANGI |
| promos | id, company_id, code, type, value, free_item_id, min_order, max_discount, max_uses, max_uses_per_user, used_count, new_customers_only, order_type, starts_at, expires_at, is_active | TO'LIQ YANGILANDI |
| promo_usages | id, promo_id, order_id, customer_id, discount_amount, used_at | YANGI: Ishlatish tarixi |
| subscriptions | id, company_id, plan_id, status, trial_ends_at, current_period_start, current_period_end | Obunalar |
| subscription_payments | id, subscription_id, amount, method, transaction_id, status, invoice_url, paid_at | Obuna to'lovlari |
| refunds | id, company_id, order_id, user_id, type, amount, reason, refund_method, status, transaction_id | company_id, status YANGI |
| loyalty_accounts | id, customer_id, company_id, total_earned, total_spent, current_balance, tier | Sodiqlik ball |
| loyalty_transactions | id, loyalty_account_id, type, amount, order_id, description | Ball harakatlari |
| reservations | id, company_id, branch_id, table_id, customer_name, customer_phone, guest_count, reserved_at, note, status, created_by | YANGI: Stol bronlari |
| refund_items | id, refund_id, order_item_id, quantity, weight_kg, amount | YANGI: Qisman qaytarish tarkibi |
| fiscal_receipts | id, company_id, order_id, payment_id, fiscal_id, fiscal_qr, status, sent_at, confirmed_at, error_message | YANGI: DGI fiskal cheklar (4-bosqich) |

### 3.1.1. Timestamp va soft delete qoidalari

- **Barcha jadvallar** `created_at` va `updated_at` maydonlariga ega (Laravel Eloquent timestamps).
- Yuqoridagi jadvallarda qisqalik uchun yozilmagan — lekin migration'larda `$table->timestamps()` majburiy.
- Soft delete (`deleted_at`) qo'llaniladigan jadvallar: `users`, `menu_items`, `categories`, `combos`, `inventory_items`, `suppliers`, `couriers`. Boshqa jadvallar hard delete.

### 3.1.2. Muhim indekslar (Indexes)

Tezkor so'rovlar uchun tavsiya etiladigan compound indekslar:

| Jadval | Indeks | Izoh |
|--------|--------|------|
| orders | (company_id, status, created_at) | Buyurtma filtrlash |
| orders | (company_id, branch_id, created_at) | Filial bo'yicha hisobot |
| orders | (company_id, table_id, status) | Stol buyurtmalari |
| order_items | (order_id, menu_item_id) | Buyurtma tarkibi |
| payments | (company_id, status, paid_at) | To'lov hisoboti |
| payments | (order_id, status) | Buyurtma to'lovlari |
| audit_logs | (company_id, model, action, created_at) | Log filtrlash |
| audit_logs | (company_id, user_id, created_at) | Foydalanuvchi loglar |
| menu_items | (company_id, category_id, is_available) | Menyu ko'rsatish |
| tables | (company_id, branch_id, status) | Stol ro'yxati |
| notifications | (company_id, user_id, read_at) | O'qilmagan bildirishnomalar |
| inventory_items | (company_id, branch_id, current_stock) | Kam qolgan mahsulotlar |
| customer_companies | (company_id, customer_id) UNIQUE | Mijoz-kompaniya |
| promos | (company_id, code) UNIQUE | Promo-kod qidirish |
| customers | (telegram_id) UNIQUE | Telegram orqali topish |
| users | (company_id, email) UNIQUE | Login |

### 3.2. Mijoz identifikatsiya arxitekturasi

⚠ [v1.6 YANGI] Mijoz (`customers`) endi **global** jadval — platformadagi barcha kompaniyalar uchun yagona.

```
customers (global)
├── id, telegram_id (UNIQUE), name, phone
│
├── customer_companies (pivot)
│   ├── customer_id FK → customers
│   ├── company_id FK → companies
│   ├── total_orders, total_spent, first_order_at
│   └── (UNIQUE: customer_id + company_id)
│
├── customer_favorites
│   ├── customer_id FK → customers
│   ├── company_id FK → companies
│   └── menu_item_id FK → menu_items
│
└── loyalty_accounts
    ├── customer_id FK → customers
    └── company_id FK → companies
```

**Afzalliklari**:
- Bitta Telegram ID = bitta mijoz yozuvi
- Har bir kompaniya o'z mijoz statistikasini ko'radi (`customer_companies` orqali)
- Super Admin platformadagi umumiy mijoz sonini ko'ra oladi
- Mijoz bir nechta restoranda buyurtma bera oladi, har birida alohida statistika

---

# 4. API ARXITEKTURASI

## 4.1. API konvensiyalari

- Base URL: `/api/v1/`
- Super Admin: `/api/v1/super/*` — platforma boshqaruvi
- Kompaniya: `/api/v1/*` — barcha so'rovlar avtomatik `company_id` filtrlanadi
- Autentifikatsiya: `Bearer Token` (Laravel Sanctum)
- Telegram: `/api/v1/tg/*` — Mini App endpointlar
- Format: JSON
- Pagination: `?page=1&per_page=20` (default: 20, max: 100)
- Filtrlash: `?status=active&sort=-created_at`
- Rate Limiting: Bo'lim 5.5 ga qarang

### 4.1.1. Javob formati (Success)

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 150
  }
}
```

### 4.1.2. Javob formati (Error)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Noto'g'ri ma'lumot kiritildi",
    "details": { "email": ["Email formati noto'g'ri"] }
  }
}
```

## 4.2. Auth API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| POST | /api/v1/auth/login | Email + parol bilan kirish |
| POST | /api/v1/auth/logout | Chiqish (token bekor qilish) |
| POST | /api/v1/auth/forgot-password | Parol tiklash so'rovi (email yuboradi) |
| POST | /api/v1/auth/reset-password | Yangi parol o'rnatish (kod + yangi parol) |
| GET | /api/v1/auth/me | Joriy foydalanuvchi profili |
| PUT | /api/v1/auth/me | Profilni tahrirlash |
| PUT | /api/v1/auth/change-password | Parolni o'zgartirish |
| POST | /api/v1/auth/tg | Telegram InitData orqali auth |

## 4.3. Super Admin API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/super/companies | Barcha kompaniyalar ro'yxati |
| POST | /api/v1/super/companies | Yangi kompaniya yaratish |
| GET | /api/v1/super/companies/{id} | Kompaniya tafsiloti |
| PUT | /api/v1/super/companies/{id} | Kompaniya tahrirlash |
| PATCH | /api/v1/super/companies/{id}/toggle | Faol/nofaol qilish |
| GET | /api/v1/super/dashboard | Platforma statistikasi |
| GET | /api/v1/super/companies/{id}/stats | Kompaniya statistikasi |
| POST | /api/v1/super/companies/{id}/admin | Admin tayinlash |
| GET | /api/v1/super/plans | Tarif rejalari ro'yxati |
| POST | /api/v1/super/plans | Yangi tarif yaratish |
| PUT | /api/v1/super/plans/{id} | Tarif tahrirlash |
| POST | /api/v1/super/companies/{id}/subscription | Kompaniyaga tarif tayinlash |
| GET | /api/v1/super/subscriptions | Barcha obunalar ro'yxati |
| GET | /api/v1/super/subscription-payments | To'lov tarixi |
| GET | /api/v1/super/customers | Platformadagi barcha mijozlar |

## 4.4. Obuna API (Kompaniya Admin)

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/subscription | Joriy obuna holati |
| GET | /api/v1/plans | Mavjud tarif rejalari |
| POST | /api/v1/subscription/upgrade | Tarif yangilash |
| POST | /api/v1/subscription/pay/click | Click orqali to'lov |
| POST | /api/v1/subscription/pay/payme | Payme orqali to'lov |
| GET | /api/v1/subscription/payments | To'lov tarixi |
| GET | /api/v1/subscription/invoice/{id} | Faktura ko'rish |
| GET | /api/v1/subscription/limits | Joriy cheklovlar |

## 4.5. Menyu API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/categories | Kategoriyalar ro'yxati |
| POST | /api/v1/categories | Kategoriya yaratish |
| PUT | /api/v1/categories/{id} | Kategoriya tahrirlash |
| DELETE | /api/v1/categories/{id} | Kategoriya o'chirish |
| PATCH | /api/v1/categories/reorder | Tartibni o'zgartirish |
| GET | /api/v1/menu-items | Taomlar ro'yxati (?category_id, ?is_available) |
| POST | /api/v1/menu-items | Taom yaratish |
| GET | /api/v1/menu-items/{id} | Taom tafsiloti |
| PUT | /api/v1/menu-items/{id} | Taom tahrirlash |
| DELETE | /api/v1/menu-items/{id} | Taom o'chirish (soft delete) |
| PATCH | /api/v1/menu-items/{id}/availability | Bor/yo'q qilish |
| POST | /api/v1/menu-items/{id}/image | Rasm yuklash |
| GET | /api/v1/modifiers | Modifikatorlar ro'yxati |
| POST | /api/v1/modifiers | Modifikator yaratish |
| PUT | /api/v1/modifiers/{id} | Modifikator tahrirlash |
| DELETE | /api/v1/modifiers/{id} | Modifikator o'chirish |
| GET | /api/v1/addons | Qo'shimchalar ro'yxati |
| POST | /api/v1/addons | Qo'shimcha yaratish |
| PUT | /api/v1/addons/{id} | Qo'shimcha tahrirlash |
| DELETE | /api/v1/addons/{id} | Qo'shimcha o'chirish |
| GET | /api/v1/combos | Combo ro'yxati |
| POST | /api/v1/combos | Combo yaratish |
| PUT | /api/v1/combos/{id} | Combo tahrirlash |
| DELETE | /api/v1/combos/{id} | Combo o'chirish |

## 4.6. Buyurtma API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/orders | Buyurtmalar ro'yxati (?status, ?table_id, ?date) |
| POST | /api/v1/orders | Yangi buyurtma yaratish |
| GET | /api/v1/orders/{id} | Buyurtma tafsiloti |
| PUT | /api/v1/orders/{id} | Buyurtma tahrirlash (taom qo'shish/o'chirish) |
| PATCH | /api/v1/orders/{id}/status | Holat o'zgartirish |
| POST | /api/v1/orders/{id}/cancel | Buyurtma bekor qilish (sabab bilan) |
| POST | /api/v1/orders/{id}/discount | Chegirma qo'llash |
| POST | /api/v1/orders/{id}/promo | Promo-kod qo'llash |
| POST | /api/v1/orders/{id}/split | Split bill yaratish |
| GET | /api/v1/orders/{id}/checks | Buyurtma cheklari (split bill) |
| POST | /api/v1/orders/{id}/reorder | Qayta buyurtma (savatchaga nusxa) |

## 4.7. Stol API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/tables | Stollar ro'yxati (?branch_id, ?status) |
| POST | /api/v1/tables | Stol yaratish |
| PUT | /api/v1/tables/{id} | Stol tahrirlash |
| DELETE | /api/v1/tables/{id} | Stol o'chirish |
| PATCH | /api/v1/tables/{id}/status | Holat o'zgartirish |
| POST | /api/v1/tables/{id}/reserve | Bron qilish (nom, telefon, sana, vaqt, soni) |
| GET | /api/v1/reservations | Bronlar ro'yxati (?date, ?status, ?branch_id) |
| PATCH | /api/v1/reservations/{id}/cancel | Bronni bekor qilish |
| PATCH | /api/v1/reservations/{id}/confirm | Bronni tasdiqlash |
| POST | /api/v1/tables/{id}/transfer | Stol ko'chirish (target_table_id) |
| POST | /api/v1/tables/{id}/merge | Stolni birlashtirish (target_table_id) |
| POST | /api/v1/tables/{id}/unmerge | Stolni ajratish |
| GET | /api/v1/tables/{id}/qr | QR kod yuklab olish (PNG/PDF) |

## 4.8. Oshxona (KDS) API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/kitchen/orders | Oshxona uchun faol buyurtmalar |
| PATCH | /api/v1/kitchen/orders/{id}/ready | Taom tayyor |
| PATCH | /api/v1/kitchen/items/{item_id}/ready | Bitta taom tayyor |
| GET | /api/v1/kitchen/stats | KDS statistikasi (o'rtacha tayyorlash vaqti) |

## 4.9. Kassa (POS) API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| POST | /api/v1/payments | To'lov qabul qilish |
| GET | /api/v1/payments/{id} | To'lov tafsiloti |
| POST | /api/v1/payments/{id}/refund | Qaytarish (refund) |
| POST | /api/v1/cash-shifts/open | Smena ochish |
| POST | /api/v1/cash-shifts/close | Smena yopish |
| GET | /api/v1/cash-shifts/current | Joriy ochiq smena |
| GET | /api/v1/cash-shifts | Smenalar tarixi |
| GET | /api/v1/cash-shifts/{id}/report | Z-hisobot |

## 4.10. Moliya API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/expenses | Xarajatlar ro'yxati (?category, ?date_from, ?date_to, ?branch_id) |
| POST | /api/v1/expenses | Xarajat kiritish |
| PUT | /api/v1/expenses/{id} | Xarajat tahrirlash |
| DELETE | /api/v1/expenses/{id} | Xarajat o'chirish |
| GET | /api/v1/expenses/categories | Xarajat kategoriyalari (ish_haqi, oziq_ovqat, kommunal, ijara, soliq, boshqa) |

## 4.11. Ombor API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/inventory | Mahsulotlar ro'yxati (?branch_id, ?low_stock) |
| POST | /api/v1/inventory | Mahsulot yaratish |
| PUT | /api/v1/inventory/{id} | Mahsulot tahrirlash |
| DELETE | /api/v1/inventory/{id} | Mahsulot o'chirish |
| POST | /api/v1/inventory/transactions | Kirim/chiqim yaratish |
| GET | /api/v1/inventory/transactions | Tranzaksiyalar tarixi |
| POST | /api/v1/inventory/stocktake | Inventarizatsiya |
| GET | /api/v1/suppliers | Yetkazib beruvchilar |
| POST | /api/v1/suppliers | Yetkazib beruvchi yaratish |
| PUT | /api/v1/suppliers/{id} | Yetkazib beruvchi tahrirlash |
| DELETE | /api/v1/suppliers/{id} | Yetkazib beruvchi o'chirish |
| GET | /api/v1/inventory/transfers | Transferlar ro'yxati |
| POST | /api/v1/inventory/transfers | Yangi transfer |
| PATCH | /api/v1/inventory/transfers/{id}/send | Yuborish |
| PATCH | /api/v1/inventory/transfers/{id}/receive | Qabul qilish |

## 4.12. Yetkazish API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/deliveries | Yetkazish buyurtmalari |
| POST | /api/v1/deliveries | Yetkazish yaratish (kurier/taksi tayinlash) |
| PATCH | /api/v1/deliveries/{id}/status | Status yangilash |
| GET | /api/v1/couriers | Kurierlar ro'yxati |
| POST | /api/v1/couriers | Kurier qo'shish |
| PUT | /api/v1/couriers/{id} | Kurier tahrirlash |
| DELETE | /api/v1/couriers/{id} | Kurier o'chirish |
| PATCH | /api/v1/couriers/{id}/status | Kurier holati (online/offline) |

## 4.13. Xodimlar API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/staff | Xodimlar ro'yxati (?role, ?branch_id) |
| POST | /api/v1/staff | Yangi xodim qo'shish (taklif yuborish) |
| GET | /api/v1/staff/{id} | Xodim tafsiloti |
| PUT | /api/v1/staff/{id} | Xodim tahrirlash |
| DELETE | /api/v1/staff/{id} | Xodimni o'chirish (deactivate) |
| POST | /api/v1/staff/{id}/resend-invite | Taklifni qayta yuborish |
| GET | /api/v1/shifts | Smenalar ro'yxati |
| POST | /api/v1/shifts | Smena yaratish |
| PUT | /api/v1/shifts/{id} | Smena tahrirlash |

## 4.14. Hisobot API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/reports/daily | Kunlik tushum hisoboti |
| GET | /api/v1/reports/weekly | Haftalik hisobot |
| GET | /api/v1/reports/monthly | Oylik hisobot |
| GET | /api/v1/reports/pnl | Daromad va xarajat (P&L) |
| GET | /api/v1/reports/top-items | Eng ko'p sotilgan taomlar |
| GET | /api/v1/reports/staff-performance | Xodimlar samaradorligi |
| GET | /api/v1/reports/inventory | Ombor hisoboti |
| GET | /api/v1/reports/discounts | Chegirmalar hisoboti |
| GET | /api/v1/reports/cancellations | Bekor qilinganlar |
| GET | /api/v1/reports/export | Hisobot eksporti (?format=pdf/xlsx, ?type=daily) |
| GET | /api/v1/dashboard | Kompaniya dashboard KPI |

## 4.15. Sodiqlik API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/loyalty/account | Mijoz ball hisobi |
| GET | /api/v1/loyalty/transactions | Ball harakatlari tarixi |
| POST | /api/v1/loyalty/redeem | Ball sarflash (buyurtmada) |
| GET | /api/v1/loyalty/tiers | Daraja tizimi ma'lumotlari |

## 4.16. Promo API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/promos | Promo-kodlar ro'yxati |
| POST | /api/v1/promos | Promo-kod yaratish |
| PUT | /api/v1/promos/{id} | Promo-kod tahrirlash |
| DELETE | /api/v1/promos/{id} | Promo-kod o'chirish |
| POST | /api/v1/promos/validate | Promo-kodni tekshirish (real-time) |
| GET | /api/v1/promos/{id}/stats | Promo-kod statistikasi |

## 4.17. Sozlamalar API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/settings | Kompaniya sozlamalari |
| PUT | /api/v1/settings | Sozlamalarni yangilash |
| GET | /api/v1/settings/branches | Filiallar ro'yxati |
| POST | /api/v1/settings/branches | Filial yaratish |
| PUT | /api/v1/settings/branches/{id} | Filial tahrirlash |
| DELETE | /api/v1/settings/branches/{id} | Filial o'chirish |
| POST | /api/v1/settings/logo | Logo yuklash |
| GET | /api/v1/settings/printers | Printer sozlamalari |
| PUT | /api/v1/settings/printers | Printer sozlash |

## 4.18. Bildirishnoma API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/notifications | Bildirishnomalar ro'yxati (?unread) |
| PATCH | /api/v1/notifications/{id}/read | O'qilgan deb belgilash |
| PATCH | /api/v1/notifications/read-all | Barchasini o'qilgan qilish |
| GET | /api/v1/notifications/settings | Bildirishnoma sozlamalari |
| PUT | /api/v1/notifications/settings | Sozlamalarni yangilash |

## 4.19. Audit Log API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/audit-logs | Audit loglar (?model, ?action, ?user_id, ?date_from, ?date_to) |
| GET | /api/v1/audit-logs/{id} | Log tafsiloti |
| GET | /api/v1/audit-logs/export | CSV eksport |

## 4.20. Telegram Mini App API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| POST | /api/v1/tg/auth | Telegram InitData orqali autentifikatsiya |
| GET | /api/v1/tg/menu | Menyu ko'rish (kategoriyalar + taomlar) |
| GET | /api/v1/tg/menu/{id} | Taom tafsiloti (modifikatorlar, qo'shimchalar) |
| POST | /api/v1/tg/orders | Buyurtma yaratish |
| GET | /api/v1/tg/orders | Mening buyurtmalarim |
| GET | /api/v1/tg/orders/{id} | Buyurtma holati |
| POST | /api/v1/tg/orders/{id}/reorder | Qayta buyurtma |
| POST | /api/v1/tg/orders/{id}/pay/click | Click orqali to'lov |
| POST | /api/v1/tg/orders/{id}/pay/payme | Payme orqali to'lov |
| GET | /api/v1/tg/loyalty | Mening ballarim |
| POST | /api/v1/tg/promo/validate | Promo-kod tekshirish |
| GET | /api/v1/tg/favorites | Sevimli taomlar |
| POST | /api/v1/tg/favorites/{menu_item_id} | Sevimliga qo'shish |
| DELETE | /api/v1/tg/favorites/{menu_item_id} | Sevimlilardan o'chirish |
| GET | /api/v1/tg/profile | Mijoz profili |
| PUT | /api/v1/tg/profile | Profilni tahrirlash |

## 4.21. Kurier Telegram API

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | /api/v1/tg/courier/orders | Mening yetkazishlarim |
| GET | /api/v1/tg/courier/orders/{id} | Yetkazish tafsiloti |
| PATCH | /api/v1/tg/courier/orders/{id}/status | Status yangilash (picked_up, delivering, delivered) |
| PATCH | /api/v1/tg/courier/status | Online/offline holat |

## 4.22. To'lov callback API (Webhook)

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| POST | /api/v1/webhooks/click/prepare | Click prepare so'rovi |
| POST | /api/v1/webhooks/click/complete | Click complete so'rovi |
| POST | /api/v1/webhooks/payme | Payme callback |

**To'lov xatolik holatlari**:
- Callback kelmasa (timeout 5 daqiqa): to'lov `pending` holatda qoladi, admin qo'lda tekshiradi
- Callback muvaffaqiyatsiz: to'lov `failed` holatiga o'tadi, mijozga xabar yuboriladi
- Dublikat callback: `transaction_id` orqali tekshiriladi, qayta ishlanmaydi (idempotent)

## 4.23. WebSocket kanallar

| Kanal | Ma'lumot | Kimga | Autorizatsiya |
|-------|----------|-------|---------------|
| orders.{company_id}.{branch_id} | Buyurtma yangiliklari | Menejer, Kassir | company_id + branch_id tekshiriladi |
| kitchen.{company_id}.{branch_id} | Oshxona buyurtmalari | Oshpaz | company_id + branch_id tekshiriladi |
| waiter.{user_id} | Shaxsiy bildirishnomalar | Ofitsiant | user_id = auth user |
| tables.{company_id}.{branch_id} | Stol holati | Barcha xodimlar | company_id tekshiriladi |
| customer.{customer_id} | Buyurtma holati | Mijoz (Telegram) | customer_id = auth customer |
| notifications.{user_id} | Bildirishnomalar | Barcha foydalanuvchilar | user_id = auth user |

**WebSocket autorizatsiya**: Har bir kanal obunasida Laravel Broadcasting authorization callback orqali foydalanuvchi huquqlari tekshiriladi. Boshqa kompaniya kanalini tinglash imkonsiz.

---

# 5. XAVFSIZLIK TALABLARI

## 5.1. Transport xavfsizligi

- Barcha trafikda **HTTPS majburiy** — HTTP so'rovlar avtomatik HTTPS ga yo'naltiriladi
- TLS 1.2+ (TLS 1.3 tavsiya etiladi)
- HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- WebSocket ulanishlar faqat WSS (encrypted) orqali

## 5.2. Autentifikatsiya xavfsizligi

- Parol talablari: **kamida 8 belgi**, kamida 1 katta harf, 1 kichik harf, 1 raqam
- Parollar **bcrypt** (cost factor: 12) bilan xeshlanadi
- Login urinish limiti: **5 ta muvaffaqiyatsiz urinish** → 15 daqiqa bloklash (IP + email bo'yicha)
- Session/token timeout: **24 soat** (faoliyatsiz 2 soatdan keyin qayta login)
- Parol tiklash tokenlar: **15 daqiqa** amal muddati
- Parol tiklash kunlik limiti: **5 ta so'rov** (email bo'yicha)

## 5.3. Avtorizatsiya

- Role-Based Access Control (RBAC) — har bir endpoint uchun ruxsat etilgan rollar ro'yxati
- `company_id` izolyatsiya: middleware orqali har bir so'rovda avtomatik tekshiriladi
- Super Admin endpoint'lari alohida middleware bilan himoyalanadi
- Ofitsiant boshqa filial ma'lumotlariga kira olmaydi (branch-level isolation)

## 5.4. OWASP Top 10 himoyasi

| Xavf | Himoya |
|------|--------|
| SQL Injection | Laravel Eloquent ORM (parameterized queries). Raw query ishlatilganda binding majburiy |
| XSS | React avtomatik escaping + CSP header |
| CSRF | Laravel CSRF token (SPA da Sanctum cookies orqali) |
| SSRF | Faqat ruxsat etilgan domenlar ro'yxatiga so'rov (allowlist) |
| Broken Access Control | Middleware + Policy class har bir modelga |
| Security Misconfiguration | Production da debug=false, .env ommaviy emas |
| Injection (NoSQL/OS) | Barcha input sanitize + validation |

## 5.5. Rate Limiting

| Endpoint turi | Limit | Izoh |
|---------------|-------|------|
| Auth (login, reset) | 10 so'rov / daqiqa | Brute force himoyasi |
| API (umumiy) | 120 so'rov / daqiqa | Per user |
| API (Super Admin) | 300 so'rov / daqiqa | Ko'proq operatsiya kerak |
| Telegram webhook | 200 so'rov / daqiqa | Per company bot |
| To'lov webhook | 60 so'rov / daqiqa | Per provider |
| Fayl yuklash | 10 so'rov / daqiqa | Per user |

Rate limit oshganda: `429 Too Many Requests` + `Retry-After` header

## 5.6. CORS siyosati

- `Access-Control-Allow-Origin`: faqat ruxsat etilgan domenlar
  - `*.kitchens.uz`
  - Telegram Mini App domenlari
  - Development: `localhost:3000`
- `Access-Control-Allow-Credentials: true` (SPA cookies uchun)
- `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`
- `Access-Control-Max-Age: 86400` (1 kun preflight cache)

## 5.7. Fayl yuklash xavfsizligi

- **Ruxsat etilgan formatlar**: JPG, JPEG, PNG, WEBP (faqat rasmlar)
- **Maksimal hajm**: 5 MB per fayl
- **Rasm qayta ishlash**: yuklangandan keyin avtomatik resize (maks 1200×1200 px) va compress
- **Fayl nomi**: UUID ga o'zgartiriladi (original nom saqlanmaydi)
- **Saqlash joyi**: S3/MinIO — kompaniya slug bo'yicha papkalarga ajratiladi (`{company_slug}/logos/`, `{company_slug}/menu/`)
- **Kirish nazorati**: CDN orqali ommaviy (menyu rasmlari) yoki signed URL (xususiy hujjatlar)
- **Antivirus**: fayl yuklanganda MIME type tekshiruvi (extension spoofing himoyasi)

## 5.8. Ma'lumotlar himoyasi

- Maxfiy ma'lumotlar (API kalitlar, bot tokenlar) **encrypted** saqlanadi (Laravel `encryptString`)
- To'lov karta raqamlari **serverda saqlanMAYDI** — faqat to'lov provayderlari orqali
- Personal data (telefon, email) loglanMAYDI — audit logda faqat ID saqlanadi
- Backup'lar shifrlangan holda saqlanadi (AES-256)

## 5.9. Bot token xavfsizligi

- Telegram bot tokenlar `encrypted` holda DB da saqlanadi
- Bot token faqat server-side ishlatiladi, frontend ga uzatilMAYDI
- Har bir kompaniyaning bot tokeni alohida — bitta buzilsa boshqalarga ta'sir qilmaydi
- Token o'zgartirganda eski webhook avtomatik o'chiriladi

---

# 6. NON-FUNCTIONAL TALABLAR

## 6.1. Performance talablari

| Ko'rsatkich | Maqsad | Izoh |
|-------------|--------|------|
| API javob vaqti (p95) | < 300ms | CRUD operatsiyalar |
| API javob vaqti (p99) | < 1s | Murakkab hisobotlar |
| WebSocket xabar yetkazish | < 500ms | Buyurtma yangiliklari |
| Sahifa yuklash (FCP) | < 2s | Birinchi mazmun ko'rish |
| Bir vaqtda foydalanuvchilar | 500 | Platforma bo'ylab |
| Bir kompaniyada bir vaqtda | 50 | Xodimlar + mijozlar |
| DB so'rov (slow query) | < 500ms | Bundan oshgani loglanadi va tekshiriladi |

## 6.2. Kengayuvchanlik (Scalability)

- Horizontal scaling: Laravel stateless — bir nechta app server ishlatish mumkin
- Redis: session va cache uchun shared Redis cluster
- DB: read replicas (hisobotlar uchun)
- Queue: Laravel Queue (Redis) — og'ir ishlar (hisobot generatsiya, email yuborish) asinxron
- Fayl saqlash: S3 — cheksiz sig'im

## 6.3. Ishonchlilik (Reliability)

| Ko'rsatkich | Maqsad |
|-------------|--------|
| Uptime SLA | 99.5% (oylik) = maks 3.6 soat downtime/oy |
| Planned maintenance window | Haftada 1 marta, 02:00-04:00 (tunda) |
| RTO (Recovery Time Objective) | 4 soat — tiklash vaqti |
| RPO (Recovery Point Objective) | 1 soat — maks ma'lumot yo'qotish |

## 6.4. Backup va Disaster Recovery

- **DB backup**: Har 1 soatda avtomatik (pg_dump) → S3 ga shifrlangan holda
- **Saqlash muddati**: Oxirgi 7 kun — har soatlik, oxirgi 30 kun — kunlik, oxirgi 12 oy — haftalik
- **Point-in-time recovery**: PostgreSQL WAL arxivlash orqali
- **Fayl backup**: S3 versioning yoqilgan (o'chirilgan fayllarni tiklash mumkin)
- **Disaster recovery tartibi**:
  1. DB ni oxirgi backup dan tiklash
  2. App serverni qayta deploy qilish (Docker image dan)
  3. Redis cache avtomatik qayta to'ldiriladi
  4. DNS failover (agar server almashtirish kerak bo'lsa)
- **Backup testi**: Oyda 1 marta backup dan tiklash sinovi

## 6.5. Ma'lumotlar saqlash muddati (Data Retention)

| Ma'lumot | Saqlash muddati | Keyin nima bo'ladi |
|----------|------------------|--------------------|
| Buyurtmalar | 3 yil | Arxivlanadi (cold storage) |
| To'lov ma'lumotlari | 5 yil | Soliq qonunchiligi talabi |
| Audit loglar | 1 yil | Arxivlanadi (S3) |
| Bildirishnomalar | 90 kun | O'chiriladi |
| Offline sync ma'lumotlar | 7 kun | O'chiriladi (sinxronlangandan keyin) |
| Foydalanuvchi sessiyalari | 24 soat faoliyatsiz | Avtomatik bekor |
| Parol tiklash kodlar | 15 daqiqa | O'chiriladi |
| Bloklangan kompaniya ma'lumotlari | 6 oy | Admin ogohlantiriladi, keyin o'chiriladi |

## 6.6. Qonunchilik talablari (O'zbekiston)

- O'zbekiston Respublikasi "Shaxsga doir ma'lumotlar to'g'risida"gi qonuniga muvofiq
- Shaxsiy ma'lumotlar O'zbekiston hududidagi serverlarda saqlanishi kerak (data residency)
- Mijoz o'z ma'lumotlarini ko'rish va o'chirilishini so'rash huquqiga ega
- DGI (Davlat Soliq Inspeksiyasi) integratsiya — 7-bo'limda rejalashtirilgan (4-bosqich)
- Elektron faktura talablari — to'lov uchun qonuniy chek

## 6.7. Monitoring va Alerting

| Kuzatish | Vosita | Alert sharti |
|----------|--------|--------------|
| Xatoliklar (5xx) | Sentry | 5 ta xatolik / 5 daqiqa |
| API javob vaqti | Laravel Telescope | p95 > 1s |
| Disk to'lishi | Server monitoring | > 80% |
| DB connection pool | PostgreSQL monitoring | > 80% |
| Queue backlog | Redis monitoring | > 1000 ta pending job |
| SSL sertifikat muddati | Cron check | 14 kun qolganda |
| To'lov xatoliklari | Custom alert | 3+ ta ketma-ket failed |

---

# 7. RIVOJLANTIRISH BOSQICHLARI

## 7.1. MVP — 1-bosqich (8–10 hafta)

Maqsad: Multi-tenant asosiy funksiyalar

1. Multi-tenant arxitektura: companies jadvali, company_id, Global Scope
2. Tarif tizimi: plans, subscriptions, cheklovlar nazorati
3. Super Admin: kompaniya CRUD, tarif tayinlash, admin tayinlash
4. Dinamik branding: logo, rang (CSS variables)
5. Subdomen tizimi
6. Auth: login (subdomen/kompaniya tanlash), parol tiklash, RBAC
7. Menyu: CRUD, porsiya + kg sotish, kategoriyalar, modifikatorlar, qo'shimchalar
8. Stollar: ro'yxat, holat, QR-kod
9. Buyurtma: yaratish (darhol oshxonaga), bekor qilish, chegirma, split bill
10. Oshxona KDS: real-time buyurtmalar
11. Kassa: to'lov, chek, smena boshqaruvi (kompaniya branding bilan)
12. Dashboard: asosiy KPI

## 7.2. 2-bosqich (4–6 hafta)

Maqsad: Ombor, moliya, xodimlar

1. Omborxona: kirim-chiqim (retseptsiz), ogohlantirish
2. Yetkazib beruvchilar
3. Filiallar arasi transfer
4. Moliyaviy hisobotlar: kunlik/haftalik/oylik P&L, eksport (PDF/XLSX)
5. Xarajatlar boshqaruvi
6. Xodimlar: profil, smenalar, reyting, taklif tizimi
7. Bildirishnomalar tizimi (Web Push + Email)
8. Promo-kod tizimi

## 7.3. 3-bosqich (4–6 hafta)

Maqsad: Telegram va yetkazish

1. Telegram Bot (har bir kompaniyaga alohida)
2. Telegram Mini App: menyu (porsiya + kg), buyurtma, to'lov
3. To'lov: Click, Payme (webhook integration)
4. Obuna to'lov: tarif yangilash, onlayn to'lov, faktura
5. Yetkazish: kurier + taksi
6. Doimiy kurierlar va Telegram kurier interfeysi
7. Mijoz profili, buyurtma tarixi, qayta buyurtma, sevimlilar
8. Sodiqlik dasturi (ball to'plash va sarflash)
9. Offline rejim (PWA + Service Worker)

## 7.4. 4-bosqich (2–4 hafta)

Maqsad: Optimallashtirish va qo'shimcha

1. Super Admin kengaytirilgan analitika
2. DGI soliq integratsiya (tafsilotlar quyida)
3. Performance va load testing (bo'lim 6.1 maqsadlariga erishish)
4. Foydalanuvchi qo'llanmasi (UZ/RU)
5. Combo/Set menyu
6. Printer server dasturi (Windows/Linux)
7. Xavfsizlik auditi (OWASP talablariga muvofiqlik)

### 7.4.1. DGI soliq integratsiya tafsilotlari

O'zbekiston Davlat Soliq Inspeksiyasi (DGI) bilan integratsiya:

- **Fiskal chek**: Har bir to'lov uchun DGI fiskal chek yuborish (online-kassa talabi)
- **API**: DGI OFD (Operator Fiskal Ma'lumot) API orqali chek ro'yxatga olish
- **Ma'lumotlar**: Kompaniya INN, buyurtma tarkibi, summa, to'lov usuli, sana/vaqt
- **QR kod**: DGI fiskal QR kod chekda ko'rsatiladi (tekshirish uchun)
- **Hisobot**: Kunlik va oylik soliq hisoboti avtomatik generatsiya
- **Offline**: Internet bo'lmaganda cheklar mahalliy saqlanadi, qayta ulanganda DGI ga yuboriladi
- **Kompaniya sozlamalari**: INN, OFD kaliti, fiskal modul raqami

| Maydon | Turi | Izoh |
|--------|------|------|
| id | BIGINT | Avtomatik ID |
| company_id | FK | Kompaniya |
| order_id | FK | Buyurtma |
| payment_id | FK | To'lov |
| fiscal_id | VARCHAR | DGI fiskal ID |
| fiscal_qr | TEXT | QR kod ma'lumoti |
| status | ENUM | pending / sent / confirmed / failed |
| sent_at | TIMESTAMP | DGI ga yuborilgan vaqt |
| confirmed_at | TIMESTAMP | DGI tasdiqlagan vaqt |
| error_message | TEXT | Xatolik (agar failed) |

---

HUJJAT OXIRI
Kitchens.uz TZ v1.6 — Multi-Tenant SaaS — 2026-yil aprel
O'zgarishlar [YANGI] va [O'CHIRILDI] belgilari bilan ko'rsatilgan
