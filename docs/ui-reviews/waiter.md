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

## Raund 2 — 2026-10-31 — 7.9 / 10 (UI)

Vizual: tekshirildi (1440, 768, 375) — `.playwright-mcp/ui-waiter-r2-1440.png`, `ui-waiter-r2-768.png`, `ui-waiter-r2-375.png`, `ui-waiter-r2-composer-768.png`, `ui-waiter-r2-composer-375.png`, `ui-waiter-r2-sim-768.png`, `ui-waiter-r2-serveerror-768.png`, `ui-waiter-r2-loading-768.png`, `ui-waiter-r2-error-768.png`, `ui-waiter-r2-composer-menuerror-768.png`
Lint: `ui-lint: 0 xato, 2 ogohlantirish (4 fayl)` — K5 `WaiterPage.tsx:13` `Intl.NumberFormat('uz-UZ')` (kanonik shakl, ayirilmadi)

Simulyatsiya (faqat brauzerda, `page.route`): stol holatlari va `ready`/`served` buyurtmalar — soxta `/tables`, `/orders`; "Berildi" xatosi — PATCH brauzerda 403 bilan to'xtatildi; composer'da `POST /orders` bloklangan, yuborilmadi; yuklanish/xato — 3 s + 500; menyu xatosi — `/pos/menu` 500.

| # | Mezon | Ball | Izoh |
| --- | --- | --- | --- |
| 1 | Ma'lumot ierarxiyasi | 1.5 / 2.0 | Kartada tur/stol + vaqt + summa — bor. Lekin ro'yxat yangidan eskiga, holat bo'yicha guruhlanmagan: 12 ta `preparing` bilan eng uzoq kutayotgan `ready` "Stol #3" (yagona "Berildi" tugmasi) eng pastda (o'rta) |
| 2 | Ro'yxat, filter, qidiruv, pagination | 1.35 / 1.5 | Barcha 25 faol buyurtma ko'rinadi; "Stollar yo'q" kartasiz `text-gray-400` (kichik) |
| 3 | Holatlar | 0.75 / 1.5 | Stollar/buyurtmalar: yuklanish, xato + "Qayta urinish", "Berildi" xatosi — bor. **Composer menyusi** `/pos/menu` 500 da "Taom yo'q" ko'rsatadi — xato bo'sh menyu bo'lib ko'rinadi (jiddiy) |
| 4 | Dizayn tizimiga rioya | 1.2 / 1.5 | Badge STATUS_MAP bilan bir xil. Tanlangan qo'shimcha `bg-green-700` — palitra rolida yo'q (kichik); xato blokini yopish `✕` matn belgisi (kichik) |
| 5 | Formalar | 1.0 / 1.0 | Vazn inputi 96px, `aria-label` "Vazn, kg"/"Miqdor"; `isPending`, server xabari |
| 6 | Accessibility va ergonomika | 0.8 / 1.0 | Composer'dagi asosiy tugmalar ≥ 44px (o'lchandi: kategoriya 116×44, taom 351×44, ± 44×44, X 44×44, vazn 96×44); stol holati 12px. Yangi xato blokini yopish tugmasi 28×24 px (kichik); modifikator/qo'shimcha chiplari `min-h-10` = 40px (`:247, :265`, koddan) (kichik) |
| 7 | Vizual estetika va izchillik | 0.8 / 1.0 | Stollar yuklanish spinneri grid'ning bitta katagiga siqilib, matn ikki qatorga o'raladi (kichik); tugmasiz kartada pastda ortiqcha bo'sh joy (`mb-3`) (kichik) |
| 8 | Matn va til | 0.5 / 0.5 | Bo'sh / Band / Bron / Tozalanmoqda / Birlashtirilgan; hamma matn o'zbekcha |

Hisob: 7.9 / 10.0 → **7.9**

### Talablar (ustuvorlik bo'yicha)

1. **[3, jiddiy]** `frontend/src/pages/WaiterPage.tsx:44-51, 169-171` — composer'dagi `/pos/menu` so'rovida `isLoading`/`isError` o'qilmaydi; 500 da (tekshirildi) chap ustunda "Taom yo'q", yuklanish paytida ham shunday — ofitsiant menyu bo'sh deb tushunadi.
   **Qabul talabi:** menyu yuklanayotganda `LoadingState`, xatoda `ErrorState` (`onRetry={refetch}`, "Menyuni yuklab bo'lmadi"); "Taom yo'q" faqat muvaffaqiyatli javobda kategoriya bo'sh bo'lsa (ui-foundations §5).
