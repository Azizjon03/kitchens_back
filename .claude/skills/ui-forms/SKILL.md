---
name: ui-forms
description: Use when building or changing any form, modal form, create/edit modal, payment/discount/cancel modal, or destructive confirmation in Kitchens.uz frontend/src. Triggers - useMutation, "forma", "qo'shish modali", "tahrirlash", "saqlash", "o'chirish", "bekor qilish", <form>, modal with inputs. Requires ui-foundations.
---

# Formalar

Avval `ui-foundations` yuklangan bo'lsin. Formalar — oddiy `useState` +
TanStack `useMutation` + `api` (axios); forma kutubxonasi yo'q.

## §1 Maydon tuzilishi (har bir maydon)

```tsx
const [form, setForm] = useState({ name: branch?.name || '', phone: '+998 ' });

<div>
  <label htmlFor="branch-name" className="block text-sm font-medium text-gray-700 mb-1">
    Nomi <span className="text-red-500">*</span>
  </label>
  <input
    id="branch-name"
    type="text"
    required
    value={form.name}
    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
    placeholder="Filial nomi"
    aria-invalid={!!fieldErrors.name}
    className={inputClass}
  />
  {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
</div>
```

- `label htmlFor` ↔ input `id` (checkbox ham: `<input type="checkbox" id>` +
  `<label htmlFor>` yoki label ichiga o'ralgan). Majburiy maydon — `required`
  atributi **va** ko'rinadigan `*` (`text-red-500`).
- Placeholder label o'rnini bosmaydi — faqat namuna (`25000`, `Filial nomi`).
- Input klassi — `inputClass` (ui-foundations §1), boshqa uslub yo'q.
- Ikki tilli kontent (`name_uz`/`name_ru`, `description_uz`/`_ru`) — yonma-yon,
  label'da til: "Nomi (UZ)", "Nomi (RU)".

> **Hozirgi holat (2026-10-31):** 74 ta `<label>` dan faqat 6 tasida
> `htmlFor`; `*` belgisi faqat `CashShiftsPage` ("Farq sababi"); maydon
> ostidagi xato yo'q (§3).
> Yangi/o'zgargan formada — standart.

## §2 Input turlari

| Qiymat | Control |
| --- | --- |
| Narx (so'm) | `type="number" min="0" step="100"`, label'da "(so'm)" |
| Miqdor (porsiya) | `type="number" min="0.1" step="0.1"` (kasr porsiya — 0.7 mumkin) |
| Vazn (kg) | `type="number"`, `min={Number(item.min_weight)}`, `step={Number(item.weight_step)}` |
| Chegirma / pul summasi | `type="number" step="0.01"` + tur tanlovi (Foiz % / Summa so'm) |
| Telefon | `type="tel"` + `formatPhone` maskasi, yuborishda `unformatPhone` (`+998…`) |
| Sana | `type="date"` |
| Ro'yxatdan tanlash | native `<select className={inputClass}>` |
| Uzun matn (manzil, izoh, sabab) | `<textarea rows={2..3}>` |
| Ha/yo'q (Faol, Mavjud) | checkbox `w-4 h-4 text-amber-500 rounded focus:ring-amber-500` |
| Parol | `type="password"` + `Eye`/`EyeOff` ko'rsatish tugmasi (`aria-label`) |

- Native select'da "tanlanmagan" — `<option value="">`; yuborishdan oldin
  `undefined` ga aylantiriladi (`table_id: form.table_id || undefined`).
- Raqam yuborishda `Number(...)`; bo'sh satr `0` emas, `undefined`.

## §3 Validatsiya va xatolar

- Asosiy manba — server. Backend ikki shaklda qaytaradi:
  - `ApiResponse`: `{ success: false, error: { code, message } }`
  - Laravel 422: `{ message, errors: { field: ['...'] } }`
- O'qish tartibi: `errors[field][0]` → maydon ostida; `error.message` →
  `message` → `'Xatolik yuz berdi'` → forma tepasidagi umumiy blok.
  **MAJBURIY:** `apiErrorMessage(err)` va maydonlar uchun `apiFieldErrors(err)`
  (`lib/apiError.ts`) — qo'lda `response.data...` zanjiri yozilmaydi:

```tsx
{error && (
  <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
    {error}
  </div>
)}
```

- Klientda — faqat yordam (`required`, `min`, `step`, parol mosligi).
- Telegram Mini App'da — `tgErrorMessage(err, { fallback })` (`lib/tgApi.ts`),
  u xato kodlarini o'zbekcha matnga aylantiradi.

> **Hozirgi holat (2026-10-31, #6 dan keyin):** barcha sahifalar umumiy xabarni
> `apiErrorMessage` orqali o'qiydi (`detail` olib tashlandi, ui-lint K2 = 0).
> `errors` (422) hali hech qayerda **maydon ostiga** bog'lanmagan — `apiFieldErrors`
> tayyor, yangi/tahrirlanayotgan formada ishlatilsin.

## §4 Yuborish

```tsx
const mutation = useMutation({
  mutationFn: async () => (await api.post('/branches', payload)).data,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['branches'] });
    onClose();
  },
  onError: (err) => setError(/* §3 tartibi: errors → error.message → message */),
});

<div className="flex gap-3 pt-2">
  <button type="button" onClick={onClose} className="flex-1 … border border-gray-300 text-gray-700">Bekor qilish</button>
  <button type="submit" disabled={mutation.isPending} className="flex-1 … bg-amber-500 text-white disabled:opacity-50">
    {mutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
  </button>
</div>
```

- `onSubmit` da `e.preventDefault()` + `mutation.mutate()`; submit tugmasi
  `disabled={mutation.isPending}` — ikki marta yuborish (ikki buyurtma, ikki
  to'lov) yo'q. Yuklanish matni: "Saqlanmoqda...", "O'chirilmoqda...".
- Tugmalar: ikkinchi darajali chapda, asosiy o'ngda, ikkalasi `flex-1`.
- Muvaffaqiyat: tegishli `queryKey` invalidatsiya + modal yopiladi — ro'yxat
  yangilanishi signal vazifasini bajaradi. Natijasi ro'yxatda ko'rinmaydigan
  amal (parol, to'lov, smena yopish) — modal ichida yashil xabar
  (`bg-green-50 text-green-600`), keyin yopish (Layout parol modali naqshi).
- Toast kutubxonasi yo'q — kelishuvsiz qo'shilmaydi.

## §5 Modal yoki sahifa

Hamma formalar — modal (ui-foundations §1 naqshi). Kenglik maydonlar soniga qarab:

| Maydonlar | Konteyner |
| --- | --- |
| ≤ 6 | `max-w-md` |
| 7–12, ikki tilli maydonlar | `max-w-lg` / `max-w-2xl`, `max-h-[90vh] flex flex-col`, tana `overflow-y-auto` |
| Savat/ko'p bosqichli (buyurtma yaratish) | `max-w-2xl`+, tana scroll, amal tugmalari pastda qotgan |

- Modal shartli render qilinadi: `{showModal && <BranchModal … />}` — yopilganda
  holat o'z-o'zidan tozalanadi. Yashirib qo'yish (`hidden`) — yo'q.
- Qisqa maydonlar juft: `grid grid-cols-2 gap-4` (Narx + Tayyorlanish vaqti).
- Planshet/telefonda (`WaiterPage`, `/tg/*`) modal ekranga sig'adi, tugmalar ≥ 44px.

## §6 Xavfli amallar

O'chirish (filial, stol, xodim, taom), buyurtmani bekor qilish, smenani yopish —
**tasdiq modali**; `window.confirm` — taqiq.

```tsx
<DeleteConfirmModal
  title="Filialni o'chirish"
  message={`"${deleteTarget.name}" filialini o'chirishni tasdiqlaysizmi?`}
  onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
  onClose={() => setDeleteTarget(null)}
  isPending={deleteMutation.isPending}
/>
```

- Matnda **obyekt nomi va oqibati** aniq ("Buyurtma #128 bekor qilinadi. Bu
  amalni qaytarib bo'lmaydi.").
- Tasdiq tugmasi `bg-red-500 hover:bg-red-600`, `disabled={isPending}`,
  matni "O'chirilmoqda...".
- Xato modal ichida ko'rinadi (`deleteMutation.onError` → `setError`); jim
  yopilish yoki jim qolish — yo'q.
- Amal o'zi "bekor qilish" bo'lsa, yopuvchi tugma — "Orqaga" (`CancelModal`
  naqshi): yonma-yon ikkita "Bekor qilish" chalg'itadi.
- Buyurtmani bekor qilish — sabab (`reason`) majburiy `textarea`.

> **Hozirgi holat:** `DeleteConfirmModal` 5 faylda nusxa; o'chirish
> mutatsiyalarida `onError` yo'q — server rad etsa (masalan, faol buyurtmali
> stol) modal javobsiz qoladi.

## O'z-o'zini tekshirish

- [ ] Har maydon: `label htmlFor` + `id`; majburiy — `required` + `*`
- [ ] Input turi §2 bo'yicha; bo'sh select qiymati `undefined` ga aylanadi
- [ ] Xato: `errors[field]` maydon ostida, `error.message` tepada; `detail` emas
- [ ] `isPending` da tugma bloklanadi, "Saqlanmoqda..." ko'rinadi
- [ ] Muvaffaqiyat: invalidatsiya + yopish (yoki ko'rinadigan yashil xabar)
- [ ] Modal shartli render; kenglik §5 bo'yicha
- [ ] Xavfli amal — tasdiq modali, obyekt nomi, xato ko'rinadi

## Qizil bayroqlar

| Fikr | Haqiqat |
| --- | --- |
| "`detail || message` yetadi" | Backend `error.message` qaytaradi — foydalanuvchi faqat "Xatolik" ko'radi |
| "Server tekshiradi, tugmani bloklamayman" | Ikki bosish — ikki buyurtma yoki ikki to'lov |
| "O'chirish oddiy, `confirm()` yetadi" | Tasdiq modali — obyekt nomi va oqibat bilan |
| "Toast qo'shib qo'yaman" | Yangi qaramlik — kelishuvsiz yo'q; §4 dagi signal |
