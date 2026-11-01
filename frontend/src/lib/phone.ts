/**
 * #42: telefon raqam standarti — O'zbekiston, +998 va 9 raqam.
 * Ichki qiymat har doim E.164: "+998901234567" (to'liq bo'lmasa — "+99890...").
 * Nusxalangan "998 90 123 45 67", "+998(90)1234567", "90 123 45 67" — hammasi bir xil tushadi.
 */
export const UZ_PREFIX = '+998';

/** Istalgan matndan mahalliy 9 raqam (operator kodi + raqam) */
export function localDigits(raw: string): string {
  let d = (raw ?? '').replace(/\D/g, '');
  if (d.startsWith('998') && d.length > 9) d = d.slice(3);
  return d.slice(0, 9);
}

/**
 * Saqlangan qiymatdan mahalliy qism. "+998..." — har doim prefiks (qisman yozilgan
 * "+998901234" da ham), aks holda erkin matn sifatida o'qiladi.
 */
export function e164ToLocal(value: string): string {
  if ((value ?? '').startsWith(UZ_PREFIX)) return value.slice(UZ_PREFIX.length).replace(/\D/g, '').slice(0, 9);
  return localDigits(value);
}

/** E.164 qiymat: "+998" + mahalliy raqamlar (bo'sh bo'lsa — bo'sh satr) */
export function toE164(raw: string): string {
  const d = localDigits(raw);
  return d ? UZ_PREFIX + d : '';
}

export function isCompletePhone(value: string): boolean {
  return e164ToLocal(value).length === 9;
}

/** Mahalliy raqamlar niqobi: "(90) 123-45-67" (yozilayotganda qisman ham) */
export function maskLocal(local: string): string {
  const d = local.replace(/\D/g, '').slice(0, 9);
  if (!d) return '';
  // Ajratkichlar faqat keyingi raqam yozilganda qo'shiladi — aks holda Backspace ")" ni o'chira olmaydi
  let out = '(' + d.slice(0, 2);
  if (d.length > 2) out += ') ' + d.slice(2, 5);
  if (d.length > 5) out += '-' + d.slice(5, 7);
  if (d.length > 7) out += '-' + d.slice(7, 9);
  return out;
}

/** Ko'rsatish uchun: "+998 (90) 123-45-67"; O'zbekiston raqami bo'lmasa — o'zgarishsiz */
export function formatPhone(raw?: string | null): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!(digits.length === 12 && digits.startsWith('998')) && digits.length !== 9) return raw;
  const d = localDigits(digits);
  return `${UZ_PREFIX} (${d.slice(0, 2)}) ${d.slice(2, 5)}-${d.slice(5, 7)}-${d.slice(7, 9)}`;
}
