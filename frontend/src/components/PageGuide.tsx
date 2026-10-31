import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { GUIDES, type GuideId } from '../lib/guides';

/**
 * Sahifa yo'riqnomasi (#25): "Bu bo'lim nima uchun?" + qisqa qadamlar.
 * Birinchi kirishda ochiq; foydalanuvchi yopsa, shu brauzerda eslab qoladi.
 * Matnlar lib/guides.ts da — bitta joyda tahrirlanadi va tarjima qilinadi.
 */
export default function PageGuide({
  id,
  title,
  intro,
  steps,
}: {
  /** lib/guides.ts dagi kalit (va saqlash kaliti) */
  id: GuideId | (string & {});
  title?: string;
  intro?: string;
  steps?: string[];
}) {
  const preset = (GUIDES as Record<string, { title: string; intro: string; steps: string[] }>)[id];
  const content = { title: title ?? preset?.title ?? '', intro: intro ?? preset?.intro ?? '', steps: steps ?? preset?.steps ?? [] };
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
          {content.title}
        </span>
        <span className="flex items-center gap-1 text-sm text-blue-800 shrink-0">
          {open ? "Yo'riqnomani yopish" : "Yo'riqnoma"}
          {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-blue-900">
          <p className="mb-2">{content.intro}</p>
          <ol className="list-decimal pl-5 space-y-1">
            {content.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
