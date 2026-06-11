import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { getEcho, kitchenChannel } from '../lib/echo';
import { useAuth } from '../lib/auth';
import type { Branch } from '../types';
import Layout from '../components/Layout';

// ─── Types matching Order::toBroadcastArray() ────────────────────

interface KdsModifier {
  id: number;
  name_uz?: string;
  name_ru?: string;
}

interface KdsItem {
  id: number;
  name_uz?: string;
  name_ru?: string;
  quantity: number;
  weight_kg?: number | null;
  note?: string | null;
  modifiers: KdsModifier[];
  addons: KdsModifier[];
}

interface KdsOrder {
  id: number;
  company_id: number;
  branch_id: number;
  type: 'dine_in' | 'takeaway' | 'delivery';
  status: string;
  note?: string | null;
  total?: number;
  created_at?: string;
  table?: { id: number; number: number } | null;
  items: KdsItem[];
}

const TYPE_LABELS: Record<string, string> = {
  dine_in: 'STOL',
  takeaway: 'OLIB KETISH',
  delivery: 'YETKAZISH',
};

// Play a short beep using the Web Audio API (no asset needed).
function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    osc.onended = () => ctx.close();
  } catch {
    /* ignore */
  }
}

function minutesSince(iso?: string): number {
  if (!iso) return 0;
  const created = new Date(iso).getTime();
  return Math.max(0, Math.floor((Date.now() - created) / 60000));
}

// ─── Order card ──────────────────────────────────────────────────

