import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Sahifa yo'riqnomasi (#25): "Bu bo'lim nima uchun?" + qisqa qadamlar.
 * Birinchi kirishda ochiq; foydalanuvchi yopsa, shu brauzerda eslab qoladi.
 * Matnlar oddiy o'zbekcha, texnik so'zlarsiz — tizim qishloqdan megapolisgacha ishlaydi.
 */
export default function PageGuide({
  id,
  title,
  intro,
  steps,
}: {
  /** Saqlash kaliti, masalan "menu" — har sahifa uchun alohida */
  id: string;
  title: string;
  intro: string;
  steps: string[];
}) {
  const storageKey = `guide:${id}:closed`;
  const [open, setOpen] = useState(() => localStorage.getItem(storageKey) !== '1');

  const toggle = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem(storageKey, next ? '0' : '1');
  };

  return (
    <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full min-h-11 flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 font-medium text-blue-900">
          <BookOpen size={18} aria-hidden="true" />
          {title}
        </span>
        <span className="flex items-center gap-1 text-sm text-blue-800">
          {open ? "Yo'riqnomani yopish" : "Yo'riqnoma"}
          {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-blue-900">
          <p className="mb-2">{intro}</p>
          <ol className="list-decimal pl-5 space-y-1">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
