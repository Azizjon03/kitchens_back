import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { getEcho, kitchenChannel } from '../lib/echo';
import { useAuth } from '../lib/auth';
import type { Branch } from '../types';
import { Check, ChefHat, X } from 'lucide-react';
import PageGuide from '../components/PageGuide';
import Layout from '../components/Layout';
import { LoadingState, ErrorState } from '../components/QueryState';
import { apiErrorMessage } from '../lib/apiError';
import ReceiptButton from '../components/ReceiptButton';
import ReceiptWidthSelect from '../components/ReceiptWidthSelect';
import { printReceipt } from '../lib/receipt';

// ─── Types matching Order::toBroadcastArray() ────────────────────

interface KdsModifier {
  id: number;
  name_uz?: string;
  name_ru?: string;
  /** #35: qo'shimcha soni (oshga 2× go'sht) */
  quantity?: number;
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
  /** #40: oshxona bo'limi va qator holati */
  station_id?: number | null;
  ready_at?: string | null;
}

interface Station {
  id: number;
  name: string;
  is_active: boolean;
  users: { id: number; name: string }[];
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
  visible,
  stationNames,
}: {
  order: KdsOrder;
  now: number;
  onReady: (id: number) => void;
  isPending: boolean;
  /** #40: ko'rsatiladigan bo'limlar; null — hammasi */
  visible: number[] | null;
  stationNames: Map<number, string>;
}) {
  const printName = visible?.length === 1 ? stationNames.get(visible[0]) ?? null : null;
  void now; // re-render trigger for elapsed time
  const mins = minutesSince(order.created_at);
  const mine = order.items.filter((i) => visible === null || visible.includes(i.station_id ?? -1));
  const others = order.items.filter((i) => !mine.includes(i));
  // Mening qismim tayyor — buyurtma boshqa bo'limlarni kutayotgan bo'lsa ham
  const myDone = order.status === 'ready' || (mine.length > 0 && mine.every((i) => i.ready_at));
  const otherStations = [...new Set(others.map((i) => i.station_id ?? 0))].map((sid) => ({
    name: stationNames.get(sid) ?? "Bo'limsiz",
    done: others.filter((i) => (i.station_id ?? 0) === sid).every((i) => i.ready_at),
  }));

  const border =
    myDone
      ? 'border-blue-400'
      : mins > 15
        ? 'border-red-500'
        : mins >= 5
          ? 'border-amber-400'
          : 'border-green-500';

  const headerBg =
    myDone
      ? 'bg-blue-50 text-blue-700'
      : mins > 15
        ? 'bg-red-50 text-red-700'
        : mins >= 5
          ? 'bg-amber-50 text-amber-700'
          : 'bg-green-50 text-green-700';

  return (
    <div className={`bg-white rounded-xl border-2 ${border} overflow-hidden flex flex-col`}>
      <div className={`flex items-center justify-between gap-2 px-3 py-2 2xl:px-4 2xl:py-3 ${headerBg}`}>
        <div className="min-w-0">
          <div className="font-bold text-base 2xl:text-lg truncate">
            {TYPE_LABELS[order.type] ?? order.type}
            {order.table ? ` #${order.table.number}` : ''}
          </div>
          <div className="text-xs font-medium">#{order.id}</div>
        </div>
        {/* Kutish vaqti — oshpazning asosiy signali, kartadagi eng yirik raqam */}
        <span className="ml-auto text-xl 2xl:text-2xl font-bold tabular-nums whitespace-nowrap">{mins} daq</span>
        {/* #44: shu bo'lim taomlari qog'ozi */}
        <ReceiptButton orderId={order.id} kind="kitchen" label="" kitchen={{ stationIds: visible, stationName: printName }}
          className="min-h-11 min-w-11 -my-1 -mr-1 inline-flex items-center justify-center rounded-lg hover:bg-black/5" />
      </div>

      <div className="flex-1 p-3 2xl:p-4 space-y-2">
        {mine.map((item) => (
          <div key={item.id} className="text-base 2xl:text-lg">
            <div className={`flex justify-between font-medium ${item.ready_at && order.status === 'preparing' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
              <span>
                {item.ready_at && order.status === 'preparing' && <Check size={16} className="inline mr-1 text-green-700" aria-label="Tayyor" />}
                {item.name_uz || item.name_ru}
                {visible === null && item.station_id && stationNames.size > 0 && (
                  <span className="ml-2 align-middle rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700 no-underline">{stationNames.get(item.station_id)}</span>
                )}
              </span>
              <span className="ml-2 whitespace-nowrap">
                {item.weight_kg ? `${item.weight_kg} kg` : `× ${Number(item.quantity)}`}
              </span>
            </div>
            {item.modifiers.length > 0 && (
              <div className="mt-0.5 flex flex-wrap gap-1">
                {item.modifiers.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex px-2 py-0.5 rounded bg-red-100 text-red-800 text-sm font-bold uppercase"
                  >
                    {m.name_uz || m.name_ru}
                  </span>
                ))}
              </div>
            )}
            {item.addons.length > 0 && (
              <div className="mt-0.5 text-sm text-gray-700">
                {item.addons.map((a, i) => (
                  <span key={a.id}>
                    {i > 0 && ', '}+ {a.name_uz || a.name_ru}
                    {(a.quantity ?? 1) > 1 && <b className="text-red-700"> ×{a.quantity}</b>}
                  </span>
                ))}
              </div>
            )}
            {item.note && <div className="mt-0.5 text-sm italic text-gray-700">“{item.note}”</div>}
          </div>
        ))}
        {otherStations.length > 0 && order.status === 'preparing' && (
          <div className="text-sm text-gray-700 border-t border-gray-100 pt-2">
            Boshqa bo'limlar:{' '}
            {otherStations.map((st, i) => (
              <span key={st.name}>
                {i > 0 && ', '}
                {st.name} {st.done ? <b className="text-green-800">✓</b> : <span className="text-amber-800">— tayyorlanmoqda</span>}
              </span>
            ))}
          </div>
        )}
        {order.note && (
          <div className="text-sm italic text-gray-700 border-t border-gray-100 pt-2">
            Izoh: {order.note}
          </div>
        )}
      </div>

      {order.status === 'preparing' && !myDone && (
        <button
          onClick={() => onReady(order.id)}
          disabled={isPending}
          className="m-3 mt-0 min-h-12 inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-700 text-white rounded-lg text-lg font-semibold hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2 transition-colors disabled:opacity-50"
        >
          <Check size={20} aria-hidden="true" />
          {isPending ? 'Saqlanmoqda...' : 'Tayyor'}
        </button>
      )}
      {order.status === 'preparing' && myDone && (
        <div className="m-3 mt-0 min-h-12 px-4 py-2.5 inline-flex items-center justify-center gap-2 text-blue-800 text-base font-semibold border border-blue-200 rounded-lg bg-blue-50">
          <Check size={18} aria-hidden="true" />
          Qismingiz tayyor
        </div>
      )}
      {order.status === 'ready' && (
        <div className="m-3 mt-0 min-h-12 px-4 py-2.5 inline-flex items-center justify-center gap-2 text-blue-800 text-base font-semibold border border-blue-200 rounded-lg bg-blue-50">
          <Check size={18} aria-hidden="true" />
          Berishni kutmoqda
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
  const [actionError, setActionError] = useState('');

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

  // #40: oshxona bo'limlari. Oshpaz o'z bo'limlarini, rahbar yoki umumiy planshet — tanlanganini ko'radi.
  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ['kitchen-stations'],
    queryFn: async () => (await api.get('/kitchen-stations')).data.data,
  });
  const activeStations = stations.filter((st) => st.is_active);
  const myStations = user?.role === 'chef' ? activeStations.filter((st) => st.users.some((u) => u.id === user.id)) : [];
  const choices = myStations.length > 0 ? myStations : activeStations;
  const [picked, setPicked] = useState<string>(() => localStorage.getItem('kds-station') ?? 'all');
  // Saqlangan tanlov endi mavjud bo'lmasa — standart
  const selected = picked !== 'all' && choices.some((st) => String(st.id) === picked)
    ? Number(picked)
    : myStations.length === 1 ? myStations[0].id : 'all';
  const visible: number[] | null = selected !== 'all' ? [selected] : myStations.length > 0 ? myStations.map((st) => st.id) : null;
  const stationNames = useMemo(() => new Map(stations.map((st) => [st.id, st.name])), [stations]);

  // #44: yangi buyurtmani avtomatik chop etish (shu qurilmada; Chrome --kiosk-printing bilan oynasiz)
  const [autoPrint, setAutoPrint] = useState(() => {
    try { return localStorage.getItem('kds-autoprint') === '1'; } catch { return false; }
  });
  const printRef = useRef<{ on: boolean; visible: number[] | null; name: string | null }>({ on: false, visible: null, name: null });
  useEffect(() => {
    printRef.current = { on: autoPrint, visible, name: visible?.length === 1 ? stationNames.get(visible[0]) ?? null : null };
  });
  const autoPrintOrder = (o: KdsOrder) => {
    const { on, visible: vis, name } = printRef.current;
    if (!on || o.status !== 'preparing') return;
    if (vis && !o.items.some((i) => vis.includes(i.station_id ?? -1))) return; // bu bo'limga tegishli emas
    printReceipt(o.id, 'kitchen', { stationIds: vis, stationName: name }).catch(() => {});
  };

  // Default to first branch if user has none assigned.
  useEffect(() => {
    if (branchId === null && branches.length > 0) {
      setBranchId(branches[0].id);
    }
  }, [branches, branchId]);

  // Initial load of active (preparing + ready) orders for the branch.
  const {
    data: initialOrders,
    isLoading: ordersLoading,
    isError: ordersFailed,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery<KdsOrder[]>({
    queryKey: ['kds-orders', branchId],
    enabled: branchId !== null,
    queryFn: async () => {
      // active=1 — barcha faol buyurtmalar, eskidan yangiga (sahifalashsiz, #5)
      const fetchStatus = async (status: string) => {
        const res = await api.get('/orders', { params: { branch_id: branchId, status, active: 1 } });
        const payload = res.data.data;
        const list = payload?.data ?? payload ?? [];
        return list as Array<{
          id: number; company_id: number; branch_id: number; type: KdsOrder['type'];
          status: string; note?: string; total?: number; created_at?: string;
          table?: { id: number; number: number } | null;
          order_items?: Array<{
            id: number; quantity: number; weight_kg?: number; note?: string; is_table_set?: boolean;
            kitchen_station_id?: number | null; ready_at?: string | null;
            menu_item?: { name_uz?: string; name_ru?: string };
            modifiers?: KdsModifier[]; addons?: (KdsModifier & { pivot?: { quantity?: number } })[];
          }>;
        }>;
      };
      const list = await fetchStatus('preparing,ready');
      return list.map((o) => ({
        id: o.id,
        company_id: o.company_id,
        branch_id: o.branch_id,
        type: o.type,
        status: o.status,
        note: o.note,
        total: o.total,
        created_at: o.created_at,
        table: o.table,
        // Stol to'plami qatorlari (#24) oshxonaga tegishli emas
        items: (o.order_items ?? []).filter((it) => !it.is_table_set).map((it) => ({
          id: it.id,
          name_uz: it.menu_item?.name_uz,
          name_ru: it.menu_item?.name_ru,
          quantity: it.quantity,
          weight_kg: it.weight_kg,
          note: it.note,
          station_id: it.kitchen_station_id ?? null,
          ready_at: it.ready_at ?? null,
          modifiers: it.modifiers ?? [],
          // #35: API'da son pivot ichida keladi
          addons: (it.addons ?? []).map((a) => ({ ...a, quantity: a.quantity ?? a.pivot?.quantity ?? 1 })),
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
      if (e.order.status === 'preparing') beep(); // #39: tasdiqlanmagan bot buyurtmasi oshxonaga tegishli emas
      upsert(e.order);
      autoPrintOrder(e.order);
    });

    channel.listen('.order.status', (e: { order: KdsOrder; previous_status?: string }) => {
      upsert(e.order);
      // #39: menejer tasdiqlagan bot buyurtmasi — oshxona uchun «yangi»
      if (e.previous_status === 'pending') autoPrintOrder(e.order);
    });

    return () => {
      echo.leave(channelName);
    };
  }, [user?.company_id, branchId]);

  const readyMutation = useMutation({
    // #40: faqat ko'rinayotgan bo'lim(lar) qismi; javob — yangilangan buyurtma
    mutationFn: async (id: number) =>
      (await api.patch(`/orders/${id}/kitchen-ready`, selected !== 'all' ? { station_id: selected } : {})).data,
    onSuccess: (res) => {
      const updated = res?.data as KdsOrder | undefined;
      if (updated) {
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      }
      setActionError('');
    },
    // Xato jim yutilmaydi: oshpaz "Tayyor" o'tmaganini ko'rishi shart (#6)
    onError: (err) => setActionError(apiErrorMessage(err, "Buyurtmani 'Tayyor' qilib bo'lmadi")),
  });

  const sorted = useMemo(() => {
    const shown = (o: KdsOrder) => o.items.filter((i) => visible === null || visible.includes(i.station_id ?? -1));
    // Mening qismim tayyor bo'lsa — pastga
    const done = (o: KdsOrder) => o.status === 'ready' || shown(o).every((i) => i.ready_at);
    return orders
      .filter((o) => shown(o).length > 0) // bu bo'limga tegishli taom yo'q
      .sort((a, b) => {
        if (done(a) !== done(b)) return done(a) ? 1 : -1;
        return (a.created_at ?? '').localeCompare(b.created_at ?? '');
      });
    // visible har renderda yangi massiv — kalit sifatida satr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, JSON.stringify(visible)]);

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Oshxona</h1>
        <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 min-h-11 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={autoPrint} className="w-5 h-5 accent-amber-700"
            onChange={(e) => { setAutoPrint(e.target.checked); try { localStorage.setItem('kds-autoprint', e.target.checked ? '1' : '0'); } catch { /* yo'q */ } }} />
          Yangi buyurtmani chop etish
        </label>
        <ReceiptWidthSelect />
        {choices.length > 0 && (
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            Bo'lim
            <select
              value={String(selected)}
              onChange={(e) => { setPicked(e.target.value); localStorage.setItem('kds-station', e.target.value); }}
              className="min-h-11 px-3 border border-gray-300 rounded-lg text-base font-medium text-gray-900 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              {choices.length > 1 && <option value="all">{myStations.length > 0 ? "Mening bo'limlarim" : "Barcha bo'limlar"}</option>}
              {choices.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
            </select>
          </label>
        )}
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
      </div>

      <PageGuide id="kitchen" />
      {actionError && (
        <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base font-medium text-red-800">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError('')} className="shrink-0 -my-2 -mr-2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-red-700 hover:bg-red-100" aria-label="Xabarni yopish">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      {ordersLoading ? (
        <LoadingState label="Buyurtmalar yuklanmoqda..." large />
      ) : ordersFailed ? (
        // KDS uzoqdan ko'riladi: xato katta va qizil, bo'sh holat bilan adashtirilmaydi
        <ErrorState error={ordersError} onRetry={() => refetchOrders()} title="Buyurtmalarni yuklab bo'lmadi" large />
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ChefHat size={48} className="text-gray-300 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-800 text-lg font-medium">Hozircha buyurtma yo'q</p>
          <p className="mt-1 text-gray-600">Ofitsiant yoki Telegram mijozi buyurtma berishi bilan shu yerda o'zi paydo bo'ladi — sahifani yangilash shart emas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 2xl:gap-5">
          {sorted.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              now={now}
              onReady={(id) => readyMutation.mutate(id)}
              isPending={readyMutation.isPending && readyMutation.variables === order.id}
              visible={visible}
              stationNames={stationNames}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}
