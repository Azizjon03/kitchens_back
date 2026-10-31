# UI review — Ofitsiant (`frontend/src/pages/WaiterPage.tsx`)

URL: `http://localhost:3001/waiter` · rol: waiter

## Raund 1 — 2026-10-31 — 6.4 / 10 (UI)

Vizual: tekshirildi (1440, 768, 375) — `.playwright-mcp/ui-waiter-1440.png`, `ui-waiter-768.png`, `ui-waiter-375.png`, `ui-waiter-composer-768.png`, `ui-waiter-composer-cart-768.png`, `ui-waiter-composer-375.png`, `ui-waiter-error-768.png`
Lint: `ui-lint: 0 xato, 1 ogohlantirish (1 fayl)` — K5 `:11` `Intl.NumberFormat('uz-UZ')` (kanonik shakl, ayirilmadi)

| # | Mezon | Ball | Izoh |
| --- | --- | --- | --- |
| 1 | Ma'lumot ierarxiyasi | 1.8 / 2.0 | Stollar birinchi — to'g'ri; buyurtma kartasida faqat `#ID`, holat, summa — tur/taomlar/vaqt yo'q, olib ketish `#2` nimaligi noma'lum (kichik) |
| 2 | Ro'yxat, filter, qidiruv, pagination | 0.6 / 1.5 | `/orders` har holat bo'yicha faqat 1-sahifa (20) — 20+ da eski buyurtmalar yo'qoladi (jiddiy); "Stollar yo'q" kartasiz `text-gray-400` (kichik) |
| 3 | Holatlar | 0.0 / 1.5 | 500 da "Stollar yo'q" + "Faol buyurtmalar yo'q" (jiddiy, tasdiqlandi); yuklanish holati yo'q (o'rta); "Berildi" xatosi jim (o'rta). Yaratish modali xatosi — server matni bilan, yaxshi |
| 4 | Dizayn tizimiga rioya | 1.2 / 1.5 | Holat badge'i `-50` fon va `served` kulrang — kanonik STATUS_MAP emas (kichik); miqdor inputi `inputClass` emas, qo'shimcha tanlovi `bg-green-500` (kichik) |
| 5 | Formalar | 0.9 / 1.0 | Vazn inputi `w-24` ishlamaydi (inputClass `w-full`) — to'liq kenglikka cho'zilgan, miqdor/vazn inputlarida nom yo'q (kichik). `isPending`, server xabari, vazn `min`/`step` — bor |
| 6 | Accessibility va ergonomika | 0.65 / 1.0 | Planshetda bosish zonalari < 44px: `+`/`−` 24px, savatdan o'chirish 16px, kategoriya 28px, taom qatori 36px (o'rta); stol holati `text-[10px]` (kichik) |
| 7 | Vizual estetika va izchillik | 0.9 / 1.0 | Cho'zilgan vazn inputi va bo'sh joyli buyurtma kartasi (kichik) |
| 8 | Matn va til | 0.375 / 0.5 | Band stol tile'ida xom `t.status` (`occupied`, `reserved`, `cleaning`, `merged`) (o'rta) |

Hisob: 6.425 / 10.0 → **6.4**

### Talablar (ustuvorlik bo'yicha)

1. **[3, jiddiy]** `frontend/src/pages/WaiterPage.tsx:320-346, 459, 464-467` — `isError` o'qilmaydi; `/tables` va `/orders` 500 qaytarganda "Stollar yo'q" va "Faol buyurtmalar yo'q" (`ui-waiter-error-768.png`).
   **Qabul talabi:** har blokda xato holati `bg-red-50 text-red-600` + "Qayta urinish" (`refetch`); "yo'q" matnlari faqat muvaffaqiyatli bo'sh javobda (ui-foundations §5).
2. **[2, jiddiy]** `frontend/src/pages/WaiterPage.tsx:334-344` + `OrderController.php:49` — `preparing`/`ready`/`served` har biri uchun faqat eng yangi 20 ta; 20+ `ready` bo'lsa eng uzoq kutayotgan tayyor buyurtma ekranda yo'q.
   **Qabul talabi:** barcha faol buyurtmalar yuklanadi (to'liq ro'yxat yoki hamma sahifa), 25 ta `ready` buyurtmada 25 ta karta (ui-data-table §5).
