# UI review — Stoldagi narsalar (`frontend/src/components/TableSetModal.tsx`)

URL: `http://localhost:3001/waiter` → buyurtma kartasi "Stoldagi narsalar" · rol: waiter (`qa-478296`)

## Raund 1 — 2026-10-31 — 8.9 / 10 (UI)

Vizual: tekshirildi (1440, 768, 375) — `.playwright-mcp/ui-waiter-r4-768.png`, `ui-table-set-768.png`, `ui-table-set-375.png`, `ui-table-set-1440.png`
Lint: `ui-lint: 0 xato, 0 ogohlantirish (6 fayl)`
Stol #V1206 (shablon "QA VIP 1206"), faol buyurtma bor. Modal ochildi, "Saqlash" bosilmadi ("Orqaga" bilan yopildi). Konsol: 0 xato.

| # | Mezon | Ball | Izoh |
| --- | --- | --- | --- |
| 1 | Ma'lumot ierarxiyasi | 1.5 / 2.0 | Asosiy ish birinchi: har narsa uchun −/son/+, "Hisobga qo'shiladi: 90 000 so'm". "Stolda 3 ta · 45 000 so'm" — 45 000 bir donaning narxi, lekin jami summa deb o'qiladi (o'rta) |
| 2 | Ro'yxat, filter, qidiruv, pagination | N/A | Modal |
| 3 | Holatlar | 1.35 / 1.5 | Yuklanish, xato+retry, shablonsiz holat bor. Saqlash xatosi oddiy qizil matn, `bg-red-50` blok emas (kichik) |
| 4 | Dizayn tizimiga rioya | 1.5 / 1.5 | Modal/tugma naqshlari, `formatMoney`, `tabular-nums` |
| 5 | Formalar | 1.0 / 1.0 | Stepper `0..placed` oralig'ida cheklangan, `isPending`, "Saqlanmoqda..." |
| 6 | Accessibility va ergonomika | 0.75 / 1.0 | Barcha tugmalar 44×44 (o'lchandi), `aria-label`, `aria-live`. `Escape` bilan yopilmaydi (tekshirildi) — yangi kod (o'rta) |
| 7 | Vizual estetika va izchillik | 1.0 / 1.0 | 375/768/1440 da toza, 375 da sig'adi |
| 8 | Matn va til | 0.45 / 0.5 | "Orqaga" — boshqa modallarda "Bekor qilish" (kichik) |

Hisob: 7.55 / 8.5 × 10 = 8.88 → **8.9**

### Talablar (ustuvorlik bo'yicha)

1. **[1, o'rta]** `frontend/src/components/TableSetModal.tsx:83` — `Stolda {placed} ta · {formatMoney(price)}` dona narxini yorliqsiz ko'rsatadi; ofitsiant "Shashlik — 200 000" ni 4 tasining jami deb tushunadi.
   **Qabul talabi:** "Stolda 4 ta · donasi 200 000 so'm" ko'rinishida (narx yorlig'i bilan), yoki o'ng tomonda shu qator bo'yicha hisobga qo'shiladigan summa (`n × price`).
2. **[6, o'rta]** `frontend/src/components/TableSetModal.tsx:54-56` — `Escape` tinglanmaydi.
   **Qabul talabi:** `Escape` → `onClose` (ui-foundations §7).
3. **[3, kichik]** `frontend/src/components/TableSetModal.tsx:103` — saqlash xatosi `<p className="text-sm text-red-600">`.
   **Qabul talabi:** `bg-red-50 text-red-600 border border-red-100 rounded-lg px-4 py-3` blok (ui-forms §3).
4. **[8, kichik]** `frontend/src/components/TableSetModal.tsx:107` — "Orqaga".
   **Qabul talabi:** "Bekor qilish" (ui-forms §4 atamasi).

### Tavsiya (ball ayirilmagan — "Hozirgi holat")

- Tez amal: "Hammasi ochildi" / "Hech biri" tugmalari — 6+ narsali shablonda bosishlar kamayadi.
- #25: WaiterPage'da `PageGuide` yo'q — ofitsiant uchun "Stoldagi narsalar" nimaligi bir jumlada.
- Regressiya tekshiruvi: TG Mini App (`qa-tree-450426`, 375) — kategoriya va sub-menyu tablari 44px (o'lchandi, `.playwright-mcp/ui-tg-menu-r-375.png`) — regressiya yo'q.

### Oldingi raund talablari

- yo'q (1-raund)

### Tekshirilmadi

- Kassir oqimi (`/orders` → buyurtma detali → "Stoldagi narsalar") — ofitsiant oqimi mavjud bo'lgani uchun ochilmadi.
- Saqlash va saqlash xatosi — taqiq ("Saqlash" bosilmadi); xato bloki koddan.
- WaiterPage composer — vaqt yetmadi.
