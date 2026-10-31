import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { getEcho, kitchenChannel } from '../lib/echo';
import { useAuth } from '../lib/auth';
import type { Branch, Table, Order, Category, MenuItem } from '../types';
import Layout from '../components/Layout';
import { LoadingState, ErrorState } from '../components/QueryState';
import { apiErrorMessage } from '../lib/apiError';
import { Plus, Minus, X, Bell, Check, ClipboardList, Grid3X3 } from 'lucide-react';
import { formatMoney, formatTime } from '../lib/format';


const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none';

interface CartLine {
  key: string;
  item: MenuItem;
  quantity: number;
  weight_kg?: number;
  modifier_ids: number[];
  addon_ids: number[];
}

// ─── Order composer (create order on a table) ────────────────────

function OrderComposer({
  table,
  branchId,
  onClose,
}: {
  table: Table;
  branchId: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [error, setError] = useState('');

  const {
    data: categories = [],
    isLoading: menuLoading,
    isError: menuFailed,
    error: menuError,
    refetch: refetchMenu,
  } = useQuery<Category[]>({
    queryKey: ['pos-menu'],
    queryFn: async () => {
      const res = await api.get('/pos/menu');
      const payload = res.data.data;
      return (payload?.data ?? payload ?? []) as Category[];
    },
  });

  useEffect(() => {
    if (activeCat === null && categories.length > 0) setActiveCat(categories[0].id);
  }, [categories, activeCat]);

  const addItem = (item: MenuItem) => {
    setCart((prev) => [
      ...prev,
      {
        key: `${item.id}-${Date.now()}-${Math.round(prev.length)}`,
        item,
        quantity: 1,
        weight_kg: item.sell_type === 'weight' ? Number(item.min_weight) || 0.3 : undefined,
        modifier_ids: [],
        addon_ids: [],
      },
    ]);
  };

  const updateLine = (key: string, patch: Partial<CartLine>) =>
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const removeLine = (key: string) => setCart((prev) => prev.filter((l) => l.key !== key));

  const toggleId = (line: CartLine, field: 'modifier_ids' | 'addon_ids', id: number) => {
    const set = new Set(line[field]);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    updateLine(line.key, { [field]: Array.from(set) } as Partial<CartLine>);
  };

  const lineTotal = (l: CartLine) => {
    const base = l.item.sell_type === 'weight'
      ? Number(l.item.price) * (l.weight_kg || 0)
      : Number(l.item.price) * l.quantity;
    const addonsList = l.item.addons ?? [];
    const addonSum = l.addon_ids.reduce(
      (s, id) => s + Number(addonsList.find((a) => a.id === id)?.price ?? 0),
      0,
    );
    return base + addonSum * l.quantity;
  };

  const total = cart.reduce((s, l) => s + lineTotal(l), 0);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        branch_id: branchId,
        table_id: table.id,
        type: 'dine_in',
        items: cart.map((l) => ({
          menu_item_id: l.item.id,
          quantity: l.quantity,
          weight_kg: l.item.sell_type === 'weight' ? l.weight_kg : null,
          modifier_ids: l.modifier_ids,
          addon_ids: l.addon_ids,
        })),
      };
      return (await api.post('/orders', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiter-orders'] });
      queryClient.invalidateQueries({ queryKey: ['waiter-tables'] });
      onClose();
    },
    onError: (err: unknown) => {
      setError(apiErrorMessage(err));
    },
  });

  const activeItems = categories.find((c) => c.id === activeCat)?.menu_items ?? [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Stol #{table.number} — yangi buyurtma</h2>
          <button
            onClick={onClose}
            aria-label="Oynani yopish"
            className="min-h-11 min-w-11 -m-2 inline-flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden">
          {/* Menu */}
          <div className="border-r border-gray-100 flex flex-col overflow-hidden">
            <div className="flex gap-1 p-2 overflow-x-auto border-b border-gray-100">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`min-h-11 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                    activeCat === c.id ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {c.name_uz}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {menuLoading && <LoadingState label="Menyu yuklanmoqda..." />}
              {menuFailed && (
                <ErrorState error={menuError} onRetry={() => refetchMenu()} title="Menyuni yuklab bo'lmadi" />
              )}
              {activeItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="w-full min-h-11 flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-amber-50 text-left"
                >
                  <span className="text-base text-gray-900">{item.name_uz}</span>
                  <span className="text-sm text-gray-600 tabular-nums">
                    {formatMoney(Number(item.price))}
                    {item.sell_type === 'weight' ? '/kg' : ''}
                  </span>
                </button>
              ))}
              {!menuLoading && !menuFailed && activeItems.length === 0 && (
                <p className="text-sm text-gray-500 p-4 text-center">Bu kategoriyada taom yo'q</p>
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {cart.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">Savat bo'sh</p>
              )}
              {cart.map((l) => (
                <div key={l.key} className="border border-gray-200 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{l.item.name_uz}</span>
                    <button
                      onClick={() => removeLine(l.key)}
                      aria-label={`${l.item.name_uz} — savatdan olib tashlash`}
                      className="min-h-11 min-w-11 -m-2 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {l.item.sell_type === 'weight' ? (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        step={Number(l.item.weight_step) || 0.1}
                        min={Number(l.item.min_weight) || 0.1}
                        value={l.weight_kg ?? ''}
                        onChange={(e) => updateLine(l.key, { weight_kg: Number(e.target.value) })}
                        aria-label="Vazn, kg"
                        className="w-24 h-11 px-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                      />
                      <span className="text-sm text-gray-600">kg</span>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateLine(l.key, { quantity: Math.max(0.1, Math.round((l.quantity - 1) * 100) / 100) })
                        }
                        aria-label="Miqdorni kamaytirish"
                        className="min-h-11 min-w-11 inline-flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <Minus size={18} />
                      </button>
                      <input
                        type="number"
                        step={0.1}
                        min={0.1}
                        value={l.quantity}
                        onChange={(e) =>
                          updateLine(l.key, { quantity: Math.max(0.1, parseFloat(e.target.value) || 0.1) })
                        }
                        aria-label="Miqdor"
                        className="w-16 h-11 text-base text-center border border-gray-300 rounded-lg"
                      />
                      <button
                        onClick={() =>
                          updateLine(l.key, { quantity: Math.round((l.quantity + 1) * 100) / 100 })
                        }
                        aria-label="Miqdorni oshirish"
                        className="min-h-11 min-w-11 inline-flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  )}

                  {(l.item.modifiers ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(l.item.modifiers ?? []).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => toggleId(l, 'modifier_ids', m.id)}
                          className={`min-h-11 px-3 py-2 rounded-lg text-sm border ${
                            l.modifier_ids.includes(m.id)
                              ? 'bg-amber-700 text-white border-amber-700'
                              : 'bg-white text-gray-600 border-gray-200'
                          }`}
                        >
                          {m.name_uz}
                        </button>
                      ))}
                    </div>
                  )}

                  {(l.item.addons ?? []).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(l.item.addons ?? []).map((a) => (
                        <button
                          key={a.id}
                          onClick={() => toggleId(l, 'addon_ids', a.id)}
                          className={`min-h-11 px-3 py-2 rounded-lg text-sm border ${
                            l.addon_ids.includes(a.id)
                              ? 'bg-amber-700 text-white border-amber-700'
                              : 'bg-white text-gray-600 border-gray-200'
                          }`}
                        >
                          + {a.name_uz} ({formatMoney(Number(a.price))})
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-1 text-right text-xs font-medium text-gray-700">
                    {formatMoney(lineTotal(l))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 p-3 space-y-2">
              {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg">{error}</div>}
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Jami</span>
                <span>{formatMoney(total)}</span>
              </div>
              <button
                onClick={() => mutation.mutate()}
                disabled={cart.length === 0 || mutation.isPending}
                className="w-full min-h-12 px-4 py-3 bg-amber-700 text-white rounded-lg text-base font-medium hover:bg-amber-800 disabled:opacity-50"
              >
                {mutation.isPending ? 'Yuborilmoqda...' : 'Buyurtma berish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────

// Ranglar OrdersPage STATUS_MAP bilan bir xil — bir holat hamma sahifada bir xil ko'rinadi
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  preparing: { label: 'Tayyorlanmoqda', className: 'bg-amber-100 text-amber-700' },
  ready: { label: 'Tayyor', className: 'bg-blue-100 text-blue-700' },
  served: { label: 'Berildi', className: 'bg-purple-100 text-purple-700' },
};

// Ofitsiantning birinchi ishi — tayyor taomni olib borish: avval "Tayyor" (eng uzoq
// kutayotgani tepada), keyin tayyorlanayotganlar, oxirida berilganlar
const STATUS_ORDER: Record<string, number> = { ready: 0, preparing: 1, served: 2 };

const TABLE_STATUS_LABELS: Record<string, string> = {
  free: "Bo'sh",
  occupied: 'Band',
  reserved: 'Bron',
  cleaning: 'Tozalanmoqda',
  merged: 'Birlashtirilgan',
};

const TYPE_LABELS: Record<string, string> = {
  dine_in: 'Zalda',
  takeaway: 'Olib ketish',
  delivery: 'Yetkazib berish',
};


export default function WaiterPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState<number | null>(user?.branch_id ?? null);
  const [composerTable, setComposerTable] = useState<Table | null>(null);
  const [alerts, setAlerts] = useState<{ id: number; label: string }[]>([]);
  const [actionError, setActionError] = useState('');

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      const payload = res.data.data;
      return payload?.data ?? payload ?? [];
    },
  });

  useEffect(() => {
    if (branchId === null && branches.length > 0) setBranchId(branches[0].id);
  }, [branches, branchId]);

  const {
    data: tables = [],
    isLoading: tablesLoading,
    isError: tablesFailed,
    error: tablesError,
    refetch: refetchTables,
  } = useQuery<Table[]>({
    queryKey: ['waiter-tables', branchId],
    enabled: branchId !== null,
    queryFn: async () => {
      const res = await api.get('/tables', { params: { branch_id: branchId } });
      const payload = res.data.data;
      return payload?.data ?? payload ?? [];
    },
  });

  const {
    data: orders = [],
    isLoading: ordersLoading,
    isError: ordersFailed,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery<Order[]>({
    queryKey: ['waiter-orders', branchId],
    enabled: branchId !== null,
    queryFn: async () => {
      // active=1 — barcha faol buyurtmalar, eskidan yangiga (sahifalashsiz, #5)
      const res = await api.get('/orders', {
        params: { branch_id: branchId, status: 'preparing,ready,served', active: 1 },
      });
      const payload = res.data.data;
      return (payload?.data ?? payload ?? []) as Order[];
    },
  });

  // Real-time: alert when an order becomes ready.
  useEffect(() => {
    if (!user?.company_id || branchId === null) return;
    const echo = getEcho();
    const name = kitchenChannel(user.company_id, branchId);
    const channel = echo.private(name);

    channel.listen('.order.status', (e: { order: { id: number; status: string; table?: { number: number } | null; type: string } }) => {
      if (e.order.status === 'ready') {
        const label = e.order.table ? `Stol #${e.order.table.number}` : `#${e.order.id}`;
        setAlerts((prev) => [{ id: e.order.id, label }, ...prev.filter((a) => a.id !== e.order.id)]);
        try {
          const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = new Ctx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 660;
          gain.gain.value = 0.1;
          osc.start();
          osc.stop(ctx.currentTime + 0.25);
          osc.onended = () => ctx.close();
        } catch { /* ignore */ }
      }
      queryClient.invalidateQueries({ queryKey: ['waiter-orders', branchId] });
    });

    channel.listen('.order.created', () => {
      queryClient.invalidateQueries({ queryKey: ['waiter-orders', branchId] });
    });

    return () => {
      echo.leave(name);
    };
  }, [user?.company_id, branchId, queryClient]);

  const serveMutation = useMutation({
    mutationFn: async (id: number) => (await api.patch(`/orders/${id}/status`, { status: 'served' })).data,
    onSuccess: () => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['waiter-orders', branchId] });
    },
    // Xato jim yutilmaydi: ofitsiant "Berildi" o'tmaganini ko'rishi shart (#6)
    onError: (err) => setActionError(apiErrorMessage(err, "Buyurtmani 'Berildi' qilib bo'lmadi")),
  });

  const tableLabel = (o: Order) =>
    o.table ? `Stol #${o.table.number}` : `${TYPE_LABELS[o.type] ?? o.type} #${o.id}`;

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) =>
          (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) ||
          (a.created_at ?? '').localeCompare(b.created_at ?? ''),
      ),
    [orders],
  );

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Ofitsiant</h1>
        {branches.length > 1 && (
          <select
            value={branchId ?? ''}
            onChange={(e) => setBranchId(Number(e.target.value))}
            className={`${inputClass} w-auto`}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>
      {actionError && (
        <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base font-medium text-red-800">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError('')} className="shrink-0 -my-2 -mr-2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-red-700 hover:bg-red-100" aria-label="Xabarni yopish">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Ready alerts */}
      {alerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2.5"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Bell size={16} /> {a.label} — buyurtma tayyor!
              </span>
              <button
                onClick={() => setAlerts((prev) => prev.filter((x) => x.id !== a.id))}
                className="text-blue-500 hover:text-blue-700"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tables */}
      <h2 className="text-sm font-semibold text-gray-500 mb-2">Stollar</h2>
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2 mb-8">
        {tables.map((t) => {
          const isFree = t.status === 'free';
          return (
            <button
              key={t.id}
              onClick={() => isFree && setComposerTable(t)}
              disabled={!isFree}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-semibold border-2 transition-colors ${
                isFree
                  ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                  : t.status === 'occupied'
                    ? 'border-amber-300 bg-amber-50 text-amber-700 cursor-not-allowed'
                    : 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
              }`}
            >
              #{t.number}
              <span className="text-xs font-medium">{TABLE_STATUS_LABELS[t.status] ?? t.status}</span>
            </button>
          );
        })}
        {tablesLoading && (
          <div className="col-span-full">
            <LoadingState label="Stollar yuklanmoqda..." />
          </div>
        )}
        {!tablesLoading && !tablesFailed && tables.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">
            <Grid3X3 size={32} className="text-gray-300 mx-auto mb-2" aria-hidden="true" />
            Bu filialda hali stol yo'q
          </div>
        )}
      </div>

      {tablesFailed && (
        <div className="mb-6">
          <ErrorState error={tablesError} onRetry={() => refetchTables()} title="Stollarni yuklab bo'lmadi" />
        </div>
      )}

      {/* Active orders */}
      <h2 className="text-sm font-semibold text-gray-500 mb-2">Faol buyurtmalar</h2>
      {ordersLoading ? (
        <LoadingState label="Buyurtmalar yuklanmoqda..." />
      ) : ordersFailed ? (
        <ErrorState error={ordersError} onRetry={() => refetchOrders()} title="Buyurtmalarni yuklab bo'lmadi" />
      ) : sortedOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          <ClipboardList size={36} className="text-gray-300 mx-auto mb-2" aria-hidden="true" />
          Faol buyurtmalar yo'q
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedOrders.map((o) => (
            <div key={o.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">{tableLabel(o)}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    STATUS_MAP[o.status]?.className ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {STATUS_MAP[o.status]?.label ?? o.status}
                </span>
              </div>
              <div className={`flex items-center justify-between text-sm ${o.status === 'ready' && o.type === 'dine_in' ? 'mb-3' : ''}`}>
                <span className="text-gray-500 tabular-nums">{formatTime(o.created_at)}</span>
                <span className="font-medium text-gray-900 tabular-nums">{formatMoney(Number(o.total))}</span>
              </div>
              {o.status === 'ready' && o.type === 'dine_in' && (
                <button
                  onClick={() => serveMutation.mutate(o.id)}
                  disabled={serveMutation.isPending && serveMutation.variables === o.id}
                  className="w-full min-h-11 px-3 py-2.5 bg-amber-700 text-white rounded-lg text-base font-medium hover:bg-amber-800 disabled:opacity-50 inline-flex items-center justify-center gap-1"
                >
                  <Check size={18} /> {serveMutation.isPending && serveMutation.variables === o.id ? 'Saqlanmoqda...' : 'Berildi'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {composerTable && branchId !== null && (
        <OrderComposer
          table={composerTable}
          branchId={branchId}
          onClose={() => setComposerTable(null)}
        />
      )}
    </Layout>
  );
}