3. **[3, o'rta]** `frontend/src/pages/WaiterPage.tsx:320-346, 438-467` — yuklanish holati yo'q: so'rov tugaguncha "Stollar yo'q"/"Faol buyurtmalar yo'q" ko'rinadi.
   **Qabul talabi:** tile/karta shaklidagi `animate-pulse` skelet yoki spinner (ui-foundations §5).
4. **[3, o'rta]** `frontend/src/pages/WaiterPage.tsx:385-388` — `serveMutation` da `onError` yo'q.
   **Qabul talabi:** "Berildi" rad etilsa kartada server `error.message` (yoki "Holatni o'zgartirib bo'lmadi") ko'rinadi; `isPending` faqat bosilgan kartani bloklaydi (ui-forms §3–§4).
5. **[6, o'rta]** `frontend/src/pages/WaiterPage.tsx:142, 155, 180, 199-224` — o'lchangan balandliklar: kategoriya 28px, taom qatori 36px, `+`/`−` 24px, `X` 16px (planshet, sensor).
   **Qabul talabi:** bu tugmalarning har biri ≥ 44×44px (masalan `min-h-11 min-w-11`); 768 skrinshotida tekshiriladi (ui-foundations §7, ui-forms §5).
6. **[8, o'rta]** `frontend/src/pages/WaiterPage.tsx:455` — band stol holati xom kod bilan (`t.status`).
   **Qabul talabi:** `TABLE_STATUS_LABELS` xaritasi: Bo'sh / Band / Bron / Tozalanmoqda / Birlashtirilgan; ekranda inglizcha kod yo'q (ui-foundations §6).
7. **[1, kichik]** `frontend/src/pages/WaiterPage.tsx:471-486` — kartada tur (olib ketish/yetkazish), vaqt va taomlar yo'q; stolsiz buyurtma faqat `#2`.
   **Qabul talabi:** kartada stol yoki tur yorlig'i ("Olib ketish #2") + yaratilgan vaqt; summa `text-sm font-medium text-gray-900 tabular-nums` (ui-data-table §1 karta tarkibi).
8. **[4, kichik]** `frontend/src/pages/WaiterPage.tsx:474-482` — `bg-*-50` fon, `served` `gray`.
   **Qabul talabi:** `OrdersPage` `STATUS_MAP` ranglari (`-100`/`-700`, `served` purple) — bir holat hamma sahifada bir xil (ui-foundations §3).
9. **[5, kichik]** `frontend/src/pages/WaiterPage.tsx:193, 207-216` — `${inputClass} w-24` da `w-full` ustun, input butun kenglikka cho'ziladi; miqdor inputi alohida klass, ikkalasida accessible nom yo'q.
   **Qabul talabi:** vazn inputi ~96px kenglikda (inputClass'dan `w-full` siz variant), har inputda `aria-label` ("Vazn, kg", "Miqdor") (ui-forms §1–§2).
10. **[6, kichik]** `frontend/src/pages/WaiterPage.tsx:455` — holat matni `text-[10px]`.
    **Qabul talabi:** ≥ `text-xs` (12px).

### Tavsiya (ball ayirilmagan — "Hozirgi holat")

- Tizimli: oq matn `amber-500` ustida ("Buyurtma berish", faol kategoriya) — 2.15:1.
- Ikonka-tugmalarda (`X`, `+`, `−`, ogohlantirishni yopish) `aria-label` yo'q; modal `Escape` bilan yopilmaydi (tekshirildi) — tizimli.
- WS ulanish indikatori yo'q (§5 hozirgi holat).
- Chromium'da `Intl.NumberFormat('uz-UZ')` "45,000 so'm" (vergul) chiqaradi — kanonik shakl, lekin `lib/format.ts` paydo bo'lganda ajratgichni qat'iy belgilash tavsiya etiladi.
- Band stolni bosib, uning buyurtmasini ochish/qo'shish imkoni yo'q (tile `disabled`) — mahsulot qarori, spec bilan solishtirish kerak.

### Oldingi raund talablari

- yo'q (1-raund)

### Tekshirilmadi

- Buyurtma yuborish, "Berildi" bosish, real-time "buyurtma tayyor" ogohlantirishi — taqiqlangan amallar (ma'lumot yaratish / holat o'zgartirish). Savatga taom qo'shish faqat lokal holatda ko'rildi, yuborilmadi.
- Band/bron stol tile'i — QA bazasida faqat bo'sh A1 stoli; xom status koddan.
- Modifikator/qo'shimcha chiplari — QA menyusida yo'q.
