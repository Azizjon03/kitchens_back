import type { InputHTMLAttributes } from 'react';
import { e164ToLocal, localDigits, maskLocal, toE164, UZ_PREFIX } from '../lib/phone';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  /** E.164: "+998901234567" yoki bo'sh */
  value: string;
  onChange: (e164: string) => void;
  /** Tashqi ramka klassi (chegara, balandlik) */
  wrapperClassName?: string;
};

/**
 * #42: telefon maydoni — +998 o'zi turadi va o'chmaydi, foydalanuvchi faqat 9 raqam yozadi.
 * Niqob: (90) 123-45-67. To'liq raqam nusxalab qo'yilsa ham to'g'ri tushadi.
 */
export default function PhoneInput({ value, onChange, wrapperClassName, className, placeholder, ...rest }: Props) {
  return (
    <div
      className={
        wrapperClassName ??
        'flex items-center w-full min-h-11 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500'
      }
    >
      <span className="pl-3 pr-1.5 text-sm font-medium text-gray-700 select-none" aria-hidden="true">{UZ_PREFIX}</span>
      <input
        {...rest}
        type="tel"
        inputMode="tel"
        autoComplete={rest.autoComplete ?? 'tel-national'}
        value={maskLocal(e164ToLocal(value))}
        onChange={(e) => onChange(toE164(e.target.value))}
        onPaste={(e) => {
          // "+998 90 ..." nusxasi — 998 ni takrorlamasdan
          const text = e.clipboardData.getData('text');
          if (text) {
            e.preventDefault();
            onChange(toE164(localDigits(text)));
          }
        }}
        placeholder={placeholder ?? '(90) 123-45-67'}
        className={className ?? 'flex-1 min-w-0 h-full py-2 pr-3 bg-transparent text-sm outline-none placeholder:text-gray-400'}
      />
    </div>
  );
}
