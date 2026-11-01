import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Minus, Plus, Trash2, X } from 'lucide-react';
import api from '../lib/api';
import type { Category, MenuItem, Table } from '../types';
import { LoadingState, ErrorState } from './QueryState';
import { apiErrorMessage } from '../lib/apiError';
import { formatMoney } from '../lib/format';
import { buildMenuTree } from '../lib/menuTree';
import { useEscape } from '../lib/useEscape';
import NumberInput from './NumberInput';
import { draftKey, loadDraft, type DraftLine } from '../lib/waiterDraft';

/**
 * #43: ofitsiantning buyurtma oynasi — qoralama → tasdiqlash → yuborish.
 * 1) Menyu: taom bosilsa qoralamaga qo'shiladi, menyu yopilmaydi; pastda doim
 *    «Buyurtma · 5 ta · 182 000» paneli. Qoralama stol bo'yicha saqlanadi (sahifa
 *    yangilansa yoki oyna yopilsa ham yo'qolmaydi).
 * 2) Tasdiqlash: taomlar, miqdor, istaklar, qo'shimchalar va jami — shu yerda
 *    o'zgartiriladi. «Tasdiqlash va yuborish» dan keyingina oshxonaga ketadi.
 */

const isSimple = (item: MenuItem) => item.sell_type !== 'weight';

/** Eng kami: porsiya 0.7, vazn 0.5 kg (yoki taomniki) */
const MIN_PORTION = 0.7;
const minWeight = (item: MenuItem) => Math.max(0.5, Number(item.min_weight) || 0);
const round2 = (n: number) => Math.round(n * 100) / 100;
/** 0.7 → 1 → 2 ...  /  2 → 1 → 0.7 → (olib tashlash: null) */
const qtyUp = (q: number) => (q < 1 ? 1 : round2(q + 1));
const qtyDown = (q: number) => (q <= MIN_PORTION ? null : round2(Math.max(MIN_PORTION, q - 1)));

function lineTotal(l: DraftLine): number {
  const addonUnit = Object.entries(l.addons).reduce((s, [id, q]) => {
    const a = (l.item.addons ?? []).find((x) => x.id === Number(id));
    return s + Number(a?.price ?? 0) * q;
  }, 0);
  if (l.item.sell_type === 'weight') return Number(l.item.price) * (l.weight_kg || 0) + addonUnit;
  return (Number(l.item.price) + addonUnit) * l.quantity;
}

function qtyLabel(l: DraftLine): string {
  return l.item.sell_type === 'weight' ? `${l.weight_kg ?? 0} kg` : `${l.quantity} ta`;
}