function OrderCard({
  order,
  now,
  onReady,
  isPending,
}: {
  order: KdsOrder;
  now: number;
  onReady: (id: number) => void;
  isPending: boolean;
}) {
  void now; // re-render trigger for elapsed time
  const mins = minutesSince(order.created_at);

  const border =
    order.status === 'ready'
      ? 'border-blue-400'
      : mins > 15
        ? 'border-red-500'
        : mins >= 5
          ? 'border-amber-400'
          : 'border-green-500';

  const headerBg =
    order.status === 'ready'
      ? 'bg-blue-50 text-blue-700'
      : mins > 15
        ? 'bg-red-50 text-red-700'
        : mins >= 5
          ? 'bg-amber-50 text-amber-700'
          : 'bg-green-50 text-green-700';

  return (
    <div className={`bg-white rounded-xl border-2 ${border} overflow-hidden flex flex-col`}>
      <div className={`flex items-center justify-between px-3 py-2 ${headerBg}`}>
        <span className="font-bold text-sm">
          {TYPE_LABELS[order.type] ?? order.type}
          {order.table ? ` #${order.table.number}` : ''}
        </span>
        <span className="text-xs font-semibold">#{order.id} · {mins} daq</span>
      </div>

      <div className="flex-1 p-3 space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="text-sm">
            <div className="flex justify-between font-medium text-gray-900">
              <span>{item.name_uz || item.name_ru}</span>
              <span className="ml-2 whitespace-nowrap">
                {item.weight_kg ? `${item.weight_kg} kg` : `× ${item.quantity}`}
              </span>
            </div>
            {item.modifiers.length > 0 && (
              <div className="mt-0.5 flex flex-wrap gap-1">
                {item.modifiers.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[11px] font-bold uppercase"
                  >
                    {m.name_uz || m.name_ru}
                  </span>
                ))}
              </div>
            )}
            {item.addons.length > 0 && (
              <div className="mt-0.5 text-xs text-gray-500">
                {item.addons.map((a) => `+ ${a.name_uz || a.name_ru}`).join(', ')}
              </div>
            )}
            {item.note && <div className="mt-0.5 text-xs italic text-gray-500">“{item.note}”</div>}
          </div>
        ))}
        {order.note && (
          <div className="text-xs italic text-gray-600 border-t border-gray-100 pt-2">
            Izoh: {order.note}
          </div>
        )}
      </div>

      {order.status === 'preparing' && (
        <button
          onClick={() => onReady(order.id)}
          disabled={isPending}
          className="m-3 mt-0 px-4 py-2.5 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          Tayyor
        </button>
      )}
      {order.status === 'ready' && (
        <div className="m-3 mt-0 px-4 py-2 text-center text-blue-600 text-sm font-semibold border border-blue-200 rounded-lg bg-blue-50">
          Tayyor ✓ — berishni kutmoqda
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────

export default function KitchenPage() {
  const { user } = useAuth();
  const [branchId, setBranchId] = useState<number | null>(user?.branch_id ?? null);
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [now, setNow] = useState(Date.now());

  // Tick every 30s so elapsed-time colours update.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      const payload = res.data.data;
      return payload?.data ?? payload ?? [];
    },
  });

  // Default to first branch if user has none assigned.
  useEffect(() => {
    if (branchId === null && branches.length > 0) {
      setBranchId(branches[0].id);
    }
  }, [branches, branchId]);

  // Initial load of active (preparing + ready) orders for the branch.
  const { data: initialOrders } = useQuery<KdsOrder[]>({
    queryKey: ['kds-orders', branchId],
    enabled: branchId !== null,
    queryFn: async () => {
      const fetchStatus = async (status: string) => {
        const res = await api.get('/orders', { params: { branch_id: branchId, status } });
        const payload = res.data.data;
        const list = payload?.data ?? payload ?? [];
        return list as Array<{
          id: number; company_id: number; branch_id: number; type: KdsOrder['type'];
          status: string; note?: string; total?: number; created_at?: string;
          table?: { id: number; number: number } | null;
          order_items?: Array<{
            id: number; quantity: number; weight_kg?: number; note?: string;
            menu_item?: { name_uz?: string; name_ru?: string };
            modifiers?: KdsModifier[]; addons?: KdsModifier[];
          }>;
        }>;
      };
      const [preparing, ready] = await Promise.all([fetchStatus('preparing'), fetchStatus('ready')]);
      return [...preparing, ...ready].map((o) => ({
        id: o.id,
        company_id: o.company_id,
        branch_id: o.branch_id,
        type: o.type,
        status: o.status,
        note: o.note,
        total: o.total,
        created_at: o.created_at,
        table: o.table,
        items: (o.order_items ?? []).map((it) => ({
          id: it.id,
          name_uz: it.menu_item?.name_uz,
          name_ru: it.menu_item?.name_ru,
          quantity: it.quantity,
          weight_kg: it.weight_kg,
          note: it.note,
          modifiers: it.modifiers ?? [],
          addons: it.addons ?? [],
        })),
      }));
    },
  });

  useEffect(() => {
    if (initialOrders) setOrders(initialOrders);
  }, [initialOrders]);

  // Real-time subscription.
  useEffect(() => {
    if (!user?.company_id || branchId === null) return;

    const echo = getEcho();
    const channelName = kitchenChannel(user.company_id, branchId);
    const channel = echo.private(channelName);

    const upsert = (incoming: KdsOrder) => {
      setOrders((prev) => {
        const others = prev.filter((o) => o.id !== incoming.id);
        // Only keep orders still relevant to the kitchen.
        if (incoming.status !== 'preparing' && incoming.status !== 'ready') {
          return others;
        }
        return [...others, incoming];
      });
    };

    channel.listen('.order.created', (e: { order: KdsOrder }) => {
      beep();
      upsert(e.order);
    });

    channel.listen('.order.status', (e: { order: KdsOrder }) => {
      upsert(e.order);
    });

    return () => {
      echo.leave(channelName);
    };
  }, [user?.company_id, branchId]);

  const readyMutation = useMutation({
    mutationFn: async (id: number) =>
      (await api.patch(`/orders/${id}/status`, { status: 'ready' })).data,
    onSuccess: (res) => {
      const updated = res?.data;
      if (updated) {
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? { ...o, status: 'ready' } : o)),
        );
      }
    },
  });

  const sorted = useMemo(
    () =>
      [...orders].sort((a, b) => {
        // preparing first, then by oldest created
        if (a.status !== b.status) return a.status === 'preparing' ? -1 : 1;
        return (a.created_at ?? '').localeCompare(b.created_at ?? '');
      }),
    [orders],
  );

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Oshxona (KDS)</h1>
        {branches.length > 1 && (
          <select
            value={branchId ?? ''}
            onChange={(e) => setBranchId(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Hozircha faol buyurtmalar yo'q</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              now={now}
              onReady={(id) => readyMutation.mutate(id)}
              isPending={readyMutation.isPending}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}