2. **[1, o'rta]** `frontend/src/pages/WaiterPage.tsx:440-443` — `sortedOrders` `created_at` bo'yicha **kamayish** tartibida, holat bo'yicha guruhsiz; `ready` (ofitsiantning yagona amali) `preparing` lar ostida qoladi (`ui-waiter-r2-sim-768.png`: "Stol #3 Tayyor" 15-karta).
   **Qabul talabi:** `ready` buyurtmalar birinchi (eng eskisi tepada), keyin `preparing`, keyin `served`; 12 ta `preparing` + 1 ta `ready` da `ready` karta 768 skrinshotida birinchi qatorda (ui-data-table §1 karta-grid, rubric 1).
3. **[2, kichik]** `frontend/src/pages/WaiterPage.tsx:514` — "Stollar yo'q" oddiy kulrang matn, kartasiz, ikonkasiz.
   **Qabul talabi:** `bg-white rounded-xl border border-gray-200 p-8 text-center` + lucide ikonka (`text-gray-300`) + matn, grid tashqarisida (ui-data-table §7).
4. **[4, kichik]** `frontend/src/pages/WaiterPage.tsx:267` — tanlangan qo'shimcha `bg-green-700` (modifikator `amber-500`); rol skill'da yo'q.
   **Qabul talabi:** qo'shimcha va modifikator tanlovi bir xil palitra rolida (`bg-amber-500`/`amber-50` + `amber-700`) yoki istisno ui-foundations §3 ga yoziladi.
5. **[4, kichik] + [6, kichik]** `frontend/src/pages/WaiterPage.tsx:464` — xato blokini yopish: `✕` matn belgisi, 28×24 px.
   **Qabul talabi:** lucide `<X size={18} />`, `min-h-11 min-w-11` (planshet ≥ 44px).
6. **[7, kichik]** `frontend/src/pages/WaiterPage.tsx:513` — `LoadingState` stollar grid'i ichida (bitta katak), "Stollar yuklanmoqda..." ikki qatorga o'raladi (`ui-waiter-r2-loading-768.png`).
   **Qabul talabi:** yuklanish holati grid tashqarisida to'liq kenglikda yoki tile shaklidagi `animate-pulse` skelet.
7. **[6, kichik]** `frontend/src/pages/WaiterPage.tsx:247, 265` — modifikator va qo'shimcha chiplari `min-h-10` (40px) — planshetda 44px dan past.
   **Qabul talabi:** `min-h-11` (≥ 44px); modifikatorli taom bilan 768 da o'lchanadi (ui-foundations §7).
8. **[7, kichik]** `frontend/src/pages/WaiterPage.tsx:547` — tugmasiz kartada `mb-3` pastda bo'sh joy qoldiradi.
   **Qabul talabi:** `mb-3` faqat "Berildi" tugmasi bo'lganda (yoki tugma `mt-3`), kartaning yuqori/pastki ichki oraliqlari teng.

### Tavsiya (ball ayirilmagan — "Hozirgi holat")

- "Tayyor" ogohlantirishini yopish `X` (`:479-484`) — `aria-label`siz, 16px; composer `Escape` bilan yopilmaydi (tekshirildi) — tizimli.
- Tizimli: oq matn `amber-500` ustida ("Buyurtma berish", "Berildi", faol kategoriya) — 2.15:1.
- WS ulanish indikatori yo'q (§5 hozirgi holat).
- `TYPE_LABELS` KDS bilan farq qiladi ("Zalda" vs "STOL") — umumiy xarita.
- Composer chiziq summasi `text-xs` — ixtiyoriy `text-sm`.

### Oldingi raund talablari

- 1-raund #1 (xato holati) — bajarildi (`:517-521, :527-528`; 500 → ikkala blokda "…yuklab bo'lmadi" + "Qayta urinish", `ui-waiter-r2-error-768.png`)
- 1-raund #2 (barcha faol buyurtmalar) — bajarildi (`:383` `active=1`; 25 ta → 25 karta)
- 1-raund #3 (yuklanish holati) — bajarildi (`:513, :525-526`; "Stollar yuklanmoqda..." / "Buyurtmalar yuklanmoqda..."; joylashuvi — yangi #6)
- 1-raund #4 ("Berildi" xatosi, karta bo'yicha pending) — bajarildi (`:434, :461-466, :554`; brauzerda 403 → "Sizda bu amal uchun ruxsat yo'q", `ui-waiter-r2-serveerror-768.png`)
- 1-raund #5 (≥ 44px) — bajarildi (o'lchandi 768 da: barcha composer tugma/inputlari 44px+, "Buyurtma berish" 48px)
- 1-raund #6 (stol holati o'zbekcha) — bajarildi (`:314-320, :509`; Bo'sh/Band/Bron/Tozalanmoqda/Birlashtirilgan, `ui-waiter-r2-sim-768.png`)
- 1-raund #7 (karta: tur + vaqt) — bajarildi (`:437-438, :547-549`; "Olib ketish #5", "15:15", summa `tabular-nums`)
- 1-raund #8 (STATUS_MAP ranglari) — bajarildi (`:308-312`; `served` purple)
- 1-raund #9 (vazn inputi, `aria-label`) — bajarildi (`:196-204`; 96×44, "Vazn, kg", "Miqdor")
- 1-raund #10 (holat matni ≥ 12px) — bajarildi (`:509` `text-xs`, o'lchandi 12px)

### Tekshirilmadi

- Buyurtma yuborish, "Berildi" haqiqiy bosish, real-time ogohlantirish — taqiqlangan amallar; `POST /orders` brauzerda bloklandi.
- Modifikator/qo'shimcha chiplari — QA menyusida yo'q; ekranda ko'rilmadi, `min-h-10` koddan baholandi (`:247, :265`).

## Raund 3 — 2026-10-31 — 9.5 / 10 (UI)

Vizual: tekshirildi (1440, 768, 375) — `.playwright-mcp/ui-waiter-r3-1440.png`, `ui-waiter-r3-sim-1440.png`, `ui-waiter-r3-sim-768.png`, `ui-waiter-r3-sim-375.png`, `ui-waiter-r3-composer-768.png`, `ui-waiter-r3-composer-375.png`, `ui-waiter-r3-composer-loading-768.png`, `ui-waiter-r3-composer-menuerror-768.png`, `ui-waiter-r3-loading-768.png`, `ui-waiter-r3-empty-768.png`, `ui-waiter-r3-error-768.png`, `ui-waiter-r3-serveerror-768.png`
Lint: `ui-lint: 0 xato, 1 ogohlantirish (2 fayl)` — K5 `WaiterPage.tsx:13` `Intl.NumberFormat('uz-UZ')` (kanonik shakl, ayirilmadi); K7 (`*-500` + oq matn) — topilma yo'q

Simulyatsiya (faqat brauzerda, `page.route`): 6 stol (5 holat) + 12 `preparing` + 1 `served` + 2 `ready` (40 va 20 daq) — soxta `/tables`, `/orders`; composer menyusi (modifikator/qo'shimcha/vaznli taom, bo'sh kategoriya) — soxta `/pos/menu`; menyu yuklanish/xato — 3 s + 500; stollar/buyurtmalar yuklanish (4 s), bo'sh (`[]`), xato (500); "Berildi" xatosi — PATCH brauzerda 403 bilan to'xtatildi; `POST /orders` bloklangan, yuborilmadi. Haqiqiy ma'lumot (1440): 1 stol, 25 `preparing` buyurtma.

| # | Mezon | Ball | Izoh |
| --- | --- | --- | --- |
| 1 | Ma'lumot ierarxiyasi | 2.0 / 2.0 | `ready` birinchi, eng eskisi tepada: 768/375/1440 da 1-karta "Stol #5 Tayyor 15:31", 2-karta "Stol #3 Tayyor 15:51", keyin `preparing`, `served` oxirida (`:326, :454-462`) |
| 2 | Ro'yxat, filter, qidiruv, pagination | 1.35 / 1.5 | Bo'sh holatlar endi karta, to'liq qator (720×70) — lekin ikonkasiz (`:540`, `:559`) (kichik) |
| 3 | Holatlar | 1.5 / 1.5 | Composer: "Menyu yuklanmoqda..." → 500 da "Menyuni yuklab bo'lmadi" + server matni + "Qayta urinish"; "Bu kategoriyada taom yo'q" faqat muvaffaqiyatli bo'sh kategoriyada. Sahifa: yuklanish/bo'sh/xato + "Berildi" xatosi — bor |
| 4 | Dizayn tizimiga rioya | 1.35 / 1.5 | Tugmalar §7 qaroriga mos (`amber-700`, o'lchandi `oklch(0.555 0.163 49)` + oq); yopish — lucide `X`. Tanlangan qo'shimcha `green-700`, modifikator `amber-700` — bir xil "tanlangan chip" roli ikki rangda, §3 da yozilmagan (kichik) |
| 5 | Formalar | 1.0 / 1.0 | Vazn 96×44 `aria-label` "Vazn, kg", miqdor ± 44×44, `isPending`, server xabari |
| 6 | Accessibility va ergonomika | 0.9 / 1.0 | 768 da o'lchandi: kategoriya 85/99×44, taom 351×44, modifikator 78×44, qo'shimcha 152×44, X 44×44, xato yopish 44×44, "Buyurtma berish" 344×48. Yangi: Bron/Tozalanmoqda/Birlashtirilgan stollari `text-gray-400` / `bg-gray-50` (≈ 2.5:1) va "Savat bo'sh" `text-gray-400` — §7 "gray-400 faqat dekor" (kichik) |
| 7 | Vizual estetika va izchillik | 0.9 / 1.0 | Yuklanish to'liq qatorda (720×116). Tugmasiz kartada pastki bo'sh joy qoladi (`mb-3`, `ui-waiter-r3-sim-768.png` "Olib ketish #100") (kichik) |
| 8 | Matn va til | 0.5 / 0.5 | Hamma matn o'zbekcha; xom status yo'q |

Hisob: 9.5 / 10.0 → **9.5**

### Talablar (ustuvorlik bo'yicha)

1. **[6, kichik]** `frontend/src/pages/WaiterPage.tsx:526, :189` — band bo'lmagan nofaol stollar (Bron, Tozalanmoqda, Birlashtirilgan) va "Savat bo'sh" `text-gray-400` (≈ 2.5:1); ofitsiant stol holatini o'qishi kerak.
   **Qabul talabi:** stol holati matni kamida `text-gray-500`/`text-gray-600` (≥ 4.5:1 `bg-gray-50` ustida); "Savat bo'sh" `text-gray-500` (ui-foundations §7).
2. **[4, kichik]** `frontend/src/pages/WaiterPage.tsx:277` — tanlangan qo'shimcha `bg-green-700`, tanlangan modifikator `bg-amber-700` (2-raund #4, bajarilmadi).
   **Qabul talabi:** ikkala chip tanlovi bir xil rolda (`bg-amber-700 text-white`), yoki "qo'shimcha = yashil" istisnosi ui-foundations §3 jadvaliga yoziladi.
3. **[2, kichik]** `frontend/src/pages/WaiterPage.tsx:540, :559` — bo'sh holat kartalarida lucide ikonka yo'q (2-raund #3, qisman).
   **Qabul talabi:** "Bu filialda hali stol yo'q" va "Faol buyurtmalar yo'q" kartalarida lucide ikonka (`text-gray-300`, 40) matn ustida (ui-foundations §5).
4. **[7, kichik]** `frontend/src/pages/WaiterPage.tsx:576` — `mb-3` tugmasiz kartada ham (2-raund #8, bajarilmadi); karta 98px, pastki oraliq yuqoridagidan katta.
   **Qabul talabi:** `mb-3` faqat "Berildi" tugmasi bo'lganda (yoki tugmaga `mt-3`); tugmasiz kartada yuqori/pastki ichki oraliq teng (16px).

### Tavsiya (ball ayirilmagan — "Hozirgi holat")

- Composer `Escape` bilan yopilmaydi (tekshirildi, `escClosed=false`) — §7 hozirgi holat, tizimli.
- "Tayyor" ogohlantirishini yopish `X` (`:500-505`) — `aria-label`siz, 16px.
- WS ulanish indikatori yo'q (§5 hozirgi holat).
- `TYPE_LABELS` KDS bilan farq qiladi ("Zalda" vs "STOL").
- Chromium'da `uz-UZ` summa "45,000 so'm" ko'rinadi (brauzer ICU) — kanonik shakl, `lib/format.ts` paydo bo'lganda hal bo'ladi.

### Oldingi raund talablari

- 2-raund #1 (composer menyu yuklanish/xato) — bajarildi (`:44-57, :162-165, :179`; 3 s da "Menyu yuklanmoqda...", 500 da "Menyuni yuklab bo'lmadi" + "Qayta urinish", `ui-waiter-r3-composer-menuerror-768.png`)
- 2-raund #2 (`ready` birinchi) — bajarildi (`:326, :454-462`; 12 `preparing` + 2 `ready` → 768 da 1-qator ikkala `ready`, eskisi chapda)
- 2-raund #3 ("Stollar yo'q" kartasi + ikonka) — qisman: karta, to'liq qator — bajarildi; ikonka yo'q — bajarilmadi (yangi #3)
- 2-raund #4 (qo'shimcha `green-700`) — bajarilmadi (`:277`; yangi #2)
- 2-raund #5 (xato yopish lucide `X`, 44px) — bajarildi (`:483-485`; o'lchandi 44×44, `svg` bor)
- 2-raund #6 (stollar yuklanishi to'liq kenglikda) — bajarildi (`:534-538` `col-span-full`; 720×116 bir qatorda, `ui-waiter-r3-loading-768.png`)
- 2-raund #7 (chiplar 44px) — bajarildi (`:257, :275`; o'lchandi modifikator 78×44, qo'shimcha 152×44)
- 2-raund #8 (`mb-3` tugmasiz kartada) — bajarilmadi (`:576`; yangi #4)

### Tekshirilmadi

- Buyurtma yuborish, "Berildi" haqiqiy bosish, real-time ogohlantirish — taqiqlangan amallar; `POST /orders` brauzerda bloklandi, PATCH soxta 403.
