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

## Raund 2 — 2026-10-31 — 9.6 / 10 (UI)

Vizual: tekshirildi (1440, 768, 375 — asosiy 375) — `.playwright-mcp/ui-tg-menu-r2-375.png`, `ui-tg-menu-r2-cart-375.png`, `ui-tg-menu-r2-768.png`, `ui-tg-menu-r2-1440.png`, `ui-tg-menu-r2-loading-375.png`, `ui-tg-menu-r2-error-375.png`, `ui-tg-menu-r2-notfound-375.png`, `ui-tg-menu-r2-empty-375.png`
Lint: `ui-lint: 0 xato, 2 ogohlantirish (4 fayl)` — K5 `TgMenuPage.tsx:10` `Intl.NumberFormat('uz-UZ')` (kanonik shakl, ayirilmadi)

Simulyatsiya (`page.route`, faqat brauzerda): 500 (Laravel prod javobi `{"message":"Server Error"}`), 2.5 s kechikish, bo'sh menyu, `min_weight: null` vaznli taom. Savatga qo'shish faqat `localStorage`, keyin tozalandi.

| # | Mezon | Ball | Izoh |
| --- | --- | --- | --- |
| 1 | Ma'lumot ierarxiyasi | 1.8 / 2.0 | "kamida 0.2 kg" ko'rinadi. `min_weight` bo'sh taomda karta "kamida 0.1 kg" deydi, "+" esa 0.3 kg qo'shadi (savat 30 000 so'm 100 000/kg da) — tekshirildi (kichik) |
| 2 | Ro'yxat, filter, qidiruv, pagination | 1.5 / 1.5 | Pill 44px, sticky; "Menyu hozircha bo'sh" ikonka bilan |
| 3 | Holatlar | 1.5 / 1.5 | Neytral spinner `bg-gray-50`; xato `bg-red-50` blok + ikonka; `COMPANY_NOT_FOUND` da "Qayta urinish" yo'q, 500 da bor |
| 4 | Dizayn tizimiga rioya | 1.5 / 1.5 | Nofaol pill `bg-gray-100 text-gray-700`, `style` faqat faol holatda; spinner/xato tugmasi neytral |
| 5 | Formalar | N/A | Forma yo'q |
| 6 | Accessibility va ergonomika | 1.0 / 1.0 | Narx `text-gray-900` 16px; pill 44px, "+" 44×44, savat paneli 48px; 375 da gorizontal scroll yo'q |
| 7 | Vizual estetika va izchillik | 1.0 / 1.0 | Xato/yuklanish/menyu ekranlari bir xil `bg-gray-50` |
| 8 | Matn va til | 0.375 / 0.5 | Server 500 da xato blokida inglizcha "Server Error" (o'rta) |

Hisob: 8.675 / 9.0 → **9.6**

### Talablar (ustuvorlik bo'yicha)

1. **[8, o'rta]** `frontend/src/lib/tgApi.ts:83-99` (`TgMenuPage.tsx:58`) — `tgErrorMessage` 5xx javobda `data.message` ni to'g'ridan-to'g'ri qaytaradi; Laravel prod 500 (`{"message":"Server Error"}`) da mijoz inglizcha "Server Error" ko'radi (`ui-tg-menu-r2-error-375.png`). Xodim tomoni `lib/apiError.ts:31-33` 5xx ni allaqachon o'zbekchaga almashtiradi.
   **Qabul talabi:** `status >= 500` da "Serverda xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring." (yoki `fallback`); 500 simulyatsiyasida ekranda inglizcha matn yo'q (ui-foundations §6).
2. **[1, kichik]** `frontend/src/pages/tg/TgMenuPage.tsx:124` vs `frontend/src/lib/tgCart.ts:104` — `min_weight` bo'sh bo'lsa karta "kamida 0.1 kg", savatga 0.3 kg qo'shiladi.
   **Qabul talabi:** bitta manba (masalan `tgCart` dan eksport qilingan `defaultWeight(item)`); kartadagi "kamida X kg" "+" bosilganda qo'shiladigan vazn bilan bir xil.

### Tavsiya (ball ayirilmagan — "Hozirgi holat")

- Tizimli: oq matn brend `#F59E0B` ustida (sarlavha, faol pill, "+", savat paneli) — 2.15:1; ochiq `primary_color` uchun matn rangini avtomatik tanlash.
- Desktop (768/1440) da karta va savat paneli to'liq kenglikka cho'ziladi (`ui-tg-menu-r2-1440.png`) — `max-w-md mx-auto` ixtiyoriy.
- Kategoriya tugmalari `rounded-lg` — ui-data-table §6 "pill" deydi; `rounded-full` ixtiyoriy.
- Chromium'da `uz-UZ` "45,000 so'm" (vergul) — `lib/format.ts` paydo bo'lganda qat'iy ajratgich.

### Oldingi raund talablari

- 1-raund #1 (narx kontrasti) — bajarildi (`:118`; `text-gray-900` 16px, o'lchandi `oklch(0.21 …)`)
- 1-raund #2 (pill ≥ 44px) — bajarildi (`:96` `min-h-11`; o'lchandi 44px)
- 1-raund #3 (nofaol pill hex) — bajarildi (`:96-100`; `bg-gray-100 text-gray-700`, `style` faqat faolda)
- 1-raund #4 (minimal vazn) — bajarildi (`:122-126`; "kamida 0.2 kg"); `min_weight` bo'sh holatdagi nomuvofiqlik — yangi #2
- 1-raund #5 (qizil xato bloki, NOT_FOUND da retry yo'q) — bajarildi (`:57-78`; noma'lum slug → "Bunday restoran topilmadi…", "Qayta urinish" 0 ta; 500 da 1 ta)
- 1-raund #6 (neytral spinner) — bajarildi (`:50-53` `border-gray-300`; retry `bg-gray-900`)
- 1-raund #7 (bo'sh menyu holati) — bajarildi (`:138-142`; "Menyu hozircha bo'sh" + `UtensilsCrossed`, `ui-tg-menu-r2-empty-375.png`)
- 1-raund #8 (xato ekrani foni) — bajarildi (`:50, :63` `bg-gray-50`)
- 1-raund tavsiya ("+" 36px) — bajarildi (`:130` 44×44)

### Tekshirilmadi

- Real Telegram WebView (initData, tema, BackButton) — dev bypass.
- Savat sahifasi va buyurtma berish — boshqa sahifa / ma'lumot yaratish.
- Bir nechta kategoriya va tavsifli taom — QA menyusida bitta kategoriya, tavsif yo'q.
