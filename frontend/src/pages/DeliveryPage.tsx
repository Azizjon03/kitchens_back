import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, MapPin, Phone, Truck, X } from 'lucide-react';
import api from '../lib/api';
import Layout from '../components/Layout';
import PageGuide from '../components/PageGuide';
import { ErrorState, LoadingState } from '../components/QueryState';
import { apiErrorMessage } from '../lib/apiError';
import { formatMoney, formatTime } from '../lib/format';
import { formatPhone } from '../lib/phone';
import { useEscape } from '../lib/useEscape';
import ReceiptButton from '../components/ReceiptButton';

/**
 * #39: «Yetkazib berish» — botdan kelgan yetkazib berish va olib ketish buyurtmalari.
 * Menejer mijozga qo'ng'iroq qilib tasdiqlaydi (yoki rad etadi), manzilni Yandex
 * xaritada ko'radi, keyin «Yo'lga chiqdi» → «Yetkazildi».
 */
interface DeliveryOrder {
  id: number;
  type: 'delivery' | 'takeaway';
  status: string;
  total: number;
  note?: string | null;
  created_at: string;
  delivery_address?: string | null;
  delivery_lat?: number | string | null;
  delivery_lng?: number | string | null;
  customer?: { id: number; name?: string | null; phone?: string | null } | null;
  branch?: { id: number; name: string } | null;
  confirmed_by?: { id: number; name: string } | null;
  order_items?: {
    id: number;
    quantity: number;
    weight_kg?: number | null;
    note?: string | null;
    menu_item?: { name_uz?: string } | null;
    modifiers?: { id: number; name_uz: string }[];
    addons?: { id: number; name_uz: string; pivot?: { quantity?: number } }[];
  }[];
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Tasdiqlash kutilmoqda', cls: 'bg-orange-100 text-orange-900' },
  preparing: { label: 'Tayyorlanmoqda', cls: 'bg-amber-100 text-amber-800' },
  ready: { label: 'Tayyor', cls: 'bg-blue-100 text-blue-800' },
  delivering: { label: "Yo'lda", cls: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Yetkazildi', cls: 'bg-teal-100 text-teal-800' },
  paid: { label: "To'langan", cls: 'bg-green-100 text-green-800' },
  closed: { label: 'Yopilgan', cls: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'Bekor qilingan', cls: 'bg-red-100 text-red-800' },
};

const REJECT_REASONS = ['Mijoz javob bermadi', 'Mijoz bekor qildi', 'Manzil juda uzoq', 'Taom tugagan'];

function minutesAgo(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

function mapLinks(o: DeliveryOrder) {
  const lat = o.delivery_lat != null ? Number(o.delivery_lat) : null;
  const lng = o.delivery_lng != null ? Number(o.delivery_lng) : null;
  if (lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return {
      open: `https://yandex.uz/maps/?pt=${lng},${lat}&z=17&l=map`,
      embed: `https://yandex.uz/map-widget/v1/?pt=${lng},${lat}&z=16&l=map`,
    };
  }
  if (o.delivery_address) return { open: `https://yandex.uz/maps/?text=${encodeURIComponent(o.delivery_address)}`, embed: null };
  return null;
}

function RejectDialog({ order, onClose }: { order: DeliveryOrder; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [error, setError] = useState('');
  useEscape(onClose);
  const reject = useMutation({
    mutationFn: async () => api.post(`/orders/${order.id}/cancel`, { reason }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['delivery-orders'] }); onClose(); },
    onError: (err) => setError(apiErrorMessage(err, "Rad etib bo'lmadi")),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="rej-title" onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
        <h2 id="rej-title" className="text-lg font-semibold text-gray-900">#{order.id} buyurtmani rad etish</h2>
        <fieldset className="space-y-1">
          <legend className="text-sm text-gray-700 mb-1">Sababi (mijozga bekor qilingani haqida xabar boradi)</legend>
          {REJECT_REASONS.map((r) => (
            <label key={r} className="flex items-center gap-3 min-h-11 cursor-pointer">
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="w-5 h-5 accent-red-600" />
              <span className="text-gray-900">{r}</span>
            </label>
          ))}
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-11 px-4 text-sm text-gray-700">Orqaga</button>
          <button type="button" onClick={() => reject.mutate()} disabled={reject.isPending} className="min-h-11 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            Rad etish
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ o, onReject }: { o: DeliveryOrder; onReject: (o: DeliveryOrder) => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const done = () => { setError(''); queryClient.invalidateQueries({ queryKey: ['delivery-orders'] }); };
  const confirm = useMutation({
    mutationFn: async () => api.patch(`/orders/${o.id}/confirm`),
    onSuccess: done,
    onError: (err) => setError(apiErrorMessage(err, "Tasdiqlab bo'lmadi")),
  });
  const advance = useMutation({
    mutationFn: async (status: string) => api.patch(`/orders/${o.id}/status`, { status }),
    onSuccess: done,
    onError: (err) => setError(apiErrorMessage(err, "Holatni o'zgartirib bo'lmadi")),
  });
  const st = STATUS[o.status] ?? { label: o.status, cls: 'bg-gray-100 text-gray-800' };
  const map = o.type === 'delivery' ? mapLinks(o) : null;
  const phone = o.customer?.phone;
  const mins = minutesAgo(o.created_at);

  return (
    <article className={`bg-white rounded-xl border-2 ${o.status === 'pending' ? 'border-orange-400' : 'border-gray-200'} p-4 space-y-3`} aria-label={`Buyurtma #${o.id}`}>
      <header className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-2 py-0.5 text-xs font-semibold text-white">
          {o.type === 'delivery' ? <><Truck size={14} aria-hidden="true" /> Yetkazib berish</> : 'Olib ketish'}
        </span>
        <span className="font-semibold text-gray-900">#{o.id}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
        <span className={`ml-auto text-sm tabular-nums ${o.status === 'pending' && mins >= 5 ? 'font-bold text-red-700' : 'text-gray-600'}`}>
          {formatTime(o.created_at)} · {mins} daq
        </span>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900">{o.customer?.name || 'Mijoz'}</p>
          {phone && <p className="text-sm text-gray-700 tabular-nums">{formatPhone(phone)}</p>}
        </div>
        {phone && (
          <a href={`tel:${phone}`} className="min-h-11 inline-flex items-center gap-2 rounded-lg border border-green-600 px-4 text-sm font-semibold text-green-800 hover:bg-green-50">
            <Phone size={16} aria-hidden="true" /> Qo'ng'iroq
          </a>
        )}
      </div>

      {o.type === 'delivery' && (
        <div className="space-y-2">
          <p className="flex items-start gap-2 text-sm text-gray-900">
            <MapPin size={16} className="mt-0.5 shrink-0 text-gray-600" aria-hidden="true" />
            <span>{o.delivery_address || 'Manzil matni yo\'q — faqat xaritadagi nuqta'}</span>
          </p>
          {map?.embed && (
            <iframe
              title={`#${o.id} manzili xaritada`}
              src={map.embed}
              loading="lazy"
              className="w-full h-44 rounded-lg border border-gray-200"
            />
          )}
          {map && (
            <a href={map.open} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-amber-800 hover:underline">
              Yandex xaritada ochish <ExternalLink size={14} aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      <ul className="divide-y divide-gray-100 border-y border-gray-100">
        {(o.order_items ?? []).map((it) => (
          <li key={it.id} className="py-1.5 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-gray-900">{it.menu_item?.name_uz ?? 'Taom'}</span>
              <span className="tabular-nums text-gray-700 whitespace-nowrap">{it.weight_kg ? `${Number(it.weight_kg)} kg` : `${Number(it.quantity)} ta`}</span>
            </div>
            {((it.addons?.length ?? 0) > 0 || (it.modifiers?.length ?? 0) > 0) && (
              <p className="text-xs text-gray-600">
                {[...(it.modifiers ?? []).map((m) => m.name_uz), ...(it.addons ?? []).map((a) => `+ ${a.name_uz}${(a.pivot?.quantity ?? 1) > 1 ? ` ×${a.pivot?.quantity}` : ''}`)].join(', ')}
              </p>
            )}
          </li>
        ))}
      </ul>
      {o.note && <p className="text-sm text-gray-800">Izoh: {o.note}</p>}

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{o.branch && o.branch.name !== 'Asosiy filial' ? o.branch.name : ''}{o.confirmed_by ? ` Tasdiqladi: ${o.confirmed_by.name}` : ''}</span>
        <span className="text-lg font-bold tabular-nums text-gray-900">{formatMoney(Number(o.total))}</span>
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      {o.status === 'pending' && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onReject(o)} className="min-h-12 rounded-lg border border-gray-300 font-medium text-gray-800 hover:bg-gray-50 inline-flex items-center justify-center gap-1">
            <X size={18} aria-hidden="true" /> Rad etish
          </button>
          <button type="button" onClick={() => confirm.mutate()} disabled={confirm.isPending} className="min-h-12 rounded-lg bg-green-700 font-semibold text-white hover:bg-green-800 disabled:opacity-50 inline-flex items-center justify-center gap-1">
            <Check size={18} aria-hidden="true" /> {confirm.isPending ? 'Saqlanmoqda...' : 'Tasdiqlash'}
          </button>
        </div>
      )}
      {o.type === 'delivery' && o.status === 'ready' && (
        <button type="button" onClick={() => advance.mutate('delivering')} disabled={advance.isPending} className="w-full min-h-12 rounded-lg bg-indigo-700 font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">
          Kuryer yo'lga chiqdi
        </button>
      )}
      {o.status === 'delivering' && (
        <button type="button" onClick={() => advance.mutate('delivered')} disabled={advance.isPending} className="w-full min-h-12 rounded-lg bg-teal-700 font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
          Yetkazildi
        </button>
      )}
      {o.type === 'takeaway' && o.status === 'ready' && (
        <p className="text-sm text-gray-700">Mijoz kelib oladi — to'lovni kassada qabul qiling.</p>
      )}
      {o.status === 'delivered' && <p className="text-sm text-gray-700">Kuryer pulni topshirgach, to'lovni kassada qabul qiling.</p>}
      {/* #44: paket bilan kuryerga beriladigan chek */}
      {o.status !== 'pending' && <ReceiptButton orderId={o.id} kind="delivery" />}
    </article>
  );
}

export default function DeliveryPage() {
  const [rejecting, setRejecting] = useState<DeliveryOrder | null>(null);
  const { data = [], isLoading, isError, error, refetch } = useQuery<DeliveryOrder[]>({
    queryKey: ['delivery-orders'],
    queryFn: async () => (await api.get('/orders/delivery')).data.data,
    // Yangi bot buyurtmasi bir necha soniyada ko'rinadi
    refetchInterval: 15_000,
  });

  const pending = data.filter((o) => o.status === 'pending');
  const active = data.filter((o) => ['preparing', 'ready', 'delivering', 'delivered'].includes(o.status));
  const finished = data.filter((o) => ['paid', 'closed', 'cancelled'].includes(o.status));

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Yetkazib berish</h1>
        <p className="text-sm text-gray-600 mt-1">Telegram botdan kelgan buyurtmalar: qo'ng'iroq qilib tasdiqlang, manzilni xaritada ko'ring</p>
      </div>
      <PageGuide id="delivery" />

      {isLoading ? <LoadingState /> : isError ? <ErrorState error={error} onRetry={() => refetch()} /> : (
        <div className="space-y-8">
          <section aria-labelledby="sec-pending">
            <h2 id="sec-pending" className="mb-3 text-base font-semibold text-gray-900">
              Tasdiqlash kutilmoqda <span className={`ml-1 rounded-full px-2 py-0.5 text-sm ${pending.length ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'}`}>{pending.length}</span>
            </h2>
            {pending.length === 0 ? (
              <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Yangi buyurtma yo'q. Mijoz botda buyurtma berishi bilan shu yerda chiqadi va xodimlar botiga xabar keladi.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{pending.map((o) => <OrderCard key={o.id} o={o} onReject={setRejecting} />)}</div>
            )}
          </section>

          <section aria-labelledby="sec-active">
            <h2 id="sec-active" className="mb-3 text-base font-semibold text-gray-900">Jarayonda <span className="ml-1 text-sm text-gray-600">{active.length}</span></h2>
            {active.length === 0 ? (
              <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Tasdiqlangan buyurtmalar shu yerda: tayyorlanmoqda, tayyor, yo'lda.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{active.map((o) => <OrderCard key={o.id} o={o} onReject={setRejecting} />)}</div>
            )}
          </section>

          {finished.length > 0 && (
            <details className="rounded-xl border border-gray-200 bg-white">
              <summary className="min-h-12 cursor-pointer px-4 flex items-center font-medium text-gray-900">Bugun yakunlangan — {finished.length}</summary>
              <ul className="divide-y divide-gray-100">
                {finished.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm">
                    <span className="font-medium text-gray-900">#{o.id}</span>
                    <span className="text-gray-700">{o.customer?.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${(STATUS[o.status] ?? STATUS.closed).cls}`}>{(STATUS[o.status] ?? STATUS.closed).label}</span>
                    <span className="ml-auto tabular-nums text-gray-900">{formatMoney(Number(o.total))}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {rejecting && <RejectDialog order={rejecting} onClose={() => setRejecting(null)} />}
    </Layout>
  );
}
