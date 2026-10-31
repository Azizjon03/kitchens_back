---
name: ui-data-table
description: Use when building or changing any list page, data table, card grid (tables, KDS orders, waiter orders), tabs, filter panel, search, sort or pagination in Kitchens.uz frontend/src. Triggers - "ro'yxat", "jadval", "filter", "qidiruv", "saralash", "pagination", "sahifalash", "tab", <table>, grid of cards. Requires ui-foundations.
---

# Jadval, karta-grid, filter, pagination

Avval `ui-foundations` yuklangan bo'lsin. Umumiy `Table`/`Pagination`/filter
komponenti **yo'q** — jadval oddiy `<table>` bilan, `OrdersPage.tsx` naqshida
yoziladi. Ro'yxat turini tanlash:

| Ma'lumot | Ko'rinish |
| --- | --- |
| Ko'p atributli yozuvlar (buyurtmalar tarixi, xodimlar, filiallar, smenalar, audit) | **jadval** |
| Jonli, tez harakat qilinadigan (KDS buyurtmalari, ofitsiant faol buyurtmalari) | **karta-grid** |
| Fizik joylashuv (stollar) | **kvadrat tile grid** (`grid-cols-3 sm:grid-cols-5 lg:grid-cols-8`) |

## §1 Ustunlar (jadval) va karta tarkibi

- Tartib: **identifikator** (`#ID`, nom) → asosiy atributlar (stol, tur,
  filial, rol) → **summa** → **holat** → sana/vaqt → amallar.
- Faqat shu ro'yxatda qaror uchun kerak ustunlar (odatda 4–7). Qolgani —
  detal modal/sahifada.
- Naqsh:

```tsx
<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50">
          <th className="text-left px-4 py-3 font-medium text-gray-600">#ID</th>
          <th className="text-right px-4 py-3 font-medium text-gray-600">Jami summa</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-gray-100 hover:bg-gray-50">
          <td className="px-4 py-3 font-medium text-gray-900">#{order.id}</td>
          <td className="px-4 py-3 text-right font-medium text-gray-900 tabular-nums">{formatPrice(Number(order.total))}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

- Tekislash: matn — chapda; summa va son — `text-right` (sarlavha `th` ham);
  holat — badge (ui-foundations §3).
- Uzun matn (manzil, izoh): `max-w-xs truncate` + `title={value}`.
- Bo'sh qiymat — `—`; stol yo'q (olib ketish/yetkazish) — `—`, tur ustunida ma'nosi.
- Karta-grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`;
  karta tepasida identifikator (stol / `#ID`) + holat, o'rtada tarkib, pastda
  **bitta** asosiy amal (`w-full`, "Tayyor", "Berildi").

> **Hozirgi holat (2026-10-31):** sarlavha uslubi ikki xil — `OrdersPage`
> (`font-medium text-gray-600`) va `BranchesPage`/`StaffPage` (`text-xs
> uppercase tracking-wider`). Kanonik — `OrdersPage`. `tabular-nums` hech
> qayerda yo'q.

## §2 Qatorni bosish

- **Detal bor bo'lsa (modal yoki sahifa) — qator bosiladi (MAJBURIY):**

```tsx
<tr
  key={order.id}
  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
  onClick={() => setSelectedOrder(order)}          // yoki navigate(`/companies/${c.id}`)
>
  …
  <td className="px-4 py-3 text-center">
    <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }} aria-label="Ko'rish">…</button>
  </td>
</tr>
```

- Amal katagidagi har tugma `e.stopPropagation()`.
- Detal yo'q, faqat CRUD (filial, stol, modifikator) — qator bosilmaydi;
  amallar ustunida ikonka-tugmalar (`Pencil` → tahrirlash modali, `Trash2` →
  tasdiq modali), `aria-label` bilan, `justify-end`.

> **Hozirgi holat:** `CompaniesPage` da detal sahifa bor, lekin qator
> bosilmaydi — faqat "Batafsil" havolasi (buzilish).

## §3 Sort

- Hozir sort UI **yo'q**; tartib backendda qat'iy (`orderByDesc('created_at')`,
  `orderBy('sort_order')`, `orderBy('number')`). Spec talab qilmasa, sort
  yo'qligi ayirilmaydi.
- Qo'shilganda: **sahifalangan jadvalda faqat serverda**; klientda faqat
  to'liq yuklangan ro'yxatda (KDS: `preparing` birinchi, keyin eng eskisi).
- URL/query nomlari: `sort_by` + `sort_dir` (`asc`|`desc`). Backend —
  whitelist, noma'lum qiymat standartga tushadi (422 emas):

```php
$sortBy = in_array($request->input('sort_by'), ['created_at', 'total'], true)
    ? $request->input('sort_by') : 'created_at';
$query->orderBy($sortBy, $request->input('sort_dir') === 'asc' ? 'asc' : 'desc')->orderBy('id');
```

## §4 Filter va qidiruv

- Joyi: jadval ustida alohida karta:

```tsx
<div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
  <div className="flex items-center gap-2 mb-3">
    <Filter size={16} className="text-gray-400" />
    <span className="text-sm font-medium text-gray-700">Filtrlar</span>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
    <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={inputClass}>
      <option value="">Barcha holatlar</option>
      …
    </select>
  </div>
</div>
```

- Control'lar `inputClass` (`w-full`), grid ichida; qat'iy `w-56` lar bilan
  `flex-wrap` qator emas.
- Tartib: **qidiruv** → holat/tur → filial → sana oralig'i (`date_from`/`date_to`,
  `type="date"`). "Barchasi" — `value=""`, so'rovga qo'shilmaydi.
- Filter o'zgarsa — **1-sahifaga** qaytadi (`setPage(1)`), `queryKey` ga
  hamma filter kiradi: `['orders', page, statusFilter, …]`.
