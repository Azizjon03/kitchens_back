---
name: ui-foundations
description: Use before writing or changing ANY UI in Kitchens.uz frontend/src — pages, modals, cards, badges, colors, money/date display, KDS/waiter/Telegram Mini App screens. Triggers - "sahifa qo'sh", "UI", "dizayn", "ko'rinish", new or edited .tsx under frontend/src. Defines the base that ui-data-table, ui-forms and ui-detail-page build on.
---

# UI asoslari (Tailwind v4 + lucide-react)

## Asosiy prinsip

React 19 + Vite SPA, **Tailwind v4**, ikonkalar `lucide-react`, TanStack
Query, react-router v6. UI-kutubxona (shadcn va h.k.) va i18n **yo'q**; umumiy
komponent faqat `Layout.tsx`, `ProtectedRoute.tsx`. Standart — **mavjud
sahifalardagi naqsh**: eng yaqin sahifadan aynan ko'chiriladi, yangi uslub
o'ylab topilmaydi. Jadval/karta-grid → `ui-data-table`; forma/modal →
`ui-forms`; bitta obyekt → `ui-detail-page`. Ish tugagach → `ui-review`.

"Tez kerak", "oddiy qil" — standartdan chiqishga asos emas.

## §1 Komponentlar va sahifa qobig'i

- Xodim sahifasi — **har doim** `<Layout>` ichida (sidebar, rolga qarab menyu).
  `/tg/*` (Telegram Mini App) — `Layout` siz, to'liq ekranli mobil sahifa.
- Ikonka — faqat `lucide-react` (`size={16|18|20}`). Emoji, SVG nusxa — yo'q.
- Modal — yagona naqsh (`fixed inset-0 bg-black/50 … bg-white rounded-2xl`),
  batafsil `ui-forms` §5.
- Input klassi — barcha sahifalardagi `inputClass` satri aynan:
  `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none`.
- Tugmalar (§2 jadvali) va holat badge'i (§3) — shu skill'dagi klasslar bilan.

> **Hozirgi holat (2026-10-31):** `components/ui/*` yo'q; `inputClass` har
> faylda, `DeleteConfirmModal` 5 sahifada, `formatPrice` 7 faylda nusxa. Yangi
> sahifa naqshni aynan takrorlaydi; umumiy komponentga ajratish — alohida
> kelishilgan ish.

## §2 Sahifa anatomiyasi va vizual izchillik

```tsx
<Layout>
  <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Buyurtmalar</h1>
      <p className="text-gray-500 text-sm mt-1">Barcha buyurtmalarni ko'rish va boshqarish</p>
    </div>
    <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors">
      <Plus size={18} /> Yangi buyurtma
    </button>
  </div>
  {/* Filter kartasi → Kontent kartasi / grid */}
</Layout>
```

| Element | Klass |
| --- | --- |
| Asosiy tugma | `bg-amber-700 text-white hover:bg-amber-800 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50` |
| Ikkinchi darajali | `border border-gray-300 text-gray-700 hover:bg-gray-50` (qolgani bir xil) |
| Matn-havola amal | `text-amber-600 hover:text-amber-700 font-medium text-sm` |
| Xavfli tasdiq | `bg-red-500 text-white hover:bg-red-600` (faqat tasdiq modalida) |
| Karta | `bg-white rounded-xl border border-gray-200` (+ `p-4`/`p-6`) |
| Ichki atribut bloki | `bg-gray-50 rounded-lg p-4` |

- `h1` sahifa tepasida, kontent kartasidan **tashqarida**. Breadcrumbs yo'q —
  detal sahifada "Orqaga" havolasi (`ui-detail-page` §1).
- Ekranda **bitta** to'ldirilgan asosiy tugma; qolganlari ikkinchi darajali
  yoki matn-havola. Bir qatorda 3–4 xil rangli to'ldirilgan tugma — buzilish.
- Oraliqlar Tailwind shkalasida: sarlavha ostida `mb-6`, bloklar orasida
  `mb-4`/`space-y-6`, karta ichida `gap-3`/`gap-4`. `p-[13px]` — taqiq.
- Modal/bo'lim sarlavhasi `text-lg font-semibold`; raqamlar `tabular-nums`.

## §3 Ranglar va holat badge'lari

Semantik tokenlar yo'q — Tailwind palitrasi, lekin **qat'iy rollar bilan**:

| Maqsad | Rang |
| --- | --- |
| Brend / asosiy amal / faol nav | oq matnli tugma `amber-700` (hover `amber-800`); matnsiz brend belgi (logo) `amber-500`; fon `amber-50`, matn `amber-700` |
| Sahifa foni / karta | `bg-gray-50` / `bg-white` |
| Asosiy / ikkilamchi matn | `text-gray-900` / `text-gray-500` |
| Chegara | `border-gray-200` (input — `border-gray-300`) |
| Xato | `bg-red-50 text-red-600 border border-red-100` |

