import { useState, type ChangeEvent, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/**
 * Raqam maydoni (narx, soni, vazn, summa). Oddiy type="number" ning muammolari:
 * maydonda "0" turgani uchun 1 yozilsa "01" bo'lib qolardi, qiymatni o'chirib yozishga
 * to'g'ri kelardi, sichqoncha g'ildiragi sonni sezdirmay o'zgartirardi.
 * - bosilganda butun qiymat tanlanadi — yozilgan raqam uning o'rniga tushadi;
 * - boshidagi ortiqcha nollar olib tashlanadi ("01" → "1", "0.5" qoladi);
 * - yozayotganda maydon bo'sh bo'lishi mumkin; chiqqanda min dan kichik bo'lsa — min.
 * Ota komponent avvalgidek onChange(e) da e.target.value ni o'qiydi.
 */
export default function NumberInput({ onChange, onFocus, onBlur, value, min, step, ...rest }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const decimal = step === undefined || step === 'any' || String(step).includes('.') || Number(step) < 1;
  const allowNegative = min !== undefined && Number(min) < 0;

  const emit = (raw: string, e?: ChangeEvent<HTMLInputElement>) => {
    onChange?.({ ...(e ?? {}), target: { ...(e?.target ?? {}), value: raw }, currentTarget: { value: raw } } as unknown as ChangeEvent<HTMLInputElement>);
  };

  const clean = (raw: string) => {
    let v = raw.replace(',', '.').replace(allowNegative ? /[^\d.-]/g : /[^\d.]/g, '');
    if (!decimal) v = v.replace(/\./g, '');
    const neg = allowNegative && v.startsWith('-');
    v = v.replace(/-/g, '');
    const [int, ...frac] = v.split('.');
    let out = int.replace(/^0+(?=\d)/, '');
    if (frac.length) out = (out || '0') + '.' + frac.join('');
    return (neg ? '-' : '') + out;
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      min={min}
      step={step}
      value={draft ?? (value ?? '')}
      onFocus={(e) => {
        setDraft(String(value ?? ''));
        e.currentTarget.select();
        onFocus?.(e);
      }}
      onChange={(e) => {
        const v = clean(e.target.value);
        setDraft(v);
        emit(v, e);
      }}
      onBlur={(e) => {
        const v = draft ?? '';
        setDraft(null);
        // Bo'sh qoldirilsa yoki min dan kichik bo'lsa — eng kam qiymat
        if (min !== undefined && (v === '' || v === '-' || Number(v) < Number(min)) && (rest.required || v !== '')) {
          emit(String(min));
        } else if (v.endsWith('.')) {
          emit(v.slice(0, -1));
        }
        onBlur?.(e);
      }}
    />
  );
}
