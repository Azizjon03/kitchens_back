import { useCallback, useEffect, useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import type { MenuItem } from '../../types';
import { formatMoney } from '../../lib/format';
import { addonUnitTotal, minWeightKg, type TgCartLine } from '../../lib/tgCart';
import { useEscape } from '../../lib/useEscape';
import { haptic, useTgBackButton } from '../../lib/tgTheme';
import DishImage from './DishImage';

/**
 * #35: taom oynasi — pastdan chiqadi. Son yoki vazn, qo'shimchalar (har biri soni bilan,
 * masalan oshga 2× go'sht), istaklar. Savatdagi qatorni tahrirlash uchun ham ishlatiladi.
 */
export default function TgItemSheet({
  item,
  initial,
  onClose,
  onSubmit,
}: {
  item: MenuItem;
  initial?: TgCartLine;
  onClose: () => void;
  onSubmit: (line: Omit<TgCartLine, 'key'>) => void;
}) {
  const isWeight = item.sell_type === 'weight';
  const minW = minWeightKg(item);
  const step = Number(item.weight_step) || 0.1;
  const [qty, setQty] = useState(initial?.quantity ?? 1);
  const [weight, setWeight] = useState(initial?.weight_kg ?? minW);
  const [addons, setAddons] = useState<Record<number, number>>(initial?.addons ?? {});
  const [mods, setMods] = useState<number[]>(initial?.modifier_ids ?? []);

  const close = useCallback(() => onClose(), [onClose]);
  useEscape(close);
  useTgBackButton(true, close);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const addonList = (item.addons ?? []).filter((a) => a.is_active !== false);
  const modList = (item.modifiers ?? []).filter((m) => m.is_active !== false);
  const unit = Number(item.price);
  const total = Math.round(
    isWeight ? unit * weight + addonUnitTotal(item, addons) : (unit + addonUnitTotal(item, addons)) * qty,
  );
  const round = (v: number) => Math.round(v * 1000) / 1000;
  const setAddon = (id: number, n: number) => setAddons((p) => ({ ...p, [id]: n }));

  const submit = () => {
    haptic('success');
    onSubmit({
      item,
      quantity: isWeight ? 1 : qty,
      weight_kg: isWeight ? weight : undefined,
      modifier_ids: mods,
      addons: Object.fromEntries(Object.entries(addons).filter(([, n]) => n > 0)),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(12,10,9,.55)' }} onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tg-item-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-t-3xl overflow-hidden motion-safe:animate-[tgSheetUp_.22s_ease-out]"
        style={{ background: 'var(--tg-card)', color: 'var(--tg-text)' }}
      >
        <div className="overflow-y-auto overscroll-contain">
          <div className={`relative w-full ${item.image ? 'aspect-[4/3]' : 'aspect-[16/7]'}`}>
            <DishImage src={item.image} name={item.name_uz} seed={item.id} eager />
            <button
              type="button"
              onClick={close}
              aria-label="Yopish"
              className="absolute right-3 top-3 h-11 w-11 rounded-full flex items-center justify-center bg-white/90 text-stone-900 shadow"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-5 pt-4 pb-2">
            <h2 id="tg-item-title" className="text-xl font-bold leading-snug">{item.name_uz}</h2>
            {item.description_uz && <p className="mt-1 text-[15px] leading-relaxed" style={{ color: 'var(--tg-hint)' }}>{item.description_uz}</p>}
            <p className="mt-2 text-lg font-bold tabular-nums">
              {formatMoney(unit)}
              {isWeight && <span className="text-base font-medium" style={{ color: 'var(--tg-hint)' }}> / 1 kg</span>}
            </p>
          </div>

          {isWeight && (
            <section className="px-5 py-3" aria-labelledby="tg-weight">
              <h3 id="tg-weight" className="text-base font-semibold mb-2">Qancha?</h3>
              <div className="flex items-center gap-3">
                <Stepper
                  value={`${round(weight)} kg`}
                  onMinus={() => setWeight((w) => Math.max(minW, round(w - step)))}
                  onPlus={() => setWeight((w) => round(w + step))}
                  minusDisabled={weight <= minW}
                  label="Vazn"
                />
                <span className="text-sm" style={{ color: 'var(--tg-hint)' }}>kamida {minW} kg</span>
              </div>
            </section>
          )}

          {addonList.length > 0 && (
            <section className="px-5 py-3" aria-labelledby="tg-addons">
              <h3 id="tg-addons" className="text-base font-semibold">Qo'shimchalar</h3>
              <p className="text-sm mb-1" style={{ color: 'var(--tg-hint)' }}>Har biridan bir nechta qo'shish mumkin</p>
              <ul>
                {addonList.map((a) => {
                  const n = addons[a.id] ?? 0;
                  const max = a.max_quantity ?? 5;
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-2 border-b last:border-b-0" style={{ borderColor: 'color-mix(in srgb, var(--tg-hint) 18%, transparent)' }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-medium">{a.name_uz}</div>
                        <div className="text-sm tabular-nums" style={{ color: 'var(--tg-hint)' }}>+{formatMoney(Number(a.price))}</div>
                      </div>
                      {n === 0 ? (
                        <button
                          type="button"
                          onClick={() => { haptic(); setAddon(a.id, 1); }}
                          aria-label={`${a.name_uz} qo'shish`}
                          className="h-11 w-11 rounded-full flex items-center justify-center"
                          style={{ background: 'color-mix(in srgb, var(--tg-accent) 14%, transparent)', color: 'var(--tg-accent)' }}
                        >
                          <Plus size={20} />
                        </button>
                      ) : (
                        <Stepper
                          value={`${n}`}
                          onMinus={() => setAddon(a.id, n - 1)}
                          onPlus={() => { haptic(); setAddon(a.id, Math.min(max, n + 1)); }}
                          plusDisabled={n >= max}
                          label={a.name_uz}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {modList.length > 0 && (
            <section className="px-5 py-3" aria-labelledby="tg-mods">
              <h3 id="tg-mods" className="text-base font-semibold mb-2">Istaklar</h3>
              <div className="flex flex-wrap gap-2">
                {modList.map((m) => {
                  const on = mods.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setMods((p) => (on ? p.filter((x) => x !== m.id) : [...p, m.id]))}
                      className="min-h-11 px-4 rounded-full text-[15px] font-medium inline-flex items-center gap-1.5 border"
                      style={on
                        ? { background: 'var(--tg-accent)', color: 'var(--tg-on-accent)', borderColor: 'var(--tg-accent)' }
                        : { borderColor: 'color-mix(in srgb, var(--tg-hint) 35%, transparent)', color: 'var(--tg-text)' }}
                    >
                      {on && <Check size={16} aria-hidden="true" />}
                      {m.name_uz}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          <div className="h-4" />
        </div>

        <div className="flex items-center gap-3 px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] border-t" style={{ borderColor: 'color-mix(in srgb, var(--tg-hint) 18%, transparent)' }}>
          {!isWeight && (
            <Stepper
              value={`${qty}`}
              onMinus={() => setQty((q) => Math.max(1, q - 1))}
              onPlus={() => setQty((q) => q + 1)}
              minusDisabled={qty <= 1}
              label="Soni"
            />
          )}
          <button
            type="button"
            onClick={submit}
            className="flex-1 min-w-0 min-h-12 rounded-2xl px-4 flex items-center justify-between gap-2 text-[15px] font-semibold whitespace-nowrap"
            style={{ background: 'var(--tg-accent)', color: 'var(--tg-on-accent)' }}
          >
            <span>{initial ? 'Saqlash' : "Qo'shish"}</span>
            <span className="tabular-nums">{formatMoney(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function Stepper({
  value,
  onMinus,
  onPlus,
  minusDisabled,
  plusDisabled,
  label,
}: {
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
  label: string;
}) {
  return (
    <div className="inline-flex items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--tg-hint) 14%, transparent)' }} role="group" aria-label={label}>
      <button type="button" onClick={onMinus} disabled={minusDisabled} aria-label={`${label}: kamaytirish`} className="h-11 w-11 flex items-center justify-center disabled:opacity-30">
        <Minus size={18} />
      </button>
      <span className="min-w-8 text-center text-base font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" onClick={onPlus} disabled={plusDisabled} aria-label={`${label}: ko'paytirish`} className="h-11 w-11 flex items-center justify-center disabled:opacity-30">
        <Plus size={18} />
      </button>
    </div>
  );
}