function Stepper({ value, onMinus, onPlus, label }: { value: string; onMinus: () => void; onPlus: () => void; label: string }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-gray-300">
      <button type="button" onClick={onMinus} aria-label={`${label}: kamaytirish`} className="min-h-11 min-w-11 inline-flex items-center justify-center text-gray-700 hover:bg-gray-50 rounded-l-lg">
        <Minus size={18} aria-hidden="true" />
      </button>
      <span className="min-w-14 text-center text-base font-semibold tabular-nums text-gray-900" aria-live="polite">{value}</span>
      <button type="button" onClick={onPlus} aria-label={`${label}: ko'paytirish`} className="min-h-11 min-w-11 inline-flex items-center justify-center text-gray-700 hover:bg-gray-50 rounded-r-lg">
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function OrderComposer({ table, branchId, onClose }: { table: Table; branchId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [lines, setLines] = useState<DraftLine[]>(() => loadDraft(table.id));
  const [step, setStep] = useState<'menu' | 'review'>('menu');
  const [activeTop, setActiveTop] = useState<number | null>(null);
  const [activeSub, setActiveSub] = useState<number | null>(null);
  const [error, setError] = useState('');
  useEscape(() => (step === 'review' ? setStep('menu') : onClose()));

  // Qoralama har o'zgarishda saqlanadi
  useEffect(() => {
    try {
      if (lines.length) localStorage.setItem(draftKey(table.id), JSON.stringify(lines));
      else localStorage.removeItem(draftKey(table.id));
    } catch { /* xotira yo'q — qoralama faqat shu oynada */ }
  }, [lines, table.id]);

  const { data: categories = [], isLoading, isError, error: menuError, refetch } = useQuery<Category[]>({
    queryKey: ['pos-menu'],
    queryFn: async () => {
      const payload = (await api.get('/pos/menu')).data.data;
      return (payload?.data ?? payload ?? []) as Category[];
    },
  });
  const tree = useMemo(() => buildMenuTree<MenuItem>(categories), [categories]);
  const topNode = tree.find((n) => n.category.id === activeTop) ?? tree[0];
  const subCat = topNode?.children.find((c) => c.id === activeSub) ?? topNode?.children[0];
  const items = subCat?.menu_items ?? [];

  const count = round2(lines.reduce((s, l) => s + (l.item.sell_type === 'weight' ? 1 : l.quantity), 0));
  const total = lines.reduce((s, l) => s + lineTotal(l), 0);
  const inDraft = (id: number) => round2(lines.filter((l) => l.item.id === id).reduce((s, l) => s + (l.item.sell_type === 'weight' ? 1 : l.quantity), 0));

  const update = (key: string, patch: Partial<DraftLine>) => setLines((p) => p.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const remove = (key: string) => setLines((p) => p.filter((l) => l.key !== key));

  const add = (item: MenuItem) => {
    setLines((prev) => {
      // Oddiy taom (istak/qo'shimchasiz qator bo'lsa) — sonini oshiramiz
      const same = isSimple(item) && prev.find((l) => l.item.id === item.id && !l.modifier_ids.length && !Object.keys(l.addons).length && !l.note);
      if (same) return prev.map((l) => (l === same ? { ...l, quantity: qtyUp(l.quantity) } : l));
      return [...prev, {
        key: `${item.id}-${Date.now()}-${prev.length}`,
        item,
        quantity: 1,
        weight_kg: item.sell_type === 'weight' ? minWeight(item) : undefined,
        modifier_ids: [],
        addons: {},
      }];
    });
  };
  const minusOne = (item: MenuItem) => {
    setLines((prev) => {
      const last = [...prev].reverse().find((l) => l.item.id === item.id);
      if (!last) return prev;
      const next = last.item.sell_type === 'weight' ? null : qtyDown(last.quantity);
      if (next === null) return prev.filter((l) => l !== last);
      return prev.map((l) => (l === last ? { ...l, quantity: next } : l));
    });
  };

  const send = useMutation({
    mutationFn: async () => (await api.post('/orders', {
      // Vazn eng kamidan kichik bo'lsa — eng kam vazn (server ham tekshiradi)
      branch_id: branchId,
      table_id: table.id,
      type: 'dine_in',
      items: lines.map((l) => ({
        menu_item_id: l.item.id,
        quantity: l.item.sell_type === 'weight' ? 1 : l.quantity,
        weight_kg: l.item.sell_type === 'weight' ? Math.max(minWeight(l.item), l.weight_kg ?? 0) : null,
        modifier_ids: l.modifier_ids,
        addons: Object.entries(l.addons).map(([id, quantity]) => ({ id: Number(id), quantity })),
        note: l.note?.trim() || null,
      })),
    })).data,
    onSuccess: () => {
      try { localStorage.removeItem(draftKey(table.id)); } catch { /* yo'q */ }
      queryClient.invalidateQueries({ queryKey: ['waiter-orders'] });
      queryClient.invalidateQueries({ queryKey: ['waiter-tables'] });
      queryClient.invalidateQueries({ queryKey: ['waiter-stats'] });
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, "Buyurtmani yuborib bo'lmadi. Qaytadan urinib ko'ring.")),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-stretch sm:items-center justify-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="oc-title" className="bg-white w-full sm:max-w-2xl sm:rounded-2xl sm:max-h-[92vh] flex flex-col">
        {/* Sarlavha */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
          {step === 'review' && (
            <button type="button" onClick={() => setStep('menu')} aria-label="Menyuga qaytish" className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100">
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
          )}
          <h2 id="oc-title" className="flex-1 text-lg font-semibold text-gray-900">
            Stol #{table.number} — {step === 'menu' ? 'taom tanlash' : 'tasdiqlang'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Yopish (qoralama saqlanadi)" className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {step === 'menu' ? (
          <>
            <div className="border-b border-gray-100">
              <div className="flex gap-1 p-2 overflow-x-auto" role="tablist" aria-label="Kategoriyalar">
                {tree.map(({ category: c }) => (
                  <button key={c.id} role="tab" aria-selected={topNode?.category.id === c.id}
                    onClick={() => { setActiveTop(c.id); setActiveSub(null); }}
                    className={`min-h-11 px-4 rounded-lg text-sm font-medium whitespace-nowrap ${topNode?.category.id === c.id ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    {c.name_uz}
                  </button>
                ))}
              </div>
              {topNode && topNode.children.length > 1 && (
                <div className="flex gap-1 px-2 pb-2 overflow-x-auto" role="tablist" aria-label="Sub-menyular">
                  {topNode.children.map((c) => (
                    <button key={c.id} role="tab" aria-selected={subCat?.id === c.id} onClick={() => setActiveSub(c.id)}
                      className={`min-h-11 px-3 rounded-full text-sm whitespace-nowrap border ${subCat?.id === c.id ? 'bg-amber-50 border-amber-600 text-amber-900 font-medium' : 'bg-white border-gray-300 text-gray-700'}`}>
                      {c.name_uz}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {isLoading && <li><LoadingState label="Menyu yuklanmoqda..." /></li>}
              {isError && <li className="p-3"><ErrorState error={menuError} onRetry={() => refetch()} title="Menyuni yuklab bo'lmadi" /></li>}
              {!isLoading && !isError && items.length === 0 && (
                <li className="p-6 text-center text-sm text-gray-600">{tree.length === 0 ? "Menyuda hali taom yo'q" : "Bu bo'limda taom yo'q"}</li>
              )}
              {items.map((item) => {
                const n = inDraft(item.id);
                return (
                  <li key={item.id} className={`flex items-center gap-3 px-3 py-2 ${n ? 'bg-amber-50/60' : ''}`}>
                    <button type="button" onClick={() => add(item)} className="flex-1 min-h-12 text-left">
                      <span className="block text-base font-medium text-gray-900">{item.name_uz}</span>
                      <span className="block text-sm text-gray-600 tabular-nums">{formatMoney(Number(item.price))}{item.sell_type === 'weight' ? ' / kg' : ''}</span>
                    </button>
                    {n > 0 ? (
                      <Stepper label={item.name_uz} value={String(n)} onMinus={() => minusOne(item)} onPlus={() => add(item)} />
                    ) : (
                      <button type="button" onClick={() => add(item)} aria-label={`${item.name_uz} qo'shish`} className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg bg-amber-700 text-white hover:bg-amber-800">
                        <Plus size={20} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Doimiy qoralama paneli */}
            <div className="border-t border-gray-200 p-3">
              <button type="button" onClick={() => setStep('review')} disabled={lines.length === 0}
                className="w-full min-h-12 px-4 flex items-center justify-between gap-3 rounded-lg bg-amber-700 text-white font-semibold hover:bg-amber-800 disabled:bg-gray-300 disabled:text-gray-600">
                <span>{lines.length === 0 ? 'Taom tanlang' : `Buyurtma · ${count} ta`}</span>
                <span className="tabular-nums">{lines.length > 0 && `${formatMoney(total)} →`}</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto p-3 space-y-3">
              {lines.map((l) => (
                <li key={l.key} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{l.item.name_uz}</p>
                      <p className="text-sm text-gray-600 tabular-nums">{qtyLabel(l)} · {formatMoney(lineTotal(l))}</p>
                    </div>
                    <button type="button" onClick={() => remove(l.key)} aria-label={`${l.item.name_uz} — olib tashlash`} className="min-h-11 min-w-11 -m-1 inline-flex items-center justify-center rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50">
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-2">
                    {l.item.sell_type === 'weight' ? (
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        Vazn
                        <NumberInput required step={Number(l.item.weight_step) || 0.1} min={minWeight(l.item)}
                          value={l.weight_kg ?? ''} onChange={(e) => update(l.key, { weight_kg: Number(e.target.value) || 0 })}
                          className="w-24 min-h-11 px-3 border border-gray-300 rounded-lg text-base" /> kg
                      </label>
                    ) : (
                      <Stepper label={l.item.name_uz} value={`${l.quantity} ta`}
                        onMinus={() => { const n = qtyDown(l.quantity); if (n === null) remove(l.key); else update(l.key, { quantity: n }); }}
                        onPlus={() => update(l.key, { quantity: qtyUp(l.quantity) })} />
                    )}
                  </div>

                  {(l.item.modifiers ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(l.item.modifiers ?? []).map((m) => {
                        const on = l.modifier_ids.includes(m.id);
                        return (
                          <button key={m.id} type="button" aria-pressed={on}
                            onClick={() => update(l.key, { modifier_ids: on ? l.modifier_ids.filter((x) => x !== m.id) : [...l.modifier_ids, m.id] })}
                            className={`min-h-11 px-3 rounded-lg text-sm border ${on ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-gray-700 border-gray-300'}`}>
                            {m.name_uz}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {(l.item.addons ?? []).length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {(l.item.addons ?? []).map((a) => {
                        const q = l.addons[a.id] ?? 0;
                        const max = a.max_quantity ?? 5;
                        const set = (n: number) => {
                          const next = { ...l.addons };
                          if (n <= 0) delete next[a.id];
                          else next[a.id] = Math.min(n, max);
                          update(l.key, { addons: next });
                        };
                        return (
                          <div key={a.id} className="flex items-center justify-between gap-2">
                            <span className="text-sm text-gray-800">+ {a.name_uz} <span className="text-gray-600 tabular-nums">{formatMoney(Number(a.price))}</span></span>
                            {q > 0 ? (
                              <Stepper label={a.name_uz} value={`×${q}`} onMinus={() => set(q - 1)} onPlus={() => set(q + 1)} />
                            ) : (
                              <button type="button" onClick={() => set(1)} aria-label={`${a.name_uz} qo'shish`} className="min-h-11 px-3 rounded-lg border border-gray-300 text-sm text-gray-800 hover:bg-gray-50">
                                Qo'shish
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <label className="mt-2 block">
                    <span className="sr-only">{l.item.name_uz} uchun izoh</span>
                    <input value={l.note ?? ''} onChange={(e) => update(l.key, { note: e.target.value })} maxLength={200}
                      placeholder="Izoh (ixtiyoriy): masalan, achchiq qilmang"
                      className="w-full min-h-11 px-3 border border-gray-300 rounded-lg text-sm" />
                  </label>
                </li>
              ))}
              {lines.length === 0 && <li className="p-6 text-center text-sm text-gray-600">Qoralama bo'sh — menyuga qaytib taom tanlang.</li>}
            </ul>

            <div className="border-t border-gray-200 p-3 space-y-2">
              {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
              <div className="flex items-center justify-between text-base font-semibold text-gray-900">
                <span>Jami · {count} ta</span>
                <span className="tabular-nums">{formatMoney(total)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setStep('menu')} className="min-h-12 rounded-lg border border-gray-300 text-gray-800 font-medium hover:bg-gray-50">
                  Taom qo'shish
                </button>
                <button type="button" onClick={() => { setError(''); send.mutate(); }} disabled={lines.length === 0 || send.isPending}
                  className="min-h-12 rounded-lg bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-50">
                  {send.isPending ? 'Yuborilmoqda...' : 'Tasdiqlash va yuborish'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
