import { useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Circle } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../lib/auth';
import { FIRST_STEPS } from '../lib/guides';

/** API ro'yxat javobidan elementlar (paginate yoki oddiy massiv) */
function rows(d: unknown): unknown[] {
  const inner = (d as { data?: unknown })?.data ?? d;
  return Array.isArray(inner) ? inner : [];
}

/** Har qadam bajarilganmi — API'dan tekshiriladi (to → tekshiruv) */
const CHECKS: Record<string, { key: string; fn: () => Promise<boolean> }> = {
  '/menu': { key: 'fs-menu', fn: async () => rows((await api.get('/menu-items', { params: { per_page: 1 } })).data.data).length > 0 },
  '/tables': { key: 'fs-tables', fn: async () => rows((await api.get('/tables')).data.data).length > 0 },
  '/staff': {
    key: 'fs-staff',
    fn: async () => rows((await api.get('/users', { params: { per_page: 100 } })).data.data)
      .some((u) => (u as { role?: string }).role !== 'company_admin'),
  },
  '/cash-shifts': {
    key: 'fs-shift',
    fn: async () => {
      try {
        await api.get('/cash-shifts/current');
        return true;
      } catch {
        return false;
      }
    },
  },
};

/**
 * #25: rol bo'yicha "Birinchi qadamlar" — yangi restoran yordamsiz ishga tushishi uchun.
 * Hammasi bir marta bajarilsa, blok butunlay yashirinadi (smena keyin yopilsa ham qaytmaydi).
 */
export default function FirstSteps() {
  const { user } = useAuth();
  const doneKey = `first-steps:done:${user?.company_id ?? ''}`;
  const alreadyDone = localStorage.getItem(doneKey) === '1';
  const steps = (!alreadyDone && user?.role && FIRST_STEPS[user.role]) || [];
  const results = useQueries({
    queries: steps.map((s) => ({
      queryKey: [CHECKS[s.to]?.key ?? s.to],
      queryFn: CHECKS[s.to]?.fn ?? (async () => false),
      staleTime: 30_000,
    })),
  });

  const loading = results.some((r) => r.isLoading);
  const doneCount = results.filter((r) => r.data === true).length;
  const allDone = steps.length > 0 && !loading && doneCount === steps.length;
  useEffect(() => {
    if (allDone) localStorage.setItem(doneKey, '1');
  }, [allDone, doneKey]);

  if (steps.length === 0 || allDone) return null;

  return (
    <section aria-labelledby="first-steps-title" className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 id="first-steps-title" className="font-semibold text-gray-900">Birinchi qadamlar</h2>
        {!loading && <span className="text-sm text-gray-600">{doneCount} / {steps.length} bajarildi</span>}
      </div>
      <ol className="divide-y divide-gray-100">
        {steps.map((s, i) => {
          const done = results[i]?.data === true;
          return (
            <li key={s.to}>
              <Link to={s.to} className="flex items-center gap-3 min-h-14 py-2 rounded-lg hover:bg-gray-50 px-2 -mx-2">
                {done ? (
                  <CheckCircle2 size={22} className="text-green-700 shrink-0" aria-label="Bajarildi" />
                ) : (
                  <Circle size={22} className="text-gray-400 shrink-0" aria-label="Bajarilmagan" />
                )}
                <span className="flex-1">
                  <span className={`block text-sm font-medium ${done ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {i + 1}. {s.label}
                  </span>
                  <span className="block text-sm text-gray-600">{s.hint}</span>
                </span>
                <ChevronRight size={18} className="text-gray-400 shrink-0" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
