import { useId, useState } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * #25: murakkab maydon yonidagi "?" — bosilganda (telefon) yoki ustiga kelganda
 * qisqa izoh. Matnlar lib/guides.ts → FIELD_HINTS.
 */
export default function HelpHint({ text, label = 'Izoh' }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="min-h-11 min-w-11 -my-3 inline-flex items-center justify-center text-gray-500 hover:text-amber-700"
      >
        <HelpCircle size={16} aria-hidden="true" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 top-full z-30 mt-1 w-64 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
