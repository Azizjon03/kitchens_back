---
name: ui-detail-page
description: Use when building or changing a single-record view in Kitchens.uz frontend/src — company detail page, order detail modal, cash shift report, table/branch/staff detail, or any page/modal about one record. Triggers - "*DetailPage.tsx", "*DetailModal", "batafsil", "buyurtma tafsiloti", "kompaniya sahifasi", "smena hisoboti". Requires ui-foundations and ui-data-table.
---

# Detal (bitta obyekt) sahifa va modallar

Avval `ui-foundations` va `ui-data-table` yuklangan bo'lsin.

**Asosiy savol:** foydalanuvchi ochganda 3 soniyada nimani bilishi kerak?
Shu narsa eng yuqorida va eng katta bo'ladi.

Detal — **sahifa** (`CompanyDetailPage`: ko'p bo'limli, havola bilan
ulashiladi) yoki **modal** (`OrderDetailModal`, smena `ReportModal`: tez ish
oqimi).

## §1 Tuzilma (yuqoridan pastga)

1. **Sarlavha bloki** — chapda: kim/nima (`Buyurtma #128`, kompaniya nomi)
   `text-2xl font-bold` (modalda `text-lg font-semibold`), ostida ikkilamchi
   identifikator (slug, yaratilgan vaqt) `text-sm text-gray-500`. Holat
   badge'i sarlavha yonida. O'ngda 1–2 amal; modalda `X` (`aria-label`).
   Sahifada tepada "Orqaga": `Link` + `ArrowLeft` ("Kompaniyalarga qaytish").
2. **Asosiy raqamlar** — 2–4 karta `grid grid-cols-1 sm:grid-cols-3 gap-4`;
   label `text-xs text-gray-500`, qiymat `text-xl font-bold text-gray-900
   tabular-nums`.
