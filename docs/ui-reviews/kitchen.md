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
