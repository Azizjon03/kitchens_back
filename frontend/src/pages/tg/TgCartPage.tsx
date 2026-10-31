import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import tgApi, { tgErrorMessage, tgInit, tgTableId } from '../../lib/tgApi';
import { useTgCart, cartTotal, lineTotal, addonSummary, type TgCartLine } from '../../lib/tgCart';
import { tgThemeStyle, useTgBackButton } from '../../lib/tgTheme';
import DishImage from './DishImage';
import TgItemSheet, { Stepper } from './TgItemSheet';
import type { Category } from '../../types';
import { ArrowLeft, ShoppingBag, Trash2 } from 'lucide-react';
import { formatMoney } from '../../lib/format';
import { useOnline } from '../../lib/useOnline';
import TgOfflineBanner from './TgOfflineBanner';


interface TgMenuResponse {
  company: { primary_color?: string };
  // Company-wide setting, returned as a sibling of `company` by /tg/menu.
  service_charge_pct?: number | string | null;
  branches: { id: number; name: string; address?: string }[];
  menu: Category[];
}

export default function TgCartPage() {
  const navigate = useNavigate();
  const { cart, update, remove, clear } = useTgCart();
  const tableId = tgTableId();
  const [branchId, setBranchId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const online = useOnline();
  // #26: olib ketish yoki yetkazib berish; manzil bot ro'yxatidan oldindan to'ldiriladi
  const [orderType, setOrderType] = useState<'takeaway' | 'delivery'>('takeaway');
  const [address, setAddress] = useState<string | null>(null);
  // #26: bitta buyurtma uchun bitta kalit — tarmoq uzilib qayta yuborilsa ikki buyurtma bo'lmaydi
  const clientKey = useRef<string | null>(null);
  useEffect(() => {
    clientKey.current = null; // savat o'zgarsa — yangi buyurtma
  }, [cart, orderType, branchId]);

  useEffect(() => {
    tgInit();
  }, []);

  const { data } = useQuery<TgMenuResponse>({
    queryKey: ['tg-menu'],
    queryFn: async () => (await tgApi.get('/menu')).data.data as TgMenuResponse,
  });

  const { data: me } = useQuery<{ address: string | null; latitude: number | null; registered: boolean }>({
    queryKey: ['tg-me'],
    queryFn: async () => (await tgApi.get('/me')).data.data,
  });
  const addressValue = address ?? me?.address ?? '';
  const hasLocation = me?.latitude != null;

  const theme = tgThemeStyle(data?.company?.primary_color);
  const branches = data?.branches ?? [];

  useEffect(() => {
    if (!tableId && branchId === null && branches.length > 0) setBranchId(branches[0].id);
  }, [branches, branchId, tableId]);

  // #35: qatorni taom oynasi orqali tahrirlash
  const [editing, setEditing] = useState<TgCartLine | null>(null);
  const closeEdit = useCallback(() => setEditing(null), []);
  const goMenu = useCallback(() => navigate(`/tg${window.location.search}`), [navigate]);
  useTgBackButton(!editing, goMenu);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        items: cart.map((l) => ({
          menu_item_id: l.item.id,
          quantity: l.quantity,
          weight_kg: l.item.sell_type === 'weight' ? l.weight_kg : null,
          modifier_ids: l.modifier_ids,
          // #35: qo'shimcha soni
          addons: Object.entries(l.addons).filter(([, n]) => n > 0).map(([id, n]) => ({ id: Number(id), quantity: n })),
        })),
      };
      if (tableId) payload.table_id = tableId;
      else {
        payload.branch_id = branchId;
        payload.type = orderType;
        if (orderType === 'delivery' && addressValue.trim()) payload.delivery_address = addressValue.trim();
      }
      clientKey.current ??= typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      payload.client_key = clientKey.current;
      return (await tgApi.post('/orders', payload)).data;
    },
    onSuccess: (res) => {
      const order = res?.data;
      clientKey.current = null;
      clear();
      navigate(`/tg/order/${order.id}${window.location.search}`);
    },
    onError: (err: unknown) => {
      setError(tgErrorMessage(err, { fallback: "Buyurtmani yuborib bo'lmadi." }));
    },
  });

  // Whole so'm throughout — no fractional currency units, so round instead of
  // carrying floating-point remainders into the displayed/submitted total.
  const subtotal = Math.round(cartTotal(cart));
  const serviceChargePct = Number(data?.service_charge_pct) || 0;
  const serviceChargeAmount =
    serviceChargePct > 0 ? Math.round((subtotal * serviceChargePct) / 100) : 0;
  const total = subtotal + serviceChargeAmount;

  const divider = { borderColor: 'color-mix(in srgb, var(--tg-hint) 18%, transparent)' };
  const blocked = mutation.isPending || !online || (orderType === 'delivery' && !tableId && !hasLocation && !addressValue.trim());

  return (
    <div className="min-h-screen pb-40" style={{ ...theme, background: 'var(--tg-bg)', color: 'var(--tg-text)' }}>
      <TgOfflineBanner />
      <header className="sticky top-0 z-20 flex items-center gap-2 px-2 h-14" style={{ background: 'var(--tg-card)' }}>
        <button onClick={goMenu} aria-label="Menyuga qaytish" className="h-11 w-11 flex items-center justify-center rounded-full">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold">Savat</h1>
        {cart.length > 0 && (
          <button onClick={() => clear()} className="ml-auto min-h-11 px-3 text-[15px]" style={{ color: 'var(--tg-hint)' }}>
            Tozalash
          </button>
        )}
      </header>

      {cart.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <ShoppingBag size={44} className="mx-auto mb-3" style={{ color: 'var(--tg-hint)' }} aria-hidden="true" />
          <p className="text-[17px] font-semibold">Savat bo'sh</p>
          <p className="mt-1 text-[15px]" style={{ color: 'var(--tg-hint)' }}>Menyudan taom tanlang — shu yerda paydo bo'ladi.</p>
          <button onClick={goMenu} className="mt-5 min-h-12 px-6 rounded-2xl text-base font-semibold" style={{ background: 'var(--tg-accent)', color: 'var(--tg-on-accent)' }}>
            Menyuga o'tish
          </button>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          <ul className="rounded-2xl px-3" style={{ background: 'var(--tg-card)' }}>
            {cart.map((l) => {
              const summary = addonSummary(l);
              const mods = (l.item.modifiers ?? []).filter((m) => l.modifier_ids.includes(m.id)).map((m) => m.name_uz).join(', ');
              return (
                <li key={l.key} className="flex gap-3 py-3 border-b last:border-b-0" style={divider}>
                  <button type="button" onClick={() => setEditing(l)} className="h-16 w-16 shrink-0 rounded-xl overflow-hidden" aria-label={`${l.item.name_uz} — o'zgartirish`}>
                    <DishImage src={l.item.image} name={l.item.name_uz} seed={l.item.id} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <button type="button" onClick={() => setEditing(l)} className="text-left">
                      <div className="text-[15px] font-semibold leading-snug">{l.item.name_uz}</div>
                      {(summary || mods) && (
                        <div className="text-sm leading-snug mt-0.5" style={{ color: 'var(--tg-hint)' }}>
                          {[summary && `+ ${summary}`, mods].filter(Boolean).join('; ')}
                        </div>
                      )}
                    </button>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {l.item.sell_type === 'weight' ? (
                        <button type="button" onClick={() => setEditing(l)} className="min-h-11 px-3 rounded-full text-[15px] font-semibold" style={{ background: 'color-mix(in srgb, var(--tg-hint) 14%, transparent)' }}>
                          {l.weight_kg} kg
                        </button>
                      ) : (
                        <Stepper
                          value={`${l.quantity}`}
                          label={l.item.name_uz}
                          onMinus={() => (l.quantity <= 1 ? remove(l.key) : update(l.key, { quantity: l.quantity - 1 }))}
                          onPlus={() => update(l.key, { quantity: l.quantity + 1 })}
                        />
                      )}
                      <span className="text-base font-bold tabular-nums">{formatMoney(Math.round(lineTotal(l)))}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => remove(l.key)} aria-label={`${l.item.name_uz} — olib tashlash`} className="h-11 w-11 -mr-2 flex items-center justify-center" style={{ color: 'var(--tg-hint)' }}>
                    <Trash2 size={18} />
                  </button>
                </li>
              );
            })}
          </ul>

          {!tableId && (
            <section className="rounded-2xl p-4" style={{ background: 'var(--tg-card)' }} aria-label="Qanday olasiz?">
              <div role="radiogroup" aria-label="Qanday olasiz?" className="grid grid-cols-2 gap-1 p-1 rounded-xl" style={{ background: 'var(--tg-bg)' }}>
                {([['takeaway', 'Olib ketaman'], ['delivery', 'Yetkazib bering']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    role="radio"
                    aria-checked={orderType === val}
                    onClick={() => setOrderType(val)}
                    className="min-h-11 rounded-lg text-[15px] font-semibold"
                    style={orderType === val ? { background: 'var(--tg-card)', boxShadow: '0 1px 3px rgba(0,0,0,.12)' } : { color: 'var(--tg-hint)' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {orderType === 'delivery' && (
                <div className="mt-3">
                  <label htmlFor="tg-address" className="block text-sm font-medium mb-1">Manzil</label>
                  <input
                    id="tg-address"
                    value={addressValue}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ko'cha, uy, mo'ljal"
                    className="w-full h-12 px-3 rounded-xl text-[15px] outline-none"
                    style={{ background: 'var(--tg-bg)', color: 'var(--tg-text)' }}
                  />
                  <p className="mt-1.5 text-sm" style={{ color: 'var(--tg-hint)' }}>
                    {hasLocation ? '📍 Botga yuborgan joylashuvingiz kuryerga xarita sifatida boradi.' : "Manzilni aniq yozing — kuryer shu bo'yicha keladi."}
                  </p>
                </div>
              )}
              {branches.length > 1 && (
                <div className="mt-3">
                  <label htmlFor="tg-branch" className="block text-sm font-medium mb-1">Filial</label>
                  <select id="tg-branch" value={branchId ?? ''} onChange={(e) => setBranchId(Number(e.target.value))} className="w-full h-12 px-3 rounded-xl text-[15px]" style={{ background: 'var(--tg-bg)', color: 'var(--tg-text)' }}>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
            </section>
          )}

          <section className="rounded-2xl p-4 space-y-1.5 text-[15px]" style={{ background: 'var(--tg-card)' }}>
            <div className="flex justify-between"><span style={{ color: 'var(--tg-hint)' }}>Taomlar</span><span className="tabular-nums">{formatMoney(subtotal)}</span></div>
            {serviceChargeAmount > 0 && (
              <div className="flex justify-between"><span style={{ color: 'var(--tg-hint)' }}>Xizmat haqi ({serviceChargePct}%)</span><span className="tabular-nums">{formatMoney(serviceChargeAmount)}</span></div>
            )}
            <div className="flex justify-between pt-2 border-t text-[17px] font-bold" style={divider}><span>Jami</span><span className="tabular-nums">{formatMoney(total)}</span></div>
          </section>
        </div>
      )}

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]" style={{ background: 'linear-gradient(to top, var(--tg-bg) 75%, transparent)' }}>
          {error && <div role="alert" className="mb-2 rounded-xl px-3 py-2 text-sm bg-red-50 text-red-700">{error}</div>}
          <button
            onClick={() => { setError(''); mutation.mutate(); }}
            disabled={blocked}
            className="w-full min-h-14 rounded-2xl px-5 flex items-center justify-between text-base font-semibold disabled:opacity-50"
            style={{ background: 'var(--tg-accent)', color: 'var(--tg-on-accent)' }}
          >
            <span>{!online ? "Aloqa yo'q" : mutation.isPending ? 'Yuborilmoqda...' : 'Buyurtma berish'}</span>
            <span className="tabular-nums font-bold">{formatMoney(total)}</span>
          </button>
        </div>
      )}

      {editing && (
        <TgItemSheet
          item={editing.item}
          initial={editing}
          onClose={closeEdit}
          onSubmit={(line) => { update(editing.key, line); setEditing(null); }}
        />
      )}
    </div>
  );
}