- `bg-[#…]`, `text-[#…]` — **taqiq** (ui-lint K1). Yagona istisno — Telegram
  Mini App'da kompaniya brend rangi: `style={{ backgroundColor: primary }}`,
  `primary = company.primary_color || '#F59E0B'`.
- Dark mode yo'q — `dark:` juftlari talab qilinmaydi.
- Holat badge'i: `inline-block px-2.5 py-0.5 rounded-full text-xs font-medium`
  + xaritadan `bg`/`text`. Xarita fayl yuqorisida, komponentdan tashqarida.
  Buyurtma holatlari — kanonik `OrdersPage.tsx` `STATUS_MAP` (`-100` fon /
  `-700` matn): `preparing` Tayyorlanmoqda — amber; `ready` Tayyor — blue;
  `served` Berildi — purple; `paid` To'langan — green; `closed` Yopilgan —
  gray (`-600`); `cancelled` Bekor qilingan — red.

Faol/nofaol (kompaniya, filial, xodim): `bg-green-50 text-green-700` "Faol" /
`bg-red-50 text-red-700` "Nofaol". Bir holat — hamma sahifada bir xil rang.

> **Hozirgi holat:** `WaiterPage` `served` ni kulrang qiladi; yorliqlar 4
> faylda takror (Orders, Waiter, Kitchen, TgOrderStatus). KDS kartasidagi kutish ranglari (yashil < 5 daq, amber 5–15,
> qizil > 15) — holat emas, vaqt signali; saqlanadi.

## §4 Formatlash va umumiy yordamchilar

| Qiymat | Hozirgi kanonik shakl |
| --- | --- |
| Summa | `new Intl.NumberFormat('uz-UZ').format(n) + " so'm"` (`formatPrice`) |
| Vazn bo'yicha narx | `formatPrice(price) + '/kg'`; miqdor `${weight_kg} kg` yoki `× ${Number(quantity)}` |
| Sana / sana + vaqt | `new Date(d).toLocaleDateString('uz-UZ')` / `.toLocaleString('uz-UZ')` |
| Telefon | `formatPhone` maskasi `+998 (XX) XXX-XX-XX` |

- API summani satr qaytarishi mumkin — har doim `Number(...)` orqali.
- So'm butun: hisobda `Math.round` (TgCart naqshi), kasr tiyin ko'rsatilmaydi.
- Locale'siz `toLocaleString()` — **taqiq** (ajratgich brauzerga qarab o'zgaradi).
- Summa ustuni/katagi: `text-right` (+ `tabular-nums`).
- Bo'sh qiymat: `—`. `0` — bo'sh emas: `formatPrice(0)`; tarif narxi 0 → "Bepul".

> **Hozirgi holat:** markaziy `lib/format.ts` yo'q — `formatPrice` 7 faylda
> takrorlanadi; `DashboardPage`, `PlansPage`, `CompanyDetailPage` locale'siz
> `toLocaleString()` ishlatadi (buzilish). `lib/format.ts` paydo bo'lganda —
> faqat undan. ui-lint K5 (ogohlantirish) `uz-UZ` shaklini ham belgilaydi —
> reviewer uni locale'li bo'lsa ayirmaydi.

## §5 Holatlar

Har `useQuery` bloki to'rt holatni ko'rsatadi:

| Holat | Ko'rinish |
| --- | --- |
| Yuklanish | kontent shaklidagi `animate-pulse` blok (Dashboard, CompanyDetail naqshi) yoki karta ichida markazda spinner `w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin` |
| Qayta yuklash (sahifa/filter) | eski ma'lumot ekranda qoladi (`placeholderData: keepPreviousData`), sakrash yo'q |
| Ma'lumot yo'q | karta ichida lucide ikonka (`text-gray-300`, 40) + bir qator izoh + asosiy amal ("Yangi filial qo'shish") |
| Filter bo'yicha topilmadi | "Hech narsa topilmadi" + "Filtrlarni tozalash" — bo'sh holatdan **farqli** (`ui-data-table` §7) |
| Xato | `bg-red-50 text-red-600` blok + tushunarli o'zbekcha matn + "Qayta urinish" (`refetch`) |

- Real-time ekranlar (KDS, Ofitsiant): WebSocket uzilsa foydalanuvchi bilishi
  kerak — aks holda bo'sh ekran "buyurtma yo'q" deb tushuniladi.
- Mutatsiya xatosi — modal ichida (`ui-forms` §3), jim yutilmaydi.

> **Hozirgi holat:** `isError` faqat `OrdersPage` va `TgMenuPage` da
> ko'rsatiladi (retry faqat Tg'da); qolgan sahifalarda xato bo'sh holatga
> aylanib ketadi. `keepPreviousData` hech qayerda yo'q. KDS/Ofitsiant'da
> ulanish indikatori yo'q. Yangi kodda — jadvaldagi standart.

