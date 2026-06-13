import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { getEcho, kitchenChannel } from '../lib/echo';
import { useAuth } from '../lib/auth';
import type { Branch, Table, Order, Category, MenuItem } from '../types';
import Layout from '../components/Layout';
import { Plus, Minus, X, Bell, Check } from 'lucide-react';

function formatPrice(price: number) {
  return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
}

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

  const { data: categories = [] } = useQuery<Category[]>({
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
      const axiosErr = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      setError(axiosErr.response?.data?.error?.message || axiosErr.response?.data?.message || 'Xatolik yuz berdi');
    },
  });

  const activeItems = categories.find((c) => c.id === activeCat)?.menu_items ?? [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Stol #{table.number} — yangi buyurtma</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                    activeCat === c.id ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {c.name_uz}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {activeItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-amber-50 text-left"
                >
                  <span className="text-sm text-gray-900">{item.name_uz}</span>
                  <span className="text-xs text-gray-500">
                    {formatPrice(Number(item.price))}
                    {item.sell_type === 'weight' ? '/kg' : ''}
                  </span>
                </button>
              ))}
              {activeItems.length === 0 && (
                <p className="text-sm text-gray-400 p-4 text-center">Taom yo'q</p>
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {cart.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Savat bo'sh</p>
              )}
              {cart.map((l) => (
                <div key={l.key} className="border border-gray-200 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{l.item.name_uz}</span>
                    <button onClick={() => removeLine(l.key)} className="text-gray-400 hover:text-red-500">
                      <X size={16} />
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
                        className={`${inputClass} w-24`}
                      />
                      <span className="text-xs text-gray-500">kg</span>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateLine(l.key, { quantity: Math.max(0.1, Math.round((l.quantity - 1) * 100) / 100) })
                        }
                        className="p-1 border border-gray-200 rounded"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        step={0.1}
                        min={0.1}
                        value={l.quantity}
                        onChange={(e) =>
                          updateLine(l.key, { quantity: Math.max(0.1, parseFloat(e.target.value) || 0.1) })
                        }
                        className="w-16 text-sm text-center border border-gray-200 rounded py-1"
                      />
                      <button
                        onClick={() =>
                          updateLine(l.key, { quantity: Math.round((l.quantity + 1) * 100) / 100 })
                        }
                        className="p-1 border border-gray-200 rounded"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}

                  {(l.item.modifiers ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(l.item.modifiers ?? []).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => toggleId(l, 'modifier_ids', m.id)}
                          className={`px-2 py-0.5 rounded text-[11px] border ${
                            l.modifier_ids.includes(m.id)
                              ? 'bg-amber-500 text-white border-amber-500'
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
                          className={`px-2 py-0.5 rounded text-[11px] border ${
                            l.addon_ids.includes(a.id)
                              ? 'bg-green-500 text-white border-green-500'
                              : 'bg-white text-gray-600 border-gray-200'
                          }`}
                        >
                          + {a.name_uz} ({formatPrice(Number(a.price))})
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-1 text-right text-xs font-medium text-gray-700">
                    {formatPrice(lineTotal(l))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 p-3 space-y-2">
              {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg">{error}</div>}
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Jami</span>
                <span>{formatPrice(total)}</span>
              </div>
              <button
                onClick={() => mutation.mutate()}
                disabled={cart.length === 0 || mutation.isPending}
                className="w-full px-4 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
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

const STATUS_LABELS: Record<string, string> = {
  preparing: 'Tayyorlanmoqda',
  ready: 'Tayyor',
  served: 'Berildi',
};

export default function WaiterPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState<number | null>(user?.branch_id ?? null);
  const [composerTable, setComposerTable] = useState<Table | null>(null);
  const [alerts, setAlerts] = useState<{ id: number; label: string }[]>([]);

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

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ['waiter-tables', branchId],
    enabled: branchId !== null,
    queryFn: async () => {
      const res = await api.get('/tables', { params: { branch_id: branchId } });
      const payload = res.data.data;
      return payload?.data ?? payload ?? [];
    },
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['waiter-orders', branchId],
    enabled: branchId !== null,
    queryFn: async () => {
      const fetchStatus = async (status: string) => {
        const res = await api.get('/orders', { params: { branch_id: branchId, status } });
        const payload = res.data.data;
        return (payload?.data ?? payload ?? []) as Order[];
      };
      const [prep, ready, served] = await Promise.all([
        fetchStatus('preparing'),
        fetchStatus('ready'),
        fetchStatus('served'),
      ]);
      return [...prep, ...ready, ...served];
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waiter-orders', branchId] }),
  });

  const tableLabel = (o: Order) => (o.table ? `Stol #${o.table.number}` : `#${o.id}`);

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')),
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
                    : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              #{t.number}
              <span className="text-[10px] font-normal">{isFree ? 'Bo\'sh' : t.status}</span>
            </button>
          );
        })}
        {tables.length === 0 && <p className="text-sm text-gray-400">Stollar yo'q</p>}
      </div>

      {/* Active orders */}
      <h2 className="text-sm font-semibold text-gray-500 mb-2">Faol buyurtmalar</h2>
      {sortedOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
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
                    o.status === 'ready'
                      ? 'bg-blue-50 text-blue-700'
                      : o.status === 'served'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {STATUS_LABELS[o.status] ?? o.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{formatPrice(Number(o.total))}</p>
              {o.status === 'ready' && o.type === 'dine_in' && (
                <button
                  onClick={() => serveMutation.mutate(o.id)}
                  disabled={serveMutation.isPending}
                  className="w-full px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 inline-flex items-center justify-center gap-1"
                >
                  <Check size={16} /> Berildi
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
