# UI review — Oshxona / KDS (`frontend/src/pages/KitchenPage.tsx`)

URL: `http://localhost:3001/kitchen` · rol: chef

## Raund 1 — 2026-10-31 — 5.6 / 10 (UI)

Vizual: tekshirildi (1440, 768, 1920) — `.playwright-mcp/ui-kitchen-1440.png`, `ui-kitchen-768.png`, `ui-kitchen-1920.png`, `ui-kitchen-loading-1440.png`, `ui-kitchen-error-1440.png`
Lint: `ui-lint: 0 xato, 0 ogohlantirish (1 fayl)`

| # | Mezon | Ball | Izoh |
| --- | --- | --- | --- |
| 1 | Ma'lumot ierarxiyasi | 1.5 / 2.0 | Faol buyurtmalar va kutish vaqti bor, lekin kutish vaqti va `#ID` kartadagi eng kichik matn — 12px (o'rta) |
| 2 | Ro'yxat, filter, qidiruv, pagination | 0.6 / 1.5 | `/orders` faqat 1-sahifa (20 ta) har holat uchun, `created_at desc` — 20+ da eng eski (eng shoshilinch) buyurtmalar ekranga chiqmaydi (jiddiy); bo'sh holatda ikonka yo'q (kichik) |
| 3 | Holatlar | 0.0 / 1.5 | Yuklanishda "Hozircha faol buyurtmalar yo'q" (o'rta); 500 da ham "Hozircha faol buyurtmalar yo'q" (jiddiy); "Tayyor" mutatsiyasi xatosi jim yutiladi (o'rta) |
| 4 | Dizayn tizimiga rioya | 1.05 / 1.5 | "Tayyor" `bg-green-500` to'ldirilgan tugma — palitra roli emas (kichik); "✓" belgisi lucide `Check` o'rniga (kichik); `text-[11px]` ixtiyoriy o'lcham (kichik) |
| 5 | Formalar | N/A | Forma yo'q |
| 6 | Accessibility va ergonomika | 0.5 / 1.0 | "Tayyor": oq matn `green-500` ustida ≈ 2.2:1 (o'rta, sahifaga xos); modifikator 11px, izoh `text-xs italic text-gray-500` — 1–2 m dan o'qilmaydi (o'rta) |
| 7 | Vizual estetika va izchillik | 0.9 / 1.0 | 1920 da karta 390px, ekranning ko'p qismi bo'sh, sidebar 256px egallaydi (kichik) |
| 8 | Matn va til | 0.45 / 0.5 | Sarlavhada inglizcha qisqartma "(KDS)" (kichik) |

Hisob: 5.0 / 9.0 → **5.6**

### Talablar (ustuvorlik bo'yicha)

1. **[3, jiddiy]** `frontend/src/pages/KitchenPage.tsx:203, 326-329` — `isError` o'qilmaydi; `/orders` 500 qaytarganda oshpaz "Hozircha faol buyurtmalar yo'q" ko'radi (`ui-kitchen-error-1440.png`) — buyurtma yo'q deb tushunadi.
   **Qabul talabi:** xatoda `bg-red-50 text-red-600` blok "Buyurtmalarni yuklab bo'lmadi" + "Qayta urinish" (`refetch`); "faol buyurtmalar yo'q" faqat muvaffaqiyatli bo'sh javobda (ui-foundations §5, ui-data-table §7).
2. **[2, jiddiy]** `frontend/src/pages/KitchenPage.tsx:207-222` + `OrderController.php:49` (`orderByDesc('created_at')->paginate(20)`) — har holat bo'yicha faqat eng yangi 20 ta olinadi; 21-dan eski `preparing` buyurtmalar KDS'da ko'rinmaydi, klient sort (`:297-305`) to'liq bo'lmagan ro'yxatni saralaydi.
   **Qabul talabi:** KDS barcha faol (`preparing`+`ready`) buyurtmalarni oladi (masalan `per_page` yetarli katta yoki alohida `active=1` endpoint, yoki `last_page` bo'yicha hamma sahifa); 25 ta `preparing` buyurtmada 25 ta karta ko'rinadi (ui-data-table §3, §5).
3. **[3, o'rta]** `frontend/src/pages/KitchenPage.tsx:203, 326` — `isLoading` o'qilmaydi: yuklanish paytida "Hozircha faol buyurtmalar yo'q" chiqadi (`ui-kitchen-loading-1440.png`, 3 s kechikish bilan tekshirildi).
   **Qabul talabi:** birinchi yuklanishda karta shaklidagi `animate-pulse` yoki markaziy amber spinner; bo'sh matn faqat yuklanish tugagach (ui-foundations §5).
4. **[3, o'rta]** `frontend/src/pages/KitchenPage.tsx:284-295` — `readyMutation` da `onError` yo'q: server rad etsa (403/422/tarmoq) tugma qayta faollashadi, oshpaz hech qanday xabar ko'rmaydi.
   **Qabul talabi:** xatoda karta ichida (yoki sahifa tepasida) `bg-red-50 text-red-600` matn — server `error.message` yoki "Holatni o'zgartirib bo'lmadi"; `isPending` faqat bosilgan kartani bloklaydi (`variables === order.id`), hamma kartani emas (ui-forms §3–§4).
5. **[6, o'rta]** `frontend/src/pages/KitchenPage.tsx:158` — `bg-green-500 text-white` o'lchangan kontrast ≈ 2.2:1 (`oklch(0.723 0.219 149.6)` ustida oq), 14px matn; bu amber tizimli qaydiga kirmaydi.
   **Qabul talabi:** "Tayyor" tugmasi matni/fon kontrasti ≥ 4.5:1 (masalan `bg-green-700` yoki skill'dagi asosiy tugma bilan kelishilgan rang), shrift ≥ `text-base font-semibold`, balandlik ≥ 44px (ui-foundations §7).
6. **[1, o'rta]** `frontend/src/pages/KitchenPage.tsx:111-115` — kutish vaqti va `#ID` `text-xs` (12px, o'lchandi), tur yorlig'i `text-sm`; oshpazning asosiy signali eng kichik.
   **Qabul talabi:** kutish vaqti (`N daq`) kartadagi eng ko'zga tashlanadigan raqam — kamida `text-base font-bold tabular-nums`; 1920 skrinshotida taom nomidan kichik emas (ui-detail-page "3 soniya testi", rubric 1).
7. **[6, o'rta]** `frontend/src/pages/KitchenPage.tsx:132, 140-144` — modifikator (`piyozsiz` kabi muhim ko'rsatma) `text-[11px]`, qo'shimcha/izoh `text-xs text-gray-500 italic`.
   **Qabul talabi:** modifikator ≥ `text-xs font-bold` (12px+) va izoh ≥ `text-sm text-gray-700`; 1920×1080 da 1–2 m dan o'qiladi (ui-foundations §7 KDS qatori).
8. **[2, kichik]** `frontend/src/pages/KitchenPage.tsx:326-329` — bo'sh holatda ikonka yo'q.
   **Qabul talabi:** lucide ikonka (`ChefHat`/`UtensilsCrossed`, `text-gray-300`, 40) + matn (ui-data-table §7).
9. **[4, kichik]** `frontend/src/pages/KitchenPage.tsx:132, 158, 165` — `text-[11px]`, yashil to'ldirilgan tugma, "✓" matn belgisi.
   **Qabul talabi:** Tailwind shkalasidagi o'lcham; belgi o'rniga lucide `Check size={16}`; tugma rangi ui-foundations §2/§3 rollaridan (kelishilgan istisno bo'lsa — skill'ga yoziladi).
10. **[7, kichik]** 1920 skrinshoti — bitta karta 390px, qolgan maydon bo'sh.
    **Qabul talabi:** `2xl:` da kattaroq karta/shrift yoki KDS uchun sidebar yig'iladigan rejim; 1920 da karta matni 1440 dagidan katta.
11. **[8, kichik]** `frontend/src/pages/KitchenPage.tsx:310` — "Oshxona (KDS)".
    **Qabul talabi:** "Oshxona" (nav bilan bir xil atama, ui-foundations §6).

### Tavsiya (ball ayirilmagan — "Hozirgi holat")

- WebSocket ulanish indikatori yo'q (ui-foundations §5 hozirgi holat) — Reverb uzilsa oshpaz bilmaydi. Tavsiya: sarlavha yonida "Jonli / Ulanish uzildi" badge.
- Sidebar subtitle "Admin Panel" oshpazga ham inglizcha (`Layout.tsx`, §6 hozirgi holat).
- KDS holat/tur yorliqlari `OrdersPage` `STATUS_MAP` bilan umumiy emas (ui-detail-page §3 hozirgi holat).
- Tugmalarda `focus-visible:ring` yo'q (tizimli).

### Oldingi raund talablari

- yo'q (1-raund)

### Tekshirilmadi

- "Tayyor" bosish va real-time yangilanish (ikkinchi tabda buyurtma yaratish) — taqiqlangan amal (holat o'zgartirish / ma'lumot yaratish). WS obunasi `broadcasting/auth` 200 bilan muvaffaqiyatli.
- Vaznli taom (`weight_kg`), modifikator, izohli karta, `ready` holatdagi karta — QA bazasida faqat bitta `preparing` (Osh × 1) buyurtma; koddan baholandi.
- 20+ buyurtma holati — koddan.

## Raund 2 — 2026-10-31 — 9.4 / 10 (UI)

Vizual: tekshirildi (1440, 768, 1920) — `.playwright-mcp/ui-kitchen-r2-1440.png`, `ui-kitchen-r2-768.png`, `ui-kitchen-r2-1920.png`, `ui-kitchen-r2-sim-1440.png`, `ui-kitchen-r2-sim-1920.png`, `ui-kitchen-r2-actionerror-1440.png`, `ui-kitchen-r2-loading-1440.png`, `ui-kitchen-r2-error-1440.png`, `ui-kitchen-r2-empty-1440.png`
Lint: `ui-lint: 0 xato, 2 ogohlantirish (4 fayl)` — KitchenPage.tsx'da topilma yo'q

Simulyatsiya (faqat brauzer ichida, `page.route`): modifikator/qo'shimcha/izoh/vaznli/`ready` karta — soxta `/orders` javobi; "Tayyor" xatosi — PATCH brauzerda 422 bilan to'xtatildi (serverga yetmadi); yuklanish — 3 s kechikish; xato — 500; bo'sh — `data: []`.

| # | Mezon | Ball | Izoh |
| --- | --- | --- | --- |
| 1 | Ma'lumot ierarxiyasi | 2.0 / 2.0 | Kutish vaqti kartadagi eng yirik raqam: 20px (1440), 24px (1920); tur 16/18px; `#ID` 12px — ikkilamchi |
| 2 | Ro'yxat, filter, qidiruv, pagination | 1.5 / 1.5 | 25 ta faol buyurtma — 25 karta, eng eskisi (#2, 49 daq) birinchi; bo'sh holatda `ChefHat` ikonka |
| 3 | Holatlar | 1.5 / 1.5 | Yuklanish "Buyurtmalar yuklanmoqda..." (katta), 500 → katta qizil blok + "Qayta urinish", bo'sh faqat muvaffaqiyatli `[]` da; "Tayyor" xatosi tepada server matni bilan, `isPending` faqat bosilgan kartada |
| 4 | Dizayn tizimiga rioya | 1.2 / 1.5 | "Tayyor" `bg-green-700` — skill §2/§3 rollarida yo'q, istisno skill'ga yozilmagan (kichik); xato blokini yopish `✕` matn belgisi, lucide `X` emas (kichik) |
| 5 | Formalar | N/A | Forma yo'q |
| 6 | Accessibility va ergonomika | 0.9 / 1.0 | "Tayyor" oq/`green-700` ≈ 5:1, 18px, 52px — yaxshi; modifikator 14px bold, izoh 14px `gray-700`; xato blokini yopish tugmasi `px-2` (~28×24 px) — KDS sensorli ekranida kichik (kichik) |
| 7 | Vizual estetika va izchillik | 0.9 / 1.0 | 1440 da "Tayyor — berishni kutmoqda" 272px kartada ikki qatorga o'raladi (kichik). 1920: karta 389px, lekin matn kattaroq (18/24px) |
| 8 | Matn va til | 0.5 / 0.5 | "Oshxona" — nav bilan bir xil; hamma matn o'zbekcha |

Hisob: 8.5 / 9.0 → **9.4**

### Talablar (ustuvorlik bo'yicha)

1. **[4, kichik]** `frontend/src/pages/KitchenPage.tsx:165` — `bg-green-700` to'ldirilgan "Tayyor" tugmasi ui-foundations §2/§3 rollarida yo'q (1-raund #9 "kelishilgan istisno bo'lsa — skill'ga yoziladi").
   **Qabul talabi:** `.claude/skills/ui-foundations/SKILL.md` §2 jadvaliga KDS/ofitsiant "bajarildi" tugmasi qatori (`bg-green-700 … hover:bg-green-800`) qo'shiladi, yoki tugma mavjud rolga o'tkaziladi.
2. **[4, kichik]** `frontend/src/pages/KitchenPage.tsx:348` — yopish tugmasida `✕` matn belgisi.
   **Qabul talabi:** `<X size={20} aria-hidden="true" />` (lucide), `aria-label` qoladi (ui-foundations §1).
3. **[6, kichik]** `frontend/src/pages/KitchenPage.tsx:348` — yopish tugmasi bosish zonasi ~28×24 px.
   **Qabul talabi:** `min-h-11 min-w-11 inline-flex items-center justify-center` (≥ 44px) (ui-foundations §7).
4. **[7, kichik]** `frontend/src/pages/KitchenPage.tsx:172-175` — 1440 da "Tayyor — berishni kutmoqda" ikki qatorga o'raladi, "Tayyor" tugmasidan baland.
   **Qabul talabi:** 272px kartada bir qatorda (masalan "Berishni kutmoqda" yoki `text-sm`), balandligi "Tayyor" tugmasi bilan bir xil.

### Tavsiya (ball ayirilmagan — "Hozirgi holat")

- WebSocket ulanish indikatori yo'q (ui-foundations §5 hozirgi holat) — 1-raunddan.
- Sidebar subtitle "Admin Panel" (Layout, §6 hozirgi holat).
- KDS `TYPE_LABELS` (`STOL`/`OLIB KETISH`) va Waiter `TYPE_LABELS` (`Zalda`/`Olib ketish`) — bir tur ikki xil nom; umumiy xarita tavsiya etiladi.
- `ErrorState` "Qayta urinish" `bg-red-600` — KDS'da uzoqdan ko'rinishi uchun maqbul.
- Taomsiz buyurtmada (QA ma'lumoti: #5–#28 `order_items` bo'sh) faqat izoh va uning ustidagi `border-t` chizig'i ko'rinadi — ma'lumot artefakti, baholanmadi.
- Oshpaz login'dan keyin `/dashboard` ga tushadi (nav'da faqat "Oshxona") — to'g'ridan-to'g'ri `/kitchen` ga yo'naltirish tavsiya etiladi (Layout/LoginPage doirasi).

### Oldingi raund talablari

- 1-raund #1 (xato holati) — bajarildi (`:354-356`; 500 → "Buyurtmalarni yuklab bo'lmadi" + "Qayta urinish", `ui-kitchen-r2-error-1440.png`)
- 1-raund #2 (barcha faol buyurtmalar) — bajarildi (`:225, :239` `active=1`; 25 ta → 25 karta, #2 (49 daq) birinchi)
- 1-raund #3 (yuklanish holati) — bajarildi (`:352-353`; 3 s kechikishda "Buyurtmalar yuklanmoqda...", `ui-kitchen-r2-loading-1440.png`)
- 1-raund #4 ("Tayyor" xatosi, karta bo'yicha pending) — bajarildi (`:314, :345-350, :370`; brauzerda 422 → tepada "Bu buyurtma holatini o'zgartirib bo'lmaydi", `ui-kitchen-r2-actionerror-1440.png`)
- 1-raund #5 ("Tayyor" kontrast/o'lcham) — bajarildi (`:165`; `green-700` ≈ 5:1, 18px semibold, 52px)
- 1-raund #6 (kutish vaqti yirik) — bajarildi (`:122`; 20px/24px bold tabular-nums, taom nomidan katta)
- 1-raund #7 (modifikator/izoh o'lchami) — bajarildi (`:139, :147, :151`; 14px bold / 14px `gray-700`)
- 1-raund #8 (bo'sh holat ikonka) — bajarildi (`:359`, `ui-kitchen-r2-empty-1440.png`)
- 1-raund #9 (`text-[11px]`, "✓", yashil tugma) — qisman: `text-[11px]` yo'q, `Check` lucide — bajarildi; yashil tugma istisnosi skill'ga yozilmagan — bajarilmadi (yangi #1)
- 1-raund #10 (1920 da kattaroq) — bajarildi (`2xl:` klasslari; 1920 da taom 18px, vaqt 24px vs 1440 da 16/20px)
- 1-raund #11 ("(KDS)") — bajarildi (`:330` "Oshxona")

### Tekshirilmadi

- Haqiqiy "Tayyor" bosish va real-time yangilanish — taqiqlangan amal; xato oqimi brauzerda soxta javob bilan.
- Modifikator/vaznli/`ready` karta haqiqiy ma'lumotda — QA bazasida yo'q; soxta `/orders` javobi bilan vizual tekshirildi.

## Raund 3 — 2026-10-31 — 9.9 / 10 (UI)

Vizual: tekshirildi (1440, 1920) — `.playwright-mcp/ui-kitchen-r3-1440.png`, `ui-kitchen-r3-sim-1440.png`, `ui-kitchen-r3-sim-1920.png`, `ui-kitchen-r3-actionerror-1440.png`, `ui-kitchen-r3-error-1440.png`
Lint: `ui-lint: 0 xato, 1 ogohlantirish (2 fayl)` — KitchenPage.tsx'da topilma yo'q (K7 ham)

Simulyatsiya (faqat brauzerda, `page.route`): modifikator/qo'shimcha/izoh/vaznli/`ready` karta — soxta `/orders` (`order_items`); "Tayyor" xatosi — PATCH brauzerda 422; yuklanish 3 s, xato 500, bo'sh `[]`. Oshpaz login'dan keyin to'g'ridan-to'g'ri `/kitchen` ga tushdi (tekshirildi).

| # | Mezon | Ball | Izoh |
| --- | --- | --- | --- |
| 1 | Ma'lumot ierarxiyasi | 2.0 / 2.0 | Kutish vaqti 20px (1440) / 24px (1920) — eng yirik; taom 16/18px; modifikator 14px bold |
| 2 | Ro'yxat, filter, qidiruv, pagination | 1.5 / 1.5 | Haqiqiy 25 karta, eng eskisi (#2, 83 daq) birinchi; `preparing` → `ready` |
| 3 | Holatlar | 1.5 / 1.5 | "Buyurtmalar yuklanmoqda...", 500 → "Buyurtmalarni yuklab bo'lmadi" + "Qayta urinish", bo'sh "Hozircha faol buyurtmalar yo'q"; 422 → tepada server matni |
| 4 | Dizayn tizimiga rioya | 1.5 / 1.5 | "Tayyor" `green-700` — ui-foundations §7 qarori (#13) aniq nomlaydi; yopish lucide `X` |
| 5 | Formalar | N/A | Forma yo'q |
| 6 | Accessibility va ergonomika | 1.0 / 1.0 | "Tayyor" 52px, 18px, oq/`green-700` 4.94:1; xato yopish 44×44, `aria-label` |
| 7 | Vizual estetika va izchillik | 0.9 / 1.0 | "Berishni kutmoqda" bir qatorda (1440, 272px karta), lekin bloki 46px, "Tayyor" 52px — kartalar pastki qismi teng emas (kichik) |
| 8 | Matn va til | 0.5 / 0.5 | Hamma matn o'zbekcha |

Hisob: 8.9 / 9.0 → **9.9**

### Talablar (ustuvorlik bo'yicha)

1. **[7, kichik]** `frontend/src/pages/KitchenPage.tsx:172` — "Berishni kutmoqda" bloki 46px (`py-2.5` + border), "Tayyor" tugmasi 52px (`min-h-12 py-3`).
   **Qabul talabi:** blokka `min-h-12` (yoki `py-3`) — 1440 da ikkala pastki element balandligi 52px (2-raund #4 ning ikkinchi qismi).

### Tavsiya (ball ayirilmagan — "Hozirgi holat")

- WebSocket ulanish indikatori yo'q (ui-foundations §5 hozirgi holat).
- Sidebar subtitle "Admin Panel" (Layout, §6 hozirgi holat).
- KDS `TYPE_LABELS` (`STOL`/`OLIB KETISH`) va Waiter (`Zalda`/`Olib ketish`) — umumiy xarita.

### Oldingi raund talablari

- 2-raund #1 (`green-700` rol/istisno skill'da) — bajarildi (`.claude/skills/ui-foundations/SKILL.md` §7 qarori: "KDS 'Tayyor' — `green-700`", 4.94:1; brauzerda `oklch(0.527 0.154 150)`)
- 2-raund #2 (lucide `X`) — bajarildi (`:349`; `svg` bor, matn bo'sh)
- 2-raund #3 (yopish ≥ 44px) — bajarildi (`:348`; o'lchandi 44×44, `ui-kitchen-r3-actionerror-1440.png`)
- 2-raund #4 ("Berishni kutmoqda" bir qatorda, balandlik "Tayyor" bilan bir xil) — qisman: bir qator — bajarildi (`:174`); balandlik 46 vs 52px — bajarilmadi (yangi #1)

Regressiya: yo'q — 2-raund 9.4 → 9.9.

### Tekshirilmadi

- Haqiqiy "Tayyor" bosish va real-time yangilanish — taqiqlangan amal; xato oqimi soxta 422 bilan.
