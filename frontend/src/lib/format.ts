/**
 * Summa, son va sana formatlash — yagona manba (#16).
 *
 * Sahifalarda `toLocaleString` / `Intl.*` / qo'lda `formatPrice` yozilmaydi (ui-lint K5):
 * natija brauzer va lokalga qarab o'zgarardi ("45,000 so'm" vs "45 000 so'm").
 *
 * Barcha funksiyalar null / undefined / yaroqsiz qiymatda '' qaytaradi —
 * bo'sh holat uchun `formatMoney(v) || '—'`.
 */

// Bo'linmas probel: "45 000 so'm" qatorga bo'linib ketmaydi
const NBSP = ' ';

type Num = number | string | null | undefined;

function toNumber(value: Num): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** 5000000 → "5 000 000"; 1234.5 → "1 234,5" (kasr faqat bo'lsa, ko'pi bilan 2 xona) */
export function formatNumber(value: Num): string {
  const n = toNumber(value);
  if (n === null) return '';
  const negative = n < 0;
  const [int, frac] = Math.abs(Math.round(n * 100) / 100).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const fraction = frac.replace(/0+$/, '');
  return `${negative ? '-' : ''}${grouped}${fraction ? `,${fraction}` : ''}`;
}

/** 45000 → "45 000 so'm" */
export function formatMoney(value: Num): string {
  const s = formatNumber(value);
  return s ? `${s}${NBSP}so'm` : '';
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "21.01.2026" — foydalanuvchi qurilmasi vaqtida (API UTC qaytaradi) */
export function formatDate(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  return d ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}` : '';
}

/** "14:30" — sekundsiz */
export function formatTime(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
}

/** "21.01.2026 14:30" */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  return d ? `${formatDate(d)} ${formatTime(d)}` : '';
}