3. **Bo'limlar** — har biri alohida karta (`bg-white rounded-xl border p-6`),
   sarlavha `text-lg font-semibold` + lucide ikonka; bog'liq ro'yxatlar
   (buyurtma taomlari, to'lovlar) — `ui-data-table` §1 bo'yicha jadval.
   Bo'lim ko'p bo'lsa — tab (`ui-data-table` §6).
4. **Amallar** (modalda) — pastki qotgan qator `p-6 border-t flex gap-2`.

Modal: `max-w-2xl max-h-[90vh] flex flex-col`, tana `overflow-y-auto` —
uzun buyurtmada amal tugmalari ko'rinib turadi.

> **Hozirgi holat (2026-10-31):** filterlar URL'da emas, shuning uchun
> "Orqaga" qat'iy `Link` bilan ro'yxatning boshlang'ich holatiga qaytaradi —
> URL filter (ui-data-table §4) joriy etilganda `navigate(-1)`/saqlangan URL.
> `CompanyDetailPage` da xato holati yo'q: xato ham "Kompaniya topilmadi"
> bo'lib chiqadi.

## §2 Obyektlar bo'yicha namuna

| Obyekt | Shakl | Sarlavha | Asosiy raqamlar / bloklar | Amallar |
| --- | --- | --- | --- | --- |
| **Buyurtma** | modal | `#ID` + holat + vaqt | Holat, Turi, Stol, Ofitsiant; taomlar (miqdor/kg, modifikatorlar); oraliq summa, chegirma, xizmat haqi, **jami**; to'lovlar | keyingi holat (`NEXT_STATUS`), To'lov, Chegirma, Bekor qilish |
| **Kompaniya** | sahifa | nom + slug + Faol/Nofaol | foydalanuvchilar, filiallar, buyurtmalar soni; aloqa ma'lumotlari; tarif | Tahrirlash, Tarifni o'zgartirish |
| **Kassa smenasi** | modal | "Smena hisoboti" + ochilgan/yopilgan vaqt | jami tushum, to'lov usuli bo'yicha tushum, kutilgan summa va farq | Smenani yopish (ochiq bo'lsa; farq bo'lsa sabab majburiy) |
| **Telegram buyurtma holati** | `/tg/order/:id` | `#ID` + holat | holat bosqichlari, taomlar, jami | Menyuga qaytish |

Spec (`docs/kitchecns_uz.md`) boshqacha talab qilsa — spec ustun.

## §3 Bir obyekt — bitta ko'rinish

Buyurtma xodim ilovasida **bitta** detal komponenti orqali ko'rsatiladi;
holat yorlig'i/rangi va `NEXT_STATUS` — bitta manbadan. Ikkinchi ekranga
(Ofitsiant, Stollar) buyurtma tafsiloti kerak bo'lsa — `OrderDetailModal`
qayta ishlatiladi (umumiy faylga ajratiladi), **nusxa ko'chirish taqiq**.

> **Hozirgi holat:** `OrderDetailModal`, `STATUS_MAP`, `NEXT_STATUS`
> `OrdersPage.tsx` ichida; `WaiterPage`, `KitchenPage`, `TgOrderStatusPage`
> o'z yorliq/rang xaritalarini saqlaydi.

## §4 Atributlar

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="bg-gray-50 rounded-lg p-4">
    <p className="text-xs text-gray-500 mb-1">Telefon</p>
    <p className="text-sm font-medium text-gray-900">{company.phone || '—'}</p>
  </div>
</div>
```

Summa — `formatPrice(Number(...))`, `text-right` jami qatorida; sana —
`toLocaleString('uz-UZ')`; telefon — `formatPhone`. Bo'sh — `—`. Jami summa
— blokdagi eng ko'zga tashlanadigan raqam (`font-semibold`/`text-lg`).
Izoh (`order.note`) — `bg-amber-50 text-amber-800` alohida blok.

## §5 Amallar va ruxsatlar

- Rol amalni **hech qachon** bajara olmasa — tugma ko'rsatilmaydi (`useAuth()`
  dagi `user.role`; masalan `chef` — faqat "Tayyor", `cashier` — To'lov).
- Holat bo'yicha: faqat ruxsat etilgan keyingi o'tish ko'rsatiladi
  (`NEXT_STATUS[order.type][order.status]`); `closed`/`cancelled` da amal
  qatori yashiriladi.
- Vaqtincha mumkin emas — `disabled` + sababi matnda.
- **Bitta** asosiy (amber) tugma — keyingi holat; qolganlari ikkinchi darajali,
  "Bekor qilish" — qizil chegarali/matnli, tasdiq modali bilan (`ui-forms` §6).

> **Hozirgi holat:** `OrderDetailModal` amal qatorida 4 ta to'ldirilgan
> rangli tugma (amber, yashil, ko'k, qizil) — ui-foundations §2 buzilishi;
> rol bo'yicha yashirish yo'q (backend rad etadi).

## O'z-o'zini tekshirish

- [ ] 3 soniya testi: nima, holat, jami summa — birinchi ekranda
- [ ] Sarlavha: identifikator + holat badge'i + ikkilamchi ma'lumot; ≤ 2 amal
- [ ] 2–4 raqam kartasi yoki atribut grid, `—` bo'sh qiymat
- [ ] Modal `max-h-[90vh]`, tana scroll, amallar ko'rinib turadi
- [ ] Rol va holat bo'yicha faqat mumkin amallar; bitta asosiy tugma
- [ ] Yuklanish (`animate-pulse`), topilmadi va xato holatlari alohida
- [ ] Obyekt boshqa ekranda ham bo'lsa — umumiy komponent

## Qizil bayroqlar

| Fikr | Haqiqat |
| --- | --- |
| "Hamma maydonni bitta kartaga chiqaraman" | Asosiy ma'lumot yo'qoladi — rubrika 1-mezon |
| "Ofitsiantga buyurtma modalini nusxa qilaman" | Ikki ekranda ikki xil holat/rang — umumiy komponent |
| "Hamma amal tugmasini rangli qilaman" | Asosiy amal ko'rinmay qoladi — bitta amber tugma |
| "Ruxsatni backend tekshiradi, tugma tursin" | Foydalanuvchi bosadi va xato oladi — tugma ko'rsatilmaydi |
