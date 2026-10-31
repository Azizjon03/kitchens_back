# UI/UX rubrikasi — Kitchens.uz (yagona manba)

`ui-ux-reviewer` agenti va `ui-review` skill'i shu faylga tayanadi. O'zgartirish
faqat shu yerda. (CollPro rubrikasidan moslangan, 2026-10-31.)

## Mezonlar

| # | Mezon | Max | Qaysi skill bo'yicha | Tekshiriladi |
| --- | --- | --- | --- | --- |
| 1 | Ma'lumot ierarxiyasi | 2.0 | ui-detail-page §1–2, ui-data-table §1 | Rolning asosiy ishi birinchi ko'rinadi (oshpaz — tayyorlanayotgan buyurtmalar va kutish vaqti; ofitsiant — stollar holati; kassir — to'lanmagan summa; mijoz — menyu va savat jami); spec talab qilgan maydonlar bor; shovqin yo'q; **#25 yangi foydalanuvchi testi: tizimni birinchi ko'rgan odam (qishloqdagi oshxona egasi) yordamsiz shu sahifaning asosiy ishini bajara oladimi — yo'q bo'lsa Jiddiy** |
| 2 | Ro'yxat/jadval, filter, qidiruv, pagination | 1.5 | ui-data-table | §1–§7 |
| 3 | Holatlar | 1.5 | ui-foundations §5, ui-data-table §7 | yuklanish, bo'sh, topilmadi, **xato (server xabari ko'rinadi)**, real-time uzilishi (WS); **bo'sh holat keyingi qadamni aytadi** ("Hali stol yo'q" + "Stol qo'shish" tugmasi; faqat "topilmadi" — O'rta) |
| 4 | Dizayn tizimiga rioya | 1.5 | ui-foundations §1–§4 | Tailwind palitrasi (asosiy rang amber), lucide ikonkalari, mavjud sahifalardagi andozalar (modal, karta, tugma), `ui-lint.sh` |
| 5 | Formalar | 1.0 | ui-forms | §1–§6 |
| 6 | Accessibility va ergonomika | 1.0 | ui-foundations §7 | kontrast ≥ 4.5:1; focus ko'rinadi; ikonka-tugma `aria-label`; **ish muhiti**: KDS (uzoqdan o'qiladi, katta shrift/tugma), ofitsiant planshet (768px), TG Mini App mobil (375px, bosish maydoni ≥ 44px) |
| 7 | Vizual estetika va izchillik | 1.0 | ui-foundations §2 | muvozanat, tekislash, bir xil element bir xil ko'rinadi, boshqa sahifalar bilan uyg'un |
| 8 | Matn va til | 0.5 | ui-foundations §6 | hamma ko'rinadigan matn o'zbekcha (lotin), atamalar izchil; xom enum/kod (`preparing`, `PLAN_LIMIT_REACHED`) yoki inglizcha backend xabari ko'rinmaydi; pul/sana formati bir xil; **#25 soddalik**: texnik so'zlar (slug, modifier, KDS, webhook) izohsiz ko'rinmaydi, sahifada `PageGuide` yo'riqnomasi bor (matni `lib/guides.ts` da), murakkab maydon yonida `HelpHint` "?" izohi |

## Ball qo'yish (barqarorlik uchun)

Har mezon `max` dan boshlanadi, har topilma uchun ayiriladi:

| Topilma darajasi | Ayirish | Ta'rif |
| --- | --- | --- |
| Jiddiy | mezon max'ining 50% | MAJBURIY qoida buzilgan (skill'da "MAJBURIY"/"taqiq" deb yozilgan) yoki foydalanuvchi kerakli ma'lumotni topa olmaydi / noto'g'ri tushunadi / ishini bajara olmaydi |
| O'rta | 25% | Qoida buzilgan, lekin foydalanuvchi ishini bajara oladi |
| Kichik | 10% | Izchillik/estetika kamchiligi |

- Mezon bali 0 dan past tushmaydi.
- Bir xil sababli takroriy topilmalar (masalan, 5 ta modalda bir xil xato) — **bitta** topilma.
- `ui-lint.sh` **xato** (K1–K4) — 4-mezonda har bir qoida bo'yicha **o'rta**
  (K2 bundan tashqari 3-mezonda ham baholanadi: xabar ko'rinmasa — xato holati buzilgan).
  **Ogohlantirish** (K5, K6) — reviewer o'zi tasdiqlasa tegishli mezonda baholanadi, tasdiqlamasa ayirilmaydi.
- `N/A`: mezon sahifaga umuman tegishli bo'lmasa (forma yo'q → 5; ro'yxat yo'q → 2).
- **"Hozirgi holat" belgisi** (skill'larda loyiha hali yaratmagan standart, masalan
  markaziy formatter yo'q): sahifa loyihadagi mavjud andozaga mos bo'lsa — ayirilmaydi,
  faqat "Tavsiya" sifatida yoziladi.

## Yakuniy ball

`ball = Σ olingan / Σ max (N/A dan tashqari) × 10`, bir xonagacha yaxlitlanadi.

**Cheklov:** vizual tekshirilmagan (brauzer ochilmadi, ma'lumotli holat
ko'rilmadi, rolga kirib bo'lmadi) — yakuniy ball `min(ball, 7.5)`.

## Qabul

`ball ≥ 8.0` **va** `kitchens-qa-expert` PASS (veto yo'q). Qaror `ui-review`
skill'ida chiqariladi.