## §6 Matn va til

- Interfeys tili — **o'zbek (lotin)**, matn kodda to'g'ridan-to'g'ri yoziladi
  (`t()` va tarjima fayllari yo'q). Ruscha/inglizcha UI matn — yo'q.
- Kontent maydonlari ikki tilli (`name_uz`/`name_ru`): ko'rsatish
  `item.name_uz || item.name_ru`. Formada ikkala maydon ham bo'ladi.
- Atamalar izchil: Buyurtma, Stol, Filial, Xodim, Ofitsiant, Oshxona, Kassa,
  Smena, Menyu, Kategoriya, Qo'shimcha, Tarif, Kompaniya. Bir obyekt — bitta nom.
- Holat/tur yorliqlari — bitta xaritadan (`STATUS_MAP`, `TYPE_LABELS`); xom
  `order.status` (`occupied`, `cleaning`) ekranga chiqmaydi.

> **Hozirgi holat:** nav'da "Dashboard", "Super Admin", "Admin Panel"
> inglizcha; `WaiterPage` stol holatini xom (`t.status`) chiqaradi.

## §7 Accessibility va ergonomika (qurilmalar bo'yicha)

| Ekran | Qurilma | Talab |
| --- | --- | --- |
| Admin (Menyu, Xodimlar, Kompaniyalar…) | desktop, 768px gacha | layout buzilmaydi, jadval karta ichida `overflow-x-auto` |
| Ofitsiant, Stollar | planshet, sensor | bosiladigan zona ≥ 44px, asosiy amal bir bosishda |
| Oshxona (KDS) | devordagi ekran/planshet | 1–2 m dan o'qiladi: taom nomi ≥ `text-sm font-medium`, holat rangi + matn (faqat rang emas) |
| Telegram Mini App | telefon 360px | to'liq kenglik, pastki qat'iy savat paneli, tugma ≥ 44px |

- Kontrast ≥ 4.5:1 (kichik matn); `text-gray-400` — faqat ikonka/dekor.
- Klaviatura: fokus ko'rinadi (input `focus:ring-2 focus:ring-amber-500`,
  tugma `focus-visible:ring-2`); modal `Escape` bilan yopiladi.
- Ikonka-tugma (`X`, `Pencil`, `Trash2`) — `aria-label`; `title` yetarli emas
  (sensorli ekranda ko'rinmaydi).

> **Qaror (2026-10-31, #13):** oq matnli rangli tugma faqat WCAG AA (≥ 4.5:1)
> o'tadigan tusda — o'lchangan: `amber-700` 5.05, `green-700` 4.94, `blue-600`
> 5.26, `red-600` 4.76, `purple-600` 5.53. `*-500` + `text-white` — **taqiq**
> (amber-500 2.15, green-500 2.22). KDS "Tayyor" — `green-700` (istisno emas,
> shu qoida). Hover — bir pog'ona to'qroq.
> **Hozirgi holat:** Ikonka-tugmalarda faqat `title`
> (aria-label faqat Tg'da), tugmalarda focus halqasi yo'q, modallarda
> `Escape` yo'q, Tg "+" tugmasi 36px. Yangi kodda — standart.

## O'z-o'zini tekshirish

- [ ] Xodim sahifasi `Layout` ichida; ikonka faqat lucide
- [ ] Tugma/karta/input/modal klasslari §1–§2 dagidek; bitta asosiy tugma
- [ ] Hex rang yo'q (Tg brend rangi istisno); holat ranglari §3 jadvalidan
- [ ] Summa `uz-UZ` + " so'm", `Number()` orqali, `text-right`; locale'siz `toLocaleString` yo'q
- [ ] To'rt holat (§5), xato + "Qayta urinish" bor
- [ ] Matn o'zbekcha, atamalar izchil, xom status kodi chiqmaydi
- [ ] Ikonka-tugmada `aria-label`; qurilma talablari (§7) bajarilgan
- [ ] `ui-lint.sh <fayllar>` — K1–K4 xato yo'q; K5/K6 ogohlantirishlar ko'rib chiqilgan

## Qizil bayroqlar

| Fikr | Haqiqat |
| --- | --- |
| "shadcn/biror UI kutubxona qo'shib qo'yaman" | Kelishilmagan qaramlik. Mavjud naqsh ko'chiriladi |
| "Bitta joyga #hex qo'ysam bo'ladi" | Palitradagi rol yetmasa — so'rang. Hex faqat Tg brend rangi |
| "`toLocaleString()` yetadi" | Locale'siz — har brauzerda boshqacha. `uz-UZ` majburiy |
| "Xato bo'lsa bo'sh ro'yxat chiqadi, bo'ldi" | Kassir "buyurtma yo'q" deb o'ylaydi. Xato alohida ko'rsatiladi |
| "KDS ham oddiy sahifa" | Oshpaz uzoqdan, qo'li band holda qaraydi — §7 talablari |
