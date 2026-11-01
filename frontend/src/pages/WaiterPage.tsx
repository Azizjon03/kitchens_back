import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { getEcho, kitchenChannel } from '../lib/echo';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import type { Branch, Table, Order } from '../types';
import PageGuide from '../components/PageGuide';
import Layout from '../components/Layout';
import TableSetModal from '../components/TableSetModal';
import OrderComposer from '../components/OrderComposer';
import { hasDraft } from '../lib/waiterDraft';
import { LoadingState, ErrorState } from '../components/QueryState';
import { apiErrorMessage } from '../lib/apiError';
import { X, Bell, Check, ClipboardList, Grid3X3, LayoutTemplate } from 'lucide-react';
import { formatMoney, formatTime } from '../lib/format';
import ReceiptButton from '../components/ReceiptButton';
import { groupTables } from '../lib/tableGroups';


const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none';

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
  const [pickedBranch, setBranchId] = useState<number | null>(user?.branch_id ?? null);
  const [composerTable, setComposerTable] = useState<Table | null>(null);
  const [alerts, setAlerts] = useState<{ id: number; label: string }[]>([]);
  const [actionError, setActionError] = useState('');
  // Stol to'plami (#24): stoldagi narsalardan ochilganini belgilash
  const [tableSetOrder, setTableSetOrder] = useState<Order | null>(null);
  // #43: ofitsiant avval o'z buyurtmalarini ko'radi
  const [scope, setScope] = useState<'mine' | 'all'>(user?.role === 'waiter' ? 'mine' : 'all');

  const { data: stats } = useQuery<{ preparing: number; ready: number; served: number; today_count: number; today_total: number }>({
    queryKey: ['waiter-stats'],
    queryFn: async () => (await api.get('/orders/my-stats')).data.data,
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      const payload = res.data.data;
      return payload?.data ?? payload ?? [];
    },
  });

  // Tanlanmagan bo'lsa — birinchi filial
  const branchId = pickedBranch ?? branches[0]?.id ?? null;

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
      queryClient.invalidateQueries({ queryKey: ['waiter-stats'] });
    });

    channel.listen('.order.created', () => {
      queryClient.invalidateQueries({ queryKey: ['waiter-orders', branchId] });
      queryClient.invalidateQueries({ queryKey: ['waiter-stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['waiter-stats'] });
    },
    // Xato jim yutilmaydi: ofitsiant "Berildi" o'tmaganini ko'rishi shart (#6)
    onError: (err) => setActionError(apiErrorMessage(err, "Buyurtmani 'Berildi' qilib bo'lmadi")),
  });

  const tableLabel = (o: Order) =>
    o.table ? `Stol #${o.table.number}` : `${TYPE_LABELS[o.type] ?? o.type} #${o.id}`;

  const sortedOrders = useMemo(
    () =>
      orders.filter((o) => scope === 'all' || o.user_id === user?.id).sort(
        (a, b) =>
          (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) ||
          (a.created_at ?? '').localeCompare(b.created_at ?? ''),
      ),
    [orders, scope, user?.id],
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

      <PageGuide id="waiter" />
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

      {/* #43: mening ishim — bir qarashda */}
      {stats && (
        <dl className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-2" aria-label="Mening buyurtmalarim">
          {[
            { label: 'Tayyorlanmoqda', value: stats.preparing, cls: 'text-amber-800' },
            { label: 'Tayyor — olib boring', value: stats.ready, cls: stats.ready > 0 ? 'text-blue-800' : 'text-gray-900' },
            { label: 'Berilgan, to\'lanmagan', value: stats.served, cls: 'text-purple-800' },
            { label: 'Bugun jami', value: stats.today_count, sub: formatMoney(stats.today_total), cls: 'text-gray-900' },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <dt className="text-xs font-medium text-gray-600">{c.label}</dt>
              <dd className={`text-2xl font-bold tabular-nums ${c.cls}`}>{c.value}</dd>
              {c.sub && <dd className="text-xs text-gray-600 tabular-nums">{c.sub}</dd>}
            </div>
          ))}
        </dl>
      )}

      {/* Tables — #49: zallar bo'yicha */}
      <h2 className="text-sm font-semibold text-gray-500 mb-2">Stollar</h2>
      {groupTables(tables).map((sec) => (
        <section key={sec.key} className="mb-5" aria-label={sec.name}>
          {(sec.groupId !== null || groupTables(tables).length > 1) && (
            <h3 className="mb-1.5 text-sm font-medium text-gray-700">{sec.name}</h3>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
            {[...(sec.whole ? [sec.whole] : []), ...sec.tables].map((t) => {
          const isFree = t.status === 'free';
          return (
            <button
              key={t.id}
              onClick={() => isFree && setComposerTable(t)}
              disabled={!isFree}
              className={`${t.is_whole_group ? 'col-span-2 min-h-24' : 'aspect-square'} rounded-lg flex flex-col items-center justify-center text-sm font-semibold border-2 transition-colors ${
                isFree
                  ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                  : t.status === 'occupied'
                    ? 'border-amber-300 bg-amber-50 text-amber-700 cursor-not-allowed'
                    : 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
              }`}
            >
              {t.is_whole_group ? <>{t.number}<span className="text-xs font-medium">butun zal · {t.seats} kishi</span></> : `#${t.number}`}
              <span className="text-xs font-medium">{TABLE_STATUS_LABELS[t.status] ?? t.status}</span>
              {isFree && hasDraft(t.id) && <span className="mt-0.5 rounded bg-amber-600 px-1.5 text-[11px] font-semibold text-white">qoralama</span>}
            </button>
          );
            })}
          </div>
        </section>
      ))}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2 mb-8">
        {tablesLoading && (
          <div className="col-span-full">
            <LoadingState label="Stollar yuklanmoqda..." />
          </div>
        )}
        {!tablesLoading && !tablesFailed && tables.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">
            <Grid3X3 size={32} className="text-gray-300 mx-auto mb-2" aria-hidden="true" />
            <p className="font-medium text-gray-800">Bu filialda hali stol yo'q</p>
            {user?.role === 'waiter' ? (
              <p className="mt-1">Admin yoki menejerga ayting — u «Stollar» bo'limida stol qo'shadi.</p>
            ) : (
              <Link to="/tables" className="mt-3 min-h-11 inline-flex items-center px-4 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800">
                Stol qo'shish
              </Link>
            )}
          </div>
        )}
      </div>

      {tablesFailed && (
        <div className="mb-6">
          <ErrorState error={tablesError} onRetry={() => refetchTables()} title="Stollarni yuklab bo'lmadi" />
        </div>
      )}

      {/* Active orders */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-500">Faol buyurtmalar</h2>
        <div className="inline-flex rounded-lg border border-gray-300 p-0.5" role="group" aria-label="Qaysi buyurtmalar">
          {(['mine', 'all'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={scope === v} onClick={() => setScope(v)}
              className={`min-h-10 px-3 rounded-md text-sm font-medium ${scope === v ? 'bg-amber-700 text-white' : 'text-gray-700'}`}>
              {v === 'mine' ? 'Mening' : 'Hammasi'}
            </button>
          ))}
        </div>
      </div>
      {ordersLoading ? (
        <LoadingState label="Buyurtmalar yuklanmoqda..." />
      ) : ordersFailed ? (
        <ErrorState error={ordersError} onRetry={() => refetchOrders()} title="Buyurtmalarni yuklab bo'lmadi" />
      ) : sortedOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          <ClipboardList size={36} className="text-gray-300 mx-auto mb-2" aria-hidden="true" />
          <p className="font-medium text-gray-800">{scope === 'mine' ? "Sizda faol buyurtma yo'q" : "Faol buyurtma yo'q"}</p>
          <p className="mt-1">Yuqoridan bo'sh stolni bosing va buyurtma oling.</p>
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
              {(o.order_items?.length ?? 0) > 0 && (
                <ul className="mb-2 text-sm text-gray-800 space-y-0.5">
                  {o.order_items!.filter((it) => !(it as { is_table_set?: boolean }).is_table_set).map((it) => (
                    <li key={it.id} className="flex justify-between gap-2">
                      <span className="truncate">{it.menu_item?.name_uz ?? 'Taom'}</span>
                      <span className="tabular-nums text-gray-600 whitespace-nowrap">{it.weight_kg ? `${Number(it.weight_kg)} kg` : `${Number(it.quantity)} ta`}</span>
                    </li>
                  ))}
                </ul>
              )}
              {scope === 'all' && o.user && <p className="mb-1 text-xs text-gray-600">Ofitsiant: {o.user.name || o.user.full_name}</p>}
              <div className={`flex items-center justify-between text-sm ${(o.status === 'ready' && o.type === 'dine_in') || o.table?.table_template_id ? 'mb-3' : ''}`}>
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
              {o.table?.table_template_id && (
                <button
                  onClick={() => setTableSetOrder(o)}
                  className="mt-2 w-full min-h-11 px-3 py-2 border border-gray-300 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 inline-flex items-center justify-center gap-1"
                >
                  <LayoutTemplate size={16} aria-hidden="true" /> Stoldagi narsalar
                </button>
              )}
              {/* #44: mehmonga hisob */}
              <div className="mt-2">
                <ReceiptButton orderId={o.id} kind="bill" label="Hisob chiqarish" className="w-full min-h-11 inline-flex items-center justify-center gap-2 px-3 border border-gray-300 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50" />
              </div>
            </div>
          ))}
        </div>
      )}

      {tableSetOrder && (
        <TableSetModal orderId={tableSetOrder.id} tableLabel={tableLabel(tableSetOrder)} onClose={() => setTableSetOrder(null)} />
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
