# UI review — Standart menyu (`frontend/src/pages/CatalogPage.tsx`)

URL: `http://localhost:3001/catalog` · rol: super_admin

## Raund 1 — 2026-10-31 — 8.2 / 10 (UI)

Vizual: tekshirildi (1440, 768) — `.playwright-mcp/ui-catalog-1440.png`, `ui-catalog-expand.png`, `ui-catalog-search.png`, `ui-catalog-notfound.png`, `ui-catalog-item-modal.png`, `ui-catalog-item-empty.png`, `ui-catalog-after-add.png`, `ui-catalog-delete.png`, `ui-catalog-768.png`
Lint: `ui-lint: 0 xato, 0 ogohlantirish (6 fayl)`
Brauzerda: kategoriya/sub-menyu ochish, qidiruv ("lag" → 2 taom, avtomatik ochiladi), `zzzz-qa-yoq` → topilmadi + "Qidiruvni tozalash", "Taom qo'shish" modali (sub-menyu oldindan tanlangan), bo'sh yuborish, "QA test taom" yaratildi va tasdiq modali orqali o'chirildi (183 → 182, tozalandi). Konsol: 0 xato.

| # | Mezon | Ball | Izoh |
| --- | --- | --- | --- |
| 1 | Ma'lumot ierarxiyasi | 1.3 / 2.0 | Daraxt aniq, yo'riqnoma bor. "Hammasi" badge'i har kategoriyada "Oshxona" yonida — "hamma turga" deb o'qiladi, aslida "To'liq menyu" shabloni (o'rta); "Diqqat" bloki yo'riqnoma 5-qadamini takrorlaydi (kichik) |
| 2 | Ro'yxat, filter, qidiruv, pagination | 1.35 / 1.5 | Qidiruv + topilmadi + tozalash ishlaydi; qidiruvda hisoblagich "182 taom" o'zgarmaydi (kichik). Pagination shart emas (daraxt) |
| 3 | Holatlar | 1.125 / 1.5 | Yuklanish/xato/bo'sh — bor (`:943-948, :974`). Taom qo'shilgach sub-menyu yopiq qoladi, yangi taom ko'rinmaydi va xabar yo'q (o'rta, ui-forms §4) |
| 4 | Dizayn tizimiga rioya | 1.5 / 1.5 | Lint toza, bitta asosiy tugma, badge/karta/input naqshlari to'g'ri, summa `text-right` |
| 5 | Formalar | 0.9 / 1.0 | Label/`*`/`apiFieldErrors`, radio-kartalar — yaxshi. Taom formasida placeholder har doim "Coca-Cola 1 l" (Palov ichida ham) (kichik) |
| 6 | Accessibility va ergonomika | 0.75 / 1.0 | Ikonka-tugmalar `aria-label`, 44px. Yangi modallar `Escape` bilan yopilmaydi (tekshirildi) — yangi kodda standart (o'rta) |
| 7 | Vizual estetika va izchillik | 0.9 / 1.0 | Emoji-ikonka nomga yopishgan (bo'shliqsiz ko'rinadi); 768 da "Yangi kategoriya" tugmasi 2 qatorga bo'linadi (kichik) |
| 8 | Matn va til | 0.375 / 0.5 | "kategoriyadan", "sub-menyuga qarab", "hech qaysi turga" chiplari — birinchi marta ko'rgan odam uchun tushunarsiz (o'rta) |

Hisob: 8.2 / 10.0 → **8.2**

### Talablar (ustuvorlik bo'yicha)

1. **[3, o'rta]** `frontend/src/pages/CatalogPage.tsx:444-447` — taom (va sub-menyu) qo'shilgach modal yopiladi, lekin tegishli sub-menyu yopiq qoladi: foydalanuvchi natijani ko'rmaydi (`ui-catalog-after-add.png` — Palov yopiq, faqat "7 taom" o'zgardi).
   **Qabul talabi:** muvaffaqiyatdan keyin taom tushgan kategoriya va sub-menyu avtomatik ochiladi (`setOpen` ga qo'shiladi) va yangi qator ko'rinadi (yoki qisqa yashil xabar "Taom qo'shildi: <nom>") (ui-forms §4).
2. **[1, o'rta]** `frontend/src/pages/CatalogPage.tsx:84, 87-92` — `hammasi` turi "Hammasi" deb ko'rsatiladi; "Oshxona · Hammasi" juftligi "barcha restoranlarga" deb tushuniladi.
   **Qabul talabi:** tur yorlig'i "To'liq menyu" (yoki "Hammasi (to'liq)"), CompaniesPage radio-kartasi bilan bir xil nom; yo'riqnoma 4-qadamida badge ma'nosi bir jumlada ("rangli belgi — shu turdagi yangi korxonaga beriladi") (ui-foundations §6).
3. **[8, o'rta]** `frontend/src/pages/CatalogPage.tsx:101-116` — "kategoriyadan" / "sub-menyuga qarab" / "hech qaysi turga" chiplari izohsiz.
   **Qabul talabi:** oddiy jumla: "Kategoriya turi bilan bir xil", "Turi sub-menyuda belgilanadi", "Hech kimga berilmaydi"; yoki chip o'rniga `title` emas, ko'rinadigan izoh (ui-foundations §6).
4. **[6, o'rta]** `frontend/src/pages/CatalogPage.tsx:144-167, 811` — `ModalShell` va o'chirish tasdig'i `Escape` ni tinglamaydi.
   **Qabul talabi:** ochiq modalda `Escape` → `onClose` (`useEffect` + `keydown`); `role="dialog" aria-modal="true" aria-labelledby` (ui-foundations §7).
5. **[1, kichik]** `frontend/src/pages/CatalogPage.tsx:936-940` — "Diqqat" bloki yo'riqnoma 5-qadami bilan bir xil.
   **Qabul talabi:** bittasi qoladi (yo'riqnoma yopilganda ham ko'rinadigan "Diqqat" afzal, 5-qadam olib tashlanadi).
6. **[2, kichik]** `frontend/src/pages/CatalogPage.tsx:967` — qidiruv paytida hisoblagich umumiy sonni ko'rsatadi.
   **Qabul talabi:** qidiruv bo'lsa "N ta taom topildi" (ui-data-table §4).
7. **[5, kichik]** `frontend/src/pages/CatalogPage.tsx:500, 516` — placeholder har doim "Coca-Cola 1 l".
   **Qabul talabi:** neytral misol ("Masalan: Qozon kabob") yoki tanlangan sub-menyuga mos.
8. **[7, kichik]** `frontend/src/pages/CatalogPage.tsx:1009`, `:907-918` — emoji va nom orasida ko'rinadigan bo'shliq yo'q; 768 da asosiy tugma ikki qator.
   **Qabul talabi:** emoji alohida `<span aria-hidden="true" className="mr-1.5">`; tugmada `whitespace-nowrap`.

### Tavsiya (ball ayirilmagan — "Hozirgi holat")

- Bo'sh forma yuborilganda brauzerning inglizcha "Please fill out this field." xabari chiqadi (`required`) — `noValidate` + o'zbekcha maydon xabari yaxshiroq (tizimli, companies.md bilan bir xil).
- Kategoriya ikonkasi emoji (ma'lumot maydoni) — lucide talabi kod ikonkalariga tegishli, ball ayirilmadi.

### Oldingi raund talablari

- yo'q (1-raund)

### Tekshirilmadi

- Xato holati (500) — brauzerda simulyatsiya qilinmadi; koddan: `ErrorState` + `refetch` (`:947-948`).
- Bo'sh katalog holati — seed o'chirilmaydi; koddan `:974-975`.
