# UI review — Kompaniyalar (`frontend/src/pages/CompaniesPage.tsx`)

URL: `http://localhost:3001/companies` · rol: super_admin

## Raund 1 — 2026-10-31 — 6.2 / 10 (UI)

Vizual: tekshirildi (1440, 768) — `.playwright-mcp/ui-companies-1440.png`, `ui-companies-768.png`, `ui-companies-notfound-1440.png`, `ui-companies-modal-empty-1440.png`, `ui-companies-modal-dupslug-1440.png`, `ui-companies-error-1440.png`, `ui-companies-detail-1440.png`
Lint: `ui-lint: 0 xato, 0 ogohlantirish (1 fayl)` (CompaniesPage.tsx). Detal sahifa (`CompanyDetailPage.tsx`, ushbu raund bahosiga kirmaydi): 1 xato (K2 :125), 4 ogohlantirish (K5 :346, :473, :541, :549).

| # | Mezon | Ball | Izoh |
| --- | --- | --- | --- |
| 1 | Ma'lumot ierarxiyasi | 2.0 / 2.0 | Nom, slug, telefon, holat — kerakli ustunlar, shovqin yo'q |
| 2 | Ro'yxat, filter, qidiruv, pagination | 0.0 / 1.5 | Faqat 1-sahifa (15 ta) + klientda qidiruv, pagination yo'q (jiddiy); detal bor, lekin qator bosilmaydi (jiddiy, MAJBURIY) |
| 3 | Holatlar | 0.375 / 1.5 | Server xatosi "Kompaniyalar topilmadi" bo'lib chiqadi (jiddiy, 500 bilan tasdiqlandi); bo'sh = topilmadi bir xil matn, "Filtrlarni tozalash"/yaratish amali yo'q (o'rta). Yuklanish spinneri va modal ichidagi server xatosi — bor |
| 4 | Dizayn tizimiga rioya | 1.2 / 1.5 | Qidiruv filter-kartasiz, `max-w-sm` (kichik); `th` `text-gray-500 px-6` — kanonik `text-gray-600 px-4` emas (kichik) |
| 5 | Formalar | 0.4 / 1.0 | O'zgargan forma: `label htmlFor`/`id` va `*` yo'q (o'rta); 422 `errors.slug` maydonga bog'lanmagan, faqat tepada (o'rta); parolda Eye tugmasi yo'q (kichik). `isPending`, "Yaratilmoqda..." — bor |
| 6 | Accessibility va ergonomika | 1.0 / 1.0 | 768 da jadval sig'adi (718/718 px). Sahifaga xos topilma yo'q; tizimli kamchiliklar — Tavsiya |
| 7 | Vizual estetika va izchillik | 0.9 / 1.0 | "Batafsil" yonida `ExternalLink` ikonka — ichki o'tish tashqi havola kabi ko'rinadi (kichik) |
| 8 | Matn va til | 0.275 / 0.5 | Inglizcha backend xabari "The slug has already been taken." modalda (o'rta); "Egasi (Owner)" (kichik); telefon maskasiz `+998712000001` (kichik) |

Hisob: 6.15 / 10.0 → **6.2**

### Talablar (ustuvorlik bo'yicha)

1. **[2, jiddiy]** `frontend/src/pages/CompaniesPage.tsx:213-225` — `/super/companies` faqat 1-sahifa (backend `paginate(15)`, `CompanyController.php:36`) olinadi va `filter()` klientda; 16-kompaniyadan boshlab ro'yxatda ham, qidiruvda ham ko'rinmaydi. Backend `search` parametrini allaqachon qabul qiladi (`CompanyController.php:24`).
   **Qabul talabi:** qidiruv serverga `search` sifatida yuboriladi (`queryKey: ['companies', page, search]`), qidiruv o'zgarsa `setPage(1)`; `last_page > 1` bo'lsa jadval ostida "Sahifa X / Y (jami N ta)" + Oldingi/Keyingi (ui-data-table §4, §5). 16+ kompaniyada 2-sahifadagisi ko'rinadi va nomi bo'yicha topiladi.
2. **[2, jiddiy]** `frontend/src/pages/CompaniesPage.tsx:284` — detal sahifa bor, lekin `<tr>` bosilmaydi (tekshirildi: katakni bosish URL'ni o'zgartirmadi, `cursor: auto`).
   **Qabul talabi:** `<tr className="… cursor-pointer" onClick={() => navigate(`/companies/${company.id}`)}>`; "Batafsil" havolasi qolsa — `e.stopPropagation()` (ui-data-table §2).
3. **[3, jiddiy]** `frontend/src/pages/CompaniesPage.tsx:213, 265-269` — `isError` o'qilmaydi; `/super/companies` 500 qaytarganda ekranda "Kompaniyalar topilmadi" (`ui-companies-error-1440.png`).
   **Qabul talabi:** xato bo'lsa jadval kartasi o'rnida `bg-red-50 text-red-600` blok + o'zbekcha matn (server `error.message` bo'lsa — u) + "Qayta urinish" (`refetch`) (ui-foundations §5).
4. **[3, o'rta]** `frontend/src/pages/CompaniesPage.tsx:265-269` — bo'sh baza va qidiruv bo'yicha topilmadi bir xil "Kompaniyalar topilmadi"; tozalash tugmasi va yaratish amali yo'q (`ui-companies-notfound-1440.png`).
   **Qabul talabi:** qidiruv bo'sh bo'lmasa — "Qidiruv bo'yicha kompaniya topilmadi" + "Filtrlarni tozalash"; ro'yxat haqiqatan bo'sh bo'lsa — ikonka + "Hozircha kompaniyalar yo'q" + "Yangi kompaniya" amali (ui-data-table §7).
5. **[5, o'rta]** `frontend/src/pages/CompaniesPage.tsx:101-184` — 7 ta `<label>` ning birortasida `htmlFor`, inputlarda `id` yo'q (tekshirildi: `for=""`); majburiy maydonlarda `*` yo'q. Forma shu branch'da o'zgargan — standart amal qiladi (ui-forms §1).
   **Qabul talabi:** har label `htmlFor` ↔ input `id`; `required` maydonlar yonida `<span className="text-red-500">*</span>`; "Email (ixtiyoriy)" — yulduzchasiz.
6. **[5, o'rta]** `frontend/src/pages/CompaniesPage.tsx:60-64` — 422 javobi `{message, errors: {slug: [...]}}` keladi (takroriy slug bilan tekshirildi), lekin `errors` o'qilmaydi — xato faqat forma tepasida, qaysi maydon ekanini ko'rsatmaydi.
   **Qabul talabi:** `errors[field][0]` tegishli input ostida `mt-1 text-xs text-red-600` bilan, input `aria-invalid`; umumiy blokda faqat maydonga bog'lanmagan xabar (ui-forms §3).
7. **[8, o'rta]** `frontend/src/pages/CompaniesPage.tsx:63` + backend `APP_LOCALE=en` — takroriy slugda modalda "The slug has already been taken." (`ui-companies-modal-dupslug-1440.png`).
   **Qabul talabi:** takroriy slugda foydalanuvchi o'zbekcha xabar ko'radi (masalan "Bu slug band"): yo backend validatsiya xabarlari o'zbekcha (`lang/uz` yoki `messages()`), yo frontend `errors.slug` uchun o'z matnini beradi (ui-foundations §6).
8. **[4, kichik]** `frontend/src/pages/CompaniesPage.tsx:246-257, 275-279` — qidiruv filter kartasiz (`max-w-sm`), `th` `text-gray-500 px-6`.
   **Qabul talabi:** qidiruv `bg-white rounded-xl border p-4 mb-4` kartasida, `th` — `text-left px-4 py-3 font-medium text-gray-600` (ui-data-table §1, §4).
9. **[8, kichik]** `frontend/src/pages/CompaniesPage.tsx:137, 287` — "Egasi (Owner)" inglizcha qo'shimcha; telefon jadvalda maskasiz.
   **Qabul talabi:** "Kompaniya egasi (admin)"; jadvalda `formatPhone(company.phone)` → `+998 (71) 200-00-01` (ui-foundations §4).
10. **[5, kichik]** `frontend/src/pages/CompaniesPage.tsx:174-185` — parolda ko'rsatish tugmasi yo'q.
    **Qabul talabi:** `Eye`/`EyeOff` tugmasi `aria-label="Parolni ko'rsatish"` bilan (ui-forms §2, Layout parol modali naqshi).
11. **[7, kichik]** `frontend/src/pages/CompaniesPage.tsx:304` — `ExternalLink` ikonka ichki sahifaga o'tishda.
    **Qabul talabi:** ikonka olib tashlanadi yoki `ChevronRight`/`Eye` (yangi tab ochilmaydi).

### Tavsiya (ball ayirilmagan — "Hozirgi holat")

- Tizimli: `bg-amber-500` ustidagi oq matn ("Yangi kompaniya", "Yaratish") — o'lchandi 2.15:1 (ui-foundations §7 tizimli qayd).
- Tizimli: skill'dagi kanonik matn-havola `text-amber-600` oq fonda 3.19:1 ("Batafsil") — 4.5:1 dan past; skill'ning o'zida klassni `amber-700` ga almashtirish tavsiya etiladi.
- Modal `X` tugmasida `aria-label` yo'q (`:88`), `Escape` bilan yopilmaydi (tekshirildi) — tizimli (§7).
- Bo'sh forma yuborilganda brauzerning o'z xabari chiqadi ("Please fill out this field." — brauzer tiliga bog'liq). Server/klient matnini maydon ostida o'zbekcha ko'rsatish (ui-forms §3) bu muammoni ham yopadi.
- Filter holati URL'da emas — detaldan "Kompaniyalarga qaytish" qidiruvni yo'qotadi.
- Detal sahifa (`CompanyDetailPage.tsx`): K2 `:125` (`data?.detail`), locale'siz `toLocaleString()` `:346`, `:541`; yangi oqim kompaniya admini yaratadi, lekin detalda admin (ism/telefon) ko'rsatilmaydi — super admin kim kirishini bilmaydi.

### Oldingi raund talablari

- yo'q (1-raund)

### Tekshirilmadi

- 16+ kompaniyali holat — bazada 5 ta kompaniya; pagination muammosi koddan (`:213-225`, `CompanyController.php:36`).
- Muvaffaqiyatli yaratish oqimi — taqiqlangan amal (to'liq forma saqlash); faqat takroriy slug (422, hech narsa yaratilmadi) yuborildi.
