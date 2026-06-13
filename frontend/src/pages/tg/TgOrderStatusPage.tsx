import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import tgApi, { tgInit } from '../../lib/tgApi';
import { Check, Clock } from 'lucide-react';

function formatPrice(price: number) {
  return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
}

interface TgOrder {
  id: number;
  type: string;
  status: string;
  subtotal: number;
  service_charge_amount: number;
  total: number;
  table?: { id: number; number: number } | null;
  items: { name_uz?: string; name_ru?: string; quantity: number; weight_kg?: number | null; total_price: number }[];
}

const STEPS_DINE_IN = ['preparing', 'ready', 'served', 'paid'];
const STEPS_TAKEAWAY = ['preparing', 'ready', 'paid'];

const LABELS: Record<string, string> = {
  preparing: 'Tayyorlanmoqda',
  ready: 'Tayyor',
  served: 'Berildi',
  paid: "To'landi",
  closed: 'Yakunlandi',
  cancelled: 'Bekor qilindi',
};

export default function TgOrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    tgInit();
  }, []);

  const { data: order, isLoading } = useQuery<TgOrder>({
    queryKey: ['tg-order', id],
    queryFn: async () => (await tgApi.get(`/orders/${id}`)).data.data as TgOrder,
    refetchInterval: 10000,
  });

  if (isLoading || !order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const steps = order.type === 'dine_in' ? STEPS_DINE_IN : STEPS_TAKEAWAY;
  const currentIdx = steps.indexOf(order.status);
  const cancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
          <p className="text-sm text-gray-500">Buyurtma</p>
          <p className="text-2xl font-bold text-gray-900">#{order.id}</p>
          {order.table && <p className="text-sm text-gray-500 mt-1">Stol #{order.table.number}</p>}
          <p className="mt-2 inline-flex px-3 py-1 rounded-full text-sm font-medium bg-amber-50 text-amber-700">
            {LABELS[order.status] ?? order.status}
          </p>
        </div>

        {/* Progress */}
        {!cancelled && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            {steps.map((s, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <div key={s} className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white ${
                      done ? 'bg-green-500' : active ? 'bg-amber-500' : 'bg-gray-300'
                    }`}
                  >
                    {done ? <Check size={16} /> : <Clock size={16} />}
                  </div>
                  <span className={`text-sm ${active ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                    {LABELS[s]}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Tarkibi</h2>
          <div className="space-y-2">
            {order.items.map((it, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {it.name_uz || it.name_ru}{' '}
                  <span className="text-gray-400">
                    {it.weight_kg ? `${it.weight_kg} kg` : `× ${Number(it.quantity)}`}
                  </span>
                </span>
                <span className="text-gray-900">{formatPrice(Number(it.total_price))}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Taomlar</span>
              <span>{formatPrice(Number(order.subtotal))}</span>
            </div>
            {Number(order.service_charge_amount) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Xizmat haqi</span>
                <span>{formatPrice(Number(order.service_charge_amount))}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 pt-1">
              <span>Jami</span>
              <span>{formatPrice(Number(order.total))}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate(`/tg${window.location.search}`)}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium bg-white"
        >
          Yana buyurtma berish
        </button>
      </div>
    </div>
  );
}
