# UI review — Menyu (`frontend/src/pages/MenuPage.tsx`)

URL: `http://localhost:3001/menu` · rol: company_admin (`qa-tree-450426`, to'liq shablon bilan yaratilgan)

## Raund 1 — 2026-10-31 — 8.7 / 10 (UI)

Vizual: tekshirildi (1440, 768) — `.playwright-mcp/ui-menu-1440.png`, `ui-menu-expand.png`, `ui-menu-sub.png`, `ui-menu-notfound.png`, `ui-menu-dish-modal.png`, `ui-menu-768.png`
Lint: `ui-lint: 0 xato, 0 ogohlantirish (6 fayl)`
Brauzerda: daraxt (7 kategoriya), "Milliy taomlar" ochildi → 5 sub-menyu + "+ Sub-menyu qo'shish"; "Palov" tanlandi → 6 taom; qidiruv `zzzz-qa-yoq` → "Hech narsa topilmadi" + "Qidiruvni tozalash"; "Taom" modali — Sub-menyu `optgroup` bo'yicha guruhlangan (7 guruh), tanlangan "Palov" oldindan qo'yilgan. Saqlanmadi. Konsol: 0 xato.

| # | Mezon | Ball | Izoh |
| --- | --- | --- | --- |
| 1 | Ma'lumot ierarxiyasi | 1.8 / 2.0 | Ikki darajali daraxt + yo'riqnoma + "Kategoriya › sub-menyu" ustuni — aniq. "Barcha taomlar" (185 qator) aralash tartibda: Margarita, Hydrolife, Achchiq-chuchuk… (kichik) |
| 2 | Ro'yxat, filter, qidiruv, pagination | 1.125 / 1.5 | Qidiruv/topilmadi/tozalash ishlaydi. `per_page: 500`, pagination yo'q — 185 qator bitta sahifada (o'rta, ui-data-table §5) |
| 3 | Holatlar | 1.5 / 1.5 | Yuklanish, xato+retry (ikki so'rov uchun alohida), 3 xil bo'sh holat keyingi qadam bilan (`:760-800`) — #25 ga mos |
| 4 | Dizayn tizimiga rioya | 0.975 / 1.5 | "Narxi" ustuni `text-left` (o'rta, ui-foundations §4); `th` `text-gray-500 px-6` — kanonik `text-gray-600 px-4` emas (kichik) |
| 5 | Formalar | 0.9 / 1.0 | Sub-menyu oldindan tanlanadi, guruhlangan, `apiFieldErrors`. "Tavsif" label'larida `htmlFor` yo'q (kichik) |
| 6 | Accessibility va ergonomika | 1.0 / 1.0 | Daraxt tugmalarida `aria-label`, satrlar 44px; admin sahifa (desktop) |
| 7 | Vizual estetika va izchillik | 0.9 / 1.0 | 768 da daraxt ustida, ro'yxat pastda — sub-menyu bosilganda o'zgarish ekranda ko'rinmaydi (kichik) |
| 8 | Matn va til | 0.45 / 0.5 | "Mashhur" belgisi nima qilishi izohsiz (kichik) |

Hisob: 8.65 / 10.0 → **8.7**

### Talablar (ustuvorlik bo'yicha)

1. **[2, o'rta]** `frontend/src/pages/MenuPage.tsx:660-661` — `per_page: 500`, sahifalash yo'q; to'liq shablonli korxonada "Barcha taomlar" 185 qator.
   **Qabul talabi:** yo backend pagination (`Sahifa X / Y`, ui-data-table §5), yo "Barcha taomlar" ko'rinishida taomlar sub-menyu sarlavhalari bilan guruhlab chiqariladi (daraxt tartibida) va izoh bilan `per_page` saqlanadi. 185 taomda Palov taomlari bir joyda ko'rinadi.
2. **[4, o'rta]** `frontend/src/pages/MenuPage.tsx:1008, 1034` — summa ustuni chapga tekislangan.
   **Qabul talabi:** `th` va `td` `text-right tabular-nums` (ui-foundations §4).
3. **[1, kichik]** `frontend/src/pages/MenuPage.tsx:654-665` — "Barcha taomlar" tartibi daraxtga bog'liq emas.
   **Qabul talabi:** kategoriya → sub-menyu `sort_order`, keyin nom bo'yicha.
4. **[7, kichik]** `frontend/src/pages/MenuPage.tsx` (layout, 768) — sub-menyu tanlanganda jadval ekrandan pastda.
   **Qabul talabi:** `lg` dan kichik ekranda tanlovdan keyin jadvalga `scrollIntoView` yoki jadval tepasida tanlangan "Milliy taomlar › Palov" sarlavhasi + daraxt yig'iladi.
5. **[4, kichik]** `frontend/src/pages/MenuPage.tsx:1003-1010` — `th` `text-gray-500 px-6`.
   **Qabul talabi:** `text-left px-4 py-3 font-medium text-gray-600` (ui-data-table §1).
6. **[5, kichik]** `frontend/src/pages/MenuPage.tsx:437, 448` — "Tavsif (UZ/RU)" label'i inputga bog'lanmagan.
   **Qabul talabi:** `htmlFor` ↔ `id` (ui-forms §1).
7. **[8, kichik]** `frontend/src/pages/MenuPage.tsx:523` — "Mashhur" izohsiz.
   **Qabul talabi:** yonida qisqa izoh, nima o'zgarishini aytadi (masalan qayerda ajratib ko'rsatilishi).

### Tavsiya (ball ayirilmagan — "Hozirgi holat")

- Taom qatoridagi `Pencil`/`Trash2` faqat `title` bilan (`:1061-1083`), daraxtdagilarda esa `aria-label` bor — birxillashtirish.
- Modallar `Escape` bilan yopilmaydi (tekshirildi; eski modal, tizimli).
- #25: "Nomi (RU)" majburiy (backend `MenuItemController.php:55`, `CategoryController.php:32`) — qishloqdagi rus tilini bilmaydigan egasi uchun to'siq; ixtiyoriy qilib, bo'sh bo'lsa `name_uz` ko'rsatish mahsulot qarori sifatida ko'rib chiqilsin.

### Oldingi raund talablari

- yo'q (1-raund)

### Tekshirilmadi

- Xato holati (500) — simulyatsiya qilinmadi; koddan `ErrorState` (`:870, :997`).
- Saqlash/o'chirish oqimlari — taqiq.
