# UI review — Stollar (`frontend/src/pages/TablesPage.tsx` + `components/TableTemplatesPanel.tsx`)

URL: `http://localhost:3001/tables` · rol: company_admin (`qa-478296`)

## Raund 1 — 2026-10-31 — 7.3 / 10 (UI)

Vizual: tekshirildi (1440, 768, 375) — `.playwright-mcp/ui-tables-1440.png`, `ui-tables-templates-1440.png`, `ui-tables-template-modal.png`, `ui-tables-template-empty.png`, `ui-tables-768.png`, `ui-tables-375.png`, `ui-tables-templates-375.png`
Lint: `ui-lint: 0 xato, 0 ogohlantirish (6 fayl)`
Brauzerda: "Stollar" / "Stol shablonlari" tablari, "QA VIP 1206" kartasi (Osh × 3, Shashlik × 4, "Hammasi ochilsa: 935 000 so'm"), "Yangi shablon" modali ochildi, bo'sh yuborildi (yaratilmadi). Konsol: 0 xato.

| # | Mezon | Ball | Izoh |
| --- | --- | --- | --- |
| 1 | Ma'lumot ierarxiyasi | 1.3 / 2.0 | Yo'riqnoma va "Hammasi ochilsa" summasi yaxshi. Shablon modalida taom tanlash — guruhsiz, qidiruvsiz tekis `select` ("Osh (Issiq taomlar)"); to'liq shablonli korxonada ~180 variant (o'rta, #25); stol kartasida holat ikki marta (badge + tanlov tugmasi) (kichik) |
| 2 | Ro'yxat, filter, qidiruv, pagination | 1.5 / 1.5 | Kichik ro'yxatlar, filial filtri — yetarli |
| 3 | Holatlar | 1.2 / 1.5 | Shablonlar: yuklanish/xato/bo'sh bor. Bo'sh stol holati matni "Stollar topilmadi" (topilmadi ≠ bo'sh) (kichik); shablonlar bo'sh holatida amal tugmasi yo'q (kichik) |
| 4 | Dizayn tizimiga rioya | 0.975 / 1.5 | Tab — to'ldirilgan amber segment, ui-data-table §6 naqshi emas; "Stol shablonlari" tabida 3 ta to'ldirilgan amber element (Yangi stol, faol tab, Yangi shablon) (o'rta, §2); shablon nomi `text-indigo-700` — palitra rolida yo'q (kichik) |
| 5 | Formalar | 0.5 / 1.0 | Yangi `TemplateModal` va o'zgargan `TableModal` `apiFieldErrors` ishlatmaydi — 422 xatolari maydon ostida emas (jiddiy, ui-forms §3 MAJBURIY) |
| 6 | Accessibility va ergonomika | 0.5 / 1.0 | Planshet sahifasida stol holati tugmalari 24px, Tahrirlash/O'chirish 28px, nofaol holat matni `text-gray-400` `bg-gray-50` da (o'rta, §7); yangi shablon modali `Escape` bilan yopilmaydi (o'rta) |
| 7 | Vizual estetika va izchillik | 0.8 / 1.0 | 375 da kartadagi "O'chirish" chegaradan 8px chiqadi (o'lchandi: tugma o'ng 188, karta 180) (kichik); shablonlar tabida "Yangi stol" tugmasi ham turadi (kichik) |
| 8 | Matn va til | 0.5 / 0.5 | Oddiy o'zbekcha, "shablon" izohlangan |

Hisob: 7.275 / 10.0 → **7.3**

### Talablar (ustuvorlik bo'yicha)

1. **[5, jiddiy]** `frontend/src/components/TableTemplatesPanel.tsx:67`, `frontend/src/pages/TablesPage.tsx` (`TableModal` `onError`) — faqat `apiErrorMessage`; `name`, `items.N.menu_item_id`, `table_template_id` xatolari maydonga bog'lanmagan.
   **Qabul talabi:** `apiFieldErrors(err)` → `name` xatosi "Shablon nomi" ostida, `items.N.*` — N-qator ostida, `table_template_id` — select ostida (`mt-1 text-sm text-red-600`, `aria-invalid`); umumiy blokda faqat bog'lanmagan xabar (ui-forms §3).
2. **[1, o'rta]** `frontend/src/components/TableTemplatesPanel.tsx:30-43, 107-118` — taomlar tekis ro'yxat.
   **Qabul talabi:** `<optgroup label="Kategoriya → Sub-menyu">` bo'yicha guruhlangan (MenuPage `:384` naqshi), variant matni faqat taom nomi + narx ("Osh — 15 000 so'm"); `qa-tree-450426` da Palov taomlari bitta guruhda.
3. **[6, o'rta]** `frontend/src/pages/TablesPage.tsx:430-444, 446-462` — holat tugmalari `px-2 py-1 text-xs` (24px), amallar `py-1.5` (28px), nofaol `text-gray-400`.
   **Qabul talabi:** 768 da har biri ≥ 44px balandlik (`min-h-11`), nofaol matn `text-gray-600`+ (≥ 4.5:1) (ui-foundations §7).
4. **[6, o'rta]** `frontend/src/components/TableTemplatesPanel.tsx:74-80, 245-262` — shablon modali va o'chirish tasdig'i `Escape` ni tinglamaydi; `TemplateModal` da `role="dialog"` yo'q.
   **Qabul talabi:** `Escape` → yopish; `role="dialog" aria-modal="true" aria-labelledby`.
5. **[4, o'rta]** `frontend/src/pages/TablesPage.tsx:326-340`, `:305-311` — tab naqshi va bir ekranda 3 ta to'ldirilgan amber element.
   **Qabul talabi:** tablar ui-data-table §6 naqshida (`border-b-2` faol, to'ldirilmagan); "Yangi stol" faqat "Stollar" tabida ko'rinadi — ekranda bitta asosiy tugma.
6. **[3, kichik]** `frontend/src/pages/TablesPage.tsx:380`; `TableTemplatesPanel.tsx:204-209` — "Stollar topilmadi"; shablon bo'sh holatida tugma yo'q.
   **Qabul talabi:** "Hozircha stol yo'q" + mavjud tugma; shablonlarda "+ Yangi shablon" tugmasi bo'sh holat ichida (ui-foundations §5).
7. **[7, kichik]** `frontend/src/pages/TablesPage.tsx:446-462` — 375 da amallar karta chegarasidan chiqadi.
   **Qabul talabi:** 375 da tugmalar karta ichida (`flex-wrap` yoki faqat ikonka + `aria-label`, 44px).
8. **[1, kichik]** `frontend/src/pages/TablesPage.tsx:404` + `:430-444` — holat badge'i va tanlangan holat tugmasi bir xil ma'lumot.
   **Qabul talabi:** bittasi qoladi (masalan badge olib tashlanadi, tanlangan tugma ajralib turadi).
9. **[4, kichik]** `frontend/src/pages/TablesPage.tsx:422` — `text-indigo-700`.
   **Qabul talabi:** `text-gray-600` (yoki `amber-700`) — palitra rollaridan (ui-foundations §3).

### Tavsiya (ball ayirilmagan — "Hozirgi holat")

- `/tables` so'rovida `isError` o'qilmaydi — server xatosida "Stollar topilmadi" chiqadi (§5 Hozirgi holat, eski kod). Tuzatilsa yaxshi.
- Bo'sh yuborishda brauzerning inglizcha "Please fill out this field." xabari (`ui-tables-template-empty.png`, tizimli).
- `TableModal` X tugmasida `aria-label` yo'q (`:95`, eski kod).

### Oldingi raund talablari

- yo'q (1-raund)

### Tekshirilmadi

- Shablon saqlash/o'chirish, stolga shablon biriktirish — taqiq (yaratish/o'chirish).
- Shablon modalining katta menyu bilan ko'rinishi — `qa-478296` menyusi kichik; ~180 variant xulosasi koddan (`:30-43`).

## Raund 2 — 2026-10-31 — 8.8 / 10 (UI)

Vizual: tekshirildi (1440, 768, 375) — `.playwright-mcp/ui-tables-r2-1440.png`, `ui-tables-r2-768.png`, `ui-tables-r2-375.png`, `ui-tables-r2-templates-1440.png`, `ui-tables-r2-templates-375.png`, `ui-tables-r2-tplmodal.png`, `ui-tables-r2-tpl-422.png`, `ui-tables-r2-table-422.png`
Lint: `ui-lint: 0 xato, 0 ogohlantirish (2 fayl)`
Brauzerda (company_admin `998901478296`): ikkala tab; "Yangi shablon" modali (optgroup "Issiq taomlar"), nomi "   " + ikki qatorda bir xil "Osh" → 422 (yaratilmadi); "Yangi stol" raqami "A1" → 422 "number has already been taken" (yaratilmadi); ikkala modal `Escape` bilan yopildi. O'lchandi: holat va amal tugmalari 44px (1440/768/375), nofaol holat matni `gray-700`; 375 da gorizontal toshish yo'q. Konsol: faqat ikkita kutilgan 422.

| # | Mezon | Ball | Izoh |
| --- | --- | --- | --- |
| 1 | Ma'lumot ierarxiyasi | 1.6 / 2.0 | Taomlar kategoriya bo'yicha `optgroup` da. Variant matnida narx yo'q ("Osh", talab "Osh — 15 000 so'm") (kichik); holat badge'i + tanlangan holat tugmasi takrori qoldi (`TablesPage.tsx:424-426`) (kichik) |
| 2 | Ro'yxat, filter, qidiruv, pagination | 1.5 / 1.5 | Kichik ro'yxatlar, filial filtri yetarli |
| 3 | Holatlar | 1.2 / 1.5 | Bo'sh stol holati hamon "Stollar topilmadi" (`:400`) (kichik); shablon bo'sh holatida tugma yo'q, faqat matn (`TableTemplatesPanel.tsx:231-235`) (kichik) |
| 4 | Dizayn tizimiga rioya | 1.35 / 1.5 | Tab §6 naqshida (pastki chiziq), ekranda bitta to'ldirilgan amber tugma (o'lchandi). Shablon nomi `text-indigo-700` qoldi (`:442`) (kichik) |
| 5 | Formalar | 1.0 / 1.0 | 422 xatolari maydon ostida, `aria-invalid="true"`, `items.N.*` N-qator ostida (`ui-tables-r2-tpl-422.png`); label → input `htmlFor` bog'langan; umumiy blok faqat bog'lanmagan xabarga |
| 6 | Accessibility va ergonomika | 0.9 / 1.0 | 44px, kontrast, Escape, `role="dialog"` — bajarildi. `TablesPage` dagi `DeleteConfirmModal` (`:230-250`) `Escape` ni tinglamaydi, `aria-labelledby` yo'q (kichik) |
| 7 | Vizual estetika va izchillik | 0.75 / 1.0 | **Yangi regressiya:** 1440 va 768 da "Tozalanmoqda" tugmadan chiqadi — scrollWidth 104 > clientWidth 86 (1440) / 94 (768), matn karta chegarasiga tegadi, har kartada (`ui-tables-r2-1440.png`, `-768.png`) (o'rta). 375 da toza |
| 8 | Matn va til | 0.5 / 0.5 | UI matni o'zbekcha. Inglizcha validatsiya xabarlari lokal `.env` `APP_LOCALE=en` sababli — `lang/uz/validation.php` da o'zbekcha bor (`:38, :89, :103`, atributlar `:121, :163, :169`), sahifa aybi emas (companies.md bilan bir xil yondashuv) |

Hisob: 8.8 / 10.0 → **8.8**

### Talablar (ustuvorlik bo'yicha)

1. **[7, o'rta]** `frontend/src/pages/TablesPage.tsx:450-466` — `grid-cols-2` + `px-2 text-sm` da "Tozalanmoqda" 86–94px ustunga sig'maydi (1440: sw 104 / cw 86; 768: sw 104 / cw 94).
   **Qabul talabi:** 1440, 768, 375 da `[aria-label="Stol holati"] button` uchun `scrollWidth <= clientWidth` (masalan `text-xs`/`px-1`, `break-words` yoki karta kengligini oshirish: `lg:grid-cols-3 xl:grid-cols-4`); matn tugma foni ichida.
2. **[3, kichik]** `frontend/src/pages/TablesPage.tsx:400`; `TableTemplatesPanel.tsx:231-235` — 1-raund #6 bajarilmagan.
   **Qabul talabi:** "Hozircha stol yo'q" + mavjud tugma; shablon bo'sh holati ichida "+ Yangi shablon" tugmasi (ui-foundations §5).
3. **[1, kichik]** `frontend/src/pages/TablesPage.tsx:424-426` — 1-raund #8 bajarilmagan.
   **Qabul talabi:** badge yoki holat tugmalari guruhidan biri qoladi.
4. **[4, kichik]** `frontend/src/pages/TablesPage.tsx:442` — 1-raund #9 bajarilmagan.
   **Qabul talabi:** `text-gray-600` yoki `text-amber-700` (ui-foundations §3).
5. **[1, kichik]** `frontend/src/components/TableTemplatesPanel.tsx:41, 134` — variant matni faqat nom.
   **Qabul talabi:** "Osh — 15 000 so'm" (`formatMoney(o.price)`).
6. **[6, kichik]** `frontend/src/pages/TablesPage.tsx:230-250` — `DeleteConfirmModal` `Escape` va `aria-labelledby` siz.
   **Qabul talabi:** `useEscape(onCancel)`, `<h3 id=…>` + `aria-labelledby`.

### Tavsiya (ball ayirilmagan — "Hozirgi holat")

- `/tables` so'rovida `isError` o'qilmaydi (eski kod, §5 hozirgi holat).
- Lokal `.env` `APP_LOCALE=uz` qilinsa, review/QA'da validatsiya xabarlari o'zbekcha ko'rinadi.
- Maydon qiymati o'zgarganda `fieldErrors` tozalanmaydi — xato qayta yuborilgunicha qoladi.

### Oldingi raund talablari

- 1-raund #1 (422 maydon ostida) — bajarildi (`ui-tables-r2-tpl-422.png`: nom ostida, har qator ostida; stol "A1" → raqam ostida, `aria-invalid="true"`)
- 1-raund #2 (optgroup + "nom — narx") — qisman: optgroup bor (`TableTemplatesPanel.tsx:131-137`, brauzerda "Issiq taomlar" guruhi), variant matnida narx yo'q
- 1-raund #3 (44px, kontrast) — bajarildi (o'lchandi: holat 44px, amallar 44px; nofaol `gray-700`)
- 1-raund #4 (Escape, role="dialog") — bajarildi (shablon modali Escape → yopildi; `:89` `role="dialog" aria-modal aria-labelledby`; o'chirish tasdig'i `:203` useEscape)
- 1-raund #5 (tab naqshi, bitta asosiy tugma) — bajarildi (`border-b-2`; shablonlar tabida "Yangi stol" yo'q, to'ldirilgan amber faqat "Yangi shablon")
- 1-raund #6 (bo'sh holat matni/tugma) — bajarilmadi (`TablesPage.tsx:400` "Stollar topilmadi"; `TableTemplatesPanel.tsx:231-235` tugmasiz)
- 1-raund #7 (375 da tugmalar karta ichida) — bajarildi (375 da bitta ustun, toshish yo'q) — lekin 1440/768 da yangi toshish (talab #1)
- 1-raund #8 (holat takrori) — bajarilmadi (`:424-426`)
- 1-raund #9 (`text-indigo-700`) — bajarilmadi (`:442`)

### Tekshirilmadi

- Bo'sh stol / bo'sh shablon holatlari vizual — bazada ma'lumot bor; koddan baholandi.
- O'zbekcha validatsiya xabarlari ekranda — lokal `APP_LOCALE=en`.
- Shablon saqlash/o'chirish, stol holatini o'zgartirish — taqiq.
