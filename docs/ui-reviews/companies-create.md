# UI review — Kompaniya yaratish modali (`frontend/src/pages/CompaniesPage.tsx`)

URL: `http://localhost:3001/companies` → "Yangi kompaniya" · rol: super_admin

## Raund 1 — 2026-10-31 — 9.8 / 10 (UI)

Vizual: tekshirildi (1440, 768) — `.playwright-mcp/ui-companies-create-1440.png`, `ui-companies-create-768.png`
Lint: `ui-lint: 0 xato, 0 ogohlantirish (6 fayl)`
Faqat yaratish modali (yangi "Restoran turi" radio-kartalari). Forma yuborilmadi.

| # | Mezon | Ball | Izoh |
| --- | --- | --- | --- |
| 1 | Ma'lumot ierarxiyasi | 2.0 / 2.0 | 5 ta karta, har birida nima qo'shilishi aniq yozilgan; "Bo'sh menyu" va "keyin keraksizini o'chirasiz" — birinchi marta ko'rgan odam ham tanlay oladi; standart "Oshxona" |
| 2 | Ro'yxat, filter, qidiruv, pagination | N/A | Faqat modal |
| 3 | Holatlar | 1.5 / 1.5 | `menu_template` server xatosi maydon ostida (`:199-201`), umumiy xato bloki bor (koddan; yuborilmadi) |
| 4 | Dizayn tizimiga rioya | 1.5 / 1.5 | Tanlangan karta `border-amber-500 bg-amber-50`, lint toza |
| 5 | Formalar | 0.9 / 1.0 | `fieldset`/`legend`, `htmlFor`, klaviatura (strelka bilan tanlash ishlaydi, fokus halqasi ko'rinadi). Parolda ko'rsatish tugmasi hamon yo'q (kichik, companies.md 1-raund #10) |
| 6 | Accessibility va ergonomika | 1.0 / 1.0 | Kartalar 62px balandlik, matn kontrasti (`text-gray-600`) yetarli |
| 7 | Vizual estetika va izchillik | 1.0 / 1.0 | CatalogPage taom formasidagi radio-karta naqshi bilan bir xil |
| 8 | Matn va til | 0.4 / 0.5 | "Egasi (Owner)" (kichik, companies.md 1-raund #9); "Slug" izohsiz (kichik) |

Hisob: 8.3 / 8.5 × 10 = 9.76 → **9.8**

### Talablar (ustuvorlik bo'yicha)

1. **[8, kichik]** `frontend/src/pages/CompaniesPage.tsx:205` — "Egasi (Owner)".
   **Qabul talabi:** "Korxona rahbari (admin)" (ui-foundations §6).
2. **[8, kichik]** `frontend/src/pages/CompaniesPage.tsx:136` — "Slug" atamasi izohsiz.
   **Qabul talabi:** label ostida `text-xs text-gray-500`: "Telegram havolasida ishlatiladi, faqat lotin harf va chiziqcha".
3. **[5, kichik]** parol maydoni — `Eye`/`EyeOff` tugmasi `aria-label="Parolni ko'rsatish"` bilan (ui-forms §2).

### Tavsiya (ball ayirilmagan — "Hozirgi holat")

- Modal `Escape` bilan yopilmaydi (eski modal, tizimli).
- Bo'sh yuborishda brauzerning inglizcha "Please fill out this field." xabari (tizimli).
- #25: Kompaniyalar sahifasining o'zida `PageGuide` yo'q — super admin uchun ham "yangi korxona qanday ochiladi" 3 qadamlik yo'riqnoma foydali.
- "Hammasi" nomi CatalogPage badge'ida noaniq o'qiladi (catalog.md #2) — ikkala joyda "To'liq menyu" deb birxillashtirilsa yaxshi.

### Oldingi raund talablari

- yo'q (bu modal uchun 1-raund; umumiy sahifa — companies.md)

### Tekshirilmadi

- Server xatosi (takroriy slug) — forma yuborilmadi (taqiq: yaratish).
