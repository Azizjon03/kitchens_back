# UI review — Telegram Mini App menyusi (`frontend/src/pages/tg/TgMenuPage.tsx`)

URL: `http://localhost:3001/tg?company=qa-172934&dev_id=12345` · rol: Telegram mijoz (APP_DEBUG dev bypass)

## Raund 1 — 2026-10-31 — 8.2 / 10 (UI)

Vizual: tekshirildi (1440, 768, 375 — asosiy 375) — `.playwright-mcp/ui-tg-menu-375.png`, `ui-tg-menu-cart-375.png`, `ui-tg-menu-768.png`, `ui-tg-menu-1440.png`, `ui-tg-menu-error-375.png`
Lint: `ui-lint: 0 xato, 1 ogohlantirish (1 fayl)` — K5 `:10` `Intl.NumberFormat('uz-UZ')` (kanonik shakl, ayirilmadi)

| # | Mezon | Ball | Izoh |
| --- | --- | --- | --- |
| 1 | Ma'lumot ierarxiyasi | 1.8 / 2.0 | Menyu, narx va pastki savat paneli (soni + jami) — to'g'ri; vaznli taomda minimal vazn ko'rsatilmaydi — "+" 0.2 kg qo'shadi (40 000), mijoz buni bilmaydi (kichik) |
| 2 | Ro'yxat, filter, qidiruv, pagination | 1.35 / 1.5 | Sticky kategoriya pill'lari, brend rangi — to'g'ri; menyu umuman bo'sh bo'lsa ham "Bu kategoriyada taom yo'q" (kichik) |
| 3 | Holatlar | 1.35 / 1.5 | Spinner, xato + `tgErrorMessage` + "Qayta urinish" — bor (noma'lum slug bilan tekshirildi); xato `bg-red-50` blok emas, 404 da ham "Qayta urinish" (kichik) |
| 4 | Dizayn tizimiga rioya | 0.975 / 1.5 | Nofaol pill `style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}` — brend rangidan boshqa hex (o'rta); spinner va "Qayta urinish" `amber-500`, kompaniya brend rangi emas (kichik) |
| 5 | Formalar | N/A | Forma yo'q |
| 6 | Accessibility va ergonomika | 0.5 / 1.0 | Narx matni brend rangida oq fonda: `rgb(245,158,11)` 14px — 2.15:1 (o'rta, sahifaga xos matn rangi); kategoriya pill'i 28px balandlik < 44px (o'rta) |
| 7 | Vizual estetika va izchillik | 0.9 / 1.0 | 375 da muvozanatli; xato ekrani oq fon, menyu `bg-gray-50` (kichik) |
| 8 | Matn va til | 0.5 / 0.5 | Hamma matn o'zbekcha |

Hisob: 7.375 / 9.0 → **8.2**

### Talablar (ustuvorlik bo'yicha)

1. **[6, o'rta]** `frontend/src/pages/tg/TgMenuPage.tsx:108` — narx `style={{ color: primary }}` (standart `#F59E0B`) oq kartada 2.15:1, `text-sm font-semibold`.
   **Qabul talabi:** narx matni ≥ 4.5:1 — `text-gray-900` (brend rangi faqat tugma/aksentda) yoki brend rangidan hisoblangan to'qroq soya; standart `#F59E0B` bilan o'lchanganda ≥ 4.5:1 (ui-foundations §7).
2. **[6, o'rta]** `frontend/src/pages/tg/TgMenuPage.tsx:86` — kategoriya pill'i `px-3 py-1.5 text-xs`, o'lchangan balandlik 28px.
   **Qabul talabi:** pill bosish zonasi ≥ 44px balandlik (`min-h-11` yoki `py-2.5` + `text-sm`); 375 skrinshotida tekshiriladi (ui-foundations §7 TG qatori).
3. **[4, o'rta]** `frontend/src/pages/tg/TgMenuPage.tsx:90` — nofaol pill uchun qattiq hex (`#f3f4f6`, `#4b5563`); hex faqat kompaniya brend rangi uchun ruxsat (ui-foundations §3).
   **Qabul talabi:** nofaol holat `className="bg-gray-100 text-gray-600"`, `style` faqat faol (brend) holatda.
4. **[1, kichik]** `frontend/src/pages/tg/TgMenuPage.tsx:108-111` — vaznli taomda faqat `/kg` narx; `min_weight` ko'rsatilmaydi, "+" bosilganda 0.2 kg qo'shiladi.
   **Qabul talabi:** vaznli taom kartasida "kamida 0.2 kg" (yoki `min_weight` qiymati) `text-xs text-gray-500` bilan ko'rinadi.
5. **[3, kichik]** `frontend/src/pages/tg/TgMenuPage.tsx:55-68` — xato oddiy kulrang matn, "restoran topilmadi"da ham "Qayta urinish".
   **Qabul talabi:** xato `bg-red-50 text-red-600` blokda (ikonka bilan); `COMPANY_NOT_FOUND`/nofaol kompaniya kodida "Qayta urinish" o'rniga faqat izoh (ui-foundations §5).
6. **[4, kichik]** `frontend/src/pages/tg/TgMenuPage.tsx:50, 63` — spinner va xato tugmasi `amber-500`.
   **Qabul talabi:** ma'lumot kelgandan keyingi elementlar `primary` bilan; ma'lumotdan oldingi holatlar neytral (`border-gray-300` spinner) — brend rangi boshqa kompaniyada "sakramaydi".
7. **[2, kichik]** `frontend/src/pages/tg/TgMenuPage.tsx:123-125` — kategoriya yo'q (menyu bo'sh) holatida ham "Bu kategoriyada taom yo'q".
   **Qabul talabi:** `categories.length === 0` da alohida "Menyu hozircha bo'sh" (ikonka bilan).
8. **[7, kichik]** `frontend/src/pages/tg/TgMenuPage.tsx:58` — xato ekrani foni oq, asosiy ekran `bg-gray-50`.
   **Qabul talabi:** xato/yuklanish ekranlari `min-h-screen bg-gray-50`.

### Tavsiya (ball ayirilmagan — "Hozirgi holat")

- "+" tugmasi 36×36px (ui-foundations §7 hozirgi holat) — 44px ga.
- Tizimli: oq matn brend `#F59E0B` ustida (sarlavha, "+", savat paneli) — 2.15:1; kompaniya `primary_color` ochiq bo'lsa matn rangini avtomatik tanlash (qora/oq) tavsiya etiladi.
- Chromium'da `uz-UZ` "45,000 so'm" (vergul) — `lib/format.ts` paydo bo'lganda qat'iy ajratgich.
- Desktop (768/1440) Mini App uchun asosiy emas; karta va savat paneli to'liq kenglikka cho'ziladi — `max-w-md mx-auto` konteyner ixtiyoriy.

### Oldingi raund talablari

- yo'q (1-raund)

### Tekshirilmadi

- Real Telegram WebView (initData, `tgInit` tema/BackButton) — dev bypass ishlatildi.
- Savat sahifasiga o'tish va buyurtma berish — boshqa sahifa / ma'lumot yaratish; savatga qo'shish faqat lokal (`localStorage`, keyin tozalandi).
- Bir nechta kategoriya va tavsifli taom — QA menyusida bitta kategoriya, tavsif yo'q.