- Qidiruv: sahifalangan ro'yxatda — serverga `search` parametri
  (`HistoryPage`); klientda `filter()` — faqat butun ro'yxat yuklangan bo'lsa.
- Faol filter bor bo'lsa — kartada "Filtrlarni tozalash" tugmasi.
- Filial bitta bo'lsa filial select'i ko'rsatilmaydi (`branches.length > 1`, KDS naqshi).
- Maqsad: filter holati URL'da (`useSearchParams`) — sahifa yangilanganda
  yoki detaldan qaytganda saqlanadi.

> **Hozirgi holat:** filterlar `useState` da (URL'da emas) — mavjud sahifalarda
> ayirilmaydi, yangi ro'yxatda URL afzal (kichik topilma). "Filtrlarni
> tozalash" hech qayerda yo'q. `CompaniesPage` faqat 1-sahifani (15 ta) olib,
> klientda qidiradi — 16-kompaniyadan boshlab ko'rinmaydi (buzilish).

## §5 Pagination

- Backend `->paginate(20)` → javob `data.data`, `current_page`, `last_page`,
  `total`. Frontend o'qishi: `data?.data?.data ?? data?.data ?? []`.
- Jadval kartasi ostida, faqat `lastPage > 1` bo'lsa:

```tsx
<div className="flex items-center justify-between mt-4">
  <p className="text-sm text-gray-500">Sahifa {currentPage} / {lastPage} (jami {total} ta)</p>
  <div className="flex gap-2">
    <button disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)} className="… border border-gray-300 disabled:opacity-50">
      <ChevronLeft size={16} /> Oldingi
    </button>
    <button disabled={currentPage >= lastPage} onClick={() => setPage((p) => p + 1)} className="…">
      Keyingi <ChevronRight size={16} />
    </button>
  </div>
</div>
```

- Sahifalanmaydigan kichik ro'yxatlar (filiallar, stollar, modifikatorlar —
  backend `->get()`) — pagination'siz.
- Sahifalangan endpoint'ni "hammasini olish" uchun `per_page: 100` bilan
  chaqirish — faqat ro'yxat haqiqatan kichik bo'lsa (StaffPage), izoh bilan.
- Sahifa almashganda eski ma'lumot qoladi (`placeholderData: keepPreviousData`).

## §6 Tablar

- Tab naqshi (`ModifiersPage`): `border-b border-gray-200 mb-6` ichida
  tugmalar; faol — `border-b-2 border-amber-500 text-amber-600`, nofaol —
  `text-gray-500 hover:text-gray-700`.
- Telegram Mini App kategoriyalari — gorizontal scroll qilinadigan pill'lar,
  `sticky top-0`, faol pill brend rangida.
- Holat bo'yicha ajratish — filter (buyurtmalar) yoki karta-grid tartibi (KDS);
  turdosh, lekin boshqa obyektlar (Modifikatorlar / Qo'shimchalar) — **tab**.
- Har tab o'z yuklanish va bo'sh holatiga ega.

## §7 Bo'sh va "topilmadi" holatlari

```tsx
{orders.length === 0 && (
  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
    {hasFilters ? (
      <>
        <p className="text-gray-500 text-sm">Filtr bo'yicha buyurtma topilmadi</p>
        <button onClick={clearFilters} className="mt-3 text-sm text-amber-600 hover:text-amber-700 font-medium">
          Filtrlarni tozalash
        </button>
      </>
    ) : (
      <>
        <ShoppingBag size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Hozircha buyurtmalar yo'q</p>
      </>
    )}
  </div>
)}
```

- Bo'sh holat — ikonka + izoh + (mumkin bo'lsa) yaratish amali ("Yangi
  filial qo'shish"). Filtrli holat — boshqa matn + tozalash tugmasi.
- Ikkala holat uchun bitta matn ("…mavjud emas yoki filtrlar bo'yicha natija
  topilmadi") — **buzilish** (hozir `OrdersPage` shunday).
- KDS/Ofitsiant: "Hozircha faol buyurtmalar yo'q" — faqat ulanish ishlayotgan
  bo'lsa (ui-foundations §5).

## O'z-o'zini tekshirish

- [ ] To'g'ri ko'rinish (jadval / karta-grid / tile); ustunlar §1 tartibida
- [ ] Summa `text-right` + `formatPrice(Number(...))`; holat — badge
- [ ] Detal bor → qator bosiladi, amal katagida `stopPropagation`
- [ ] Sahifalangan jadvalda klient sort/qidiruv yo'q
- [ ] Filter kartasi grid; o'zgarganda `setPage(1)`; `queryKey` da hamma filter
- [ ] Pagination `lastPage > 1` da, server ma'lumoti bilan
- [ ] Bo'sh ≠ topilmadi; filtrli holatda "Filtrlarni tozalash"
- [ ] Jadval karta ichida `overflow-x-auto` (768px)

## Qizil bayroqlar

| Fikr | Haqiqat |
| --- | --- |
| "20 qator, klientda sort/qidiruv qilaman" | Sahifalangan bo'lsa — faqat joriy sahifa. Serverda |
| "Birinchi sahifani olib, klientda filter qilaman" | `CompaniesPage` xatosi — qolgan yozuvlar yo'qoladi |
| "Hamma ustunni qo'shaman" | Ortiqcha ustun asosiysini yashiradi — rubrika 1-mezon |
| "Bo'sh va topilmadi — bitta xabar" | Filtrli holatda tozalash tugmasiz foydalanuvchi qamalib qoladi |
| "KDS'ni ham jadval qilaman" | Oshpazga karta kerak — bitta katta "Tayyor" tugmasi bilan |
