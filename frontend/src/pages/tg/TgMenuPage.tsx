import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import tgApi, { tgErrorMessage, tgInit } from '../../lib/tgApi';
import { useTgCart, cartTotal, cartCount, minWeightKg } from '../../lib/tgCart';
import type { Category, MenuItem } from '../../types';
import { AlertTriangle, Plus, ShoppingCart, UtensilsCrossed } from 'lucide-react';
import { formatMoney } from '../../lib/format';


interface TgMenuResponse {
  company: { id: number; name: string; logo?: string; primary_color?: string };
  branches: { id: number; name: string; address?: string }[];
  menu: Category[];
}

export default function TgMenuPage() {
  const navigate = useNavigate();
  const { cart, add } = useTgCart();
  const [activeCat, setActiveCat] = useState<number | null>(null);

  useEffect(() => {
    tgInit();
  }, []);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<TgMenuResponse>({
    queryKey: ['tg-menu'],
    queryFn: async () => {
      const res = await tgApi.get('/menu');
      return res.data.data as TgMenuResponse;
    },
  });

  const categories = useMemo(() => data?.menu ?? [], [data]);
  const primary = data?.company.primary_color || '#F59E0B';

  useEffect(() => {
    if (activeCat === null && categories.length > 0) setActiveCat(categories[0].id);
  }, [categories, activeCat]);

  const items: MenuItem[] = categories.find((c) => c.id === activeCat)?.menu_items ?? [];
  const count = cartCount(cart);
  const total = cartTotal(cart);

  if (isLoading) {
    return (
      // Brend rangi hali noma'lum — neytral spinner (boshqa kompaniyada rang "sakramaydi")
      <div role="status" className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-transparent rounded-full animate-spin" />
        <span className="sr-only">Yuklanmoqda...</span>
      </div>
    );
  }

  if (isError || !data) {
    const message = tgErrorMessage(error, { fallback: "Menyuni yuklab bo'lmadi." });
    const code = (error as { response?: { data?: { error?: { code?: string } } } } | null)?.response?.data?.error?.code;
    // Restoran yo'q/nofaol — qayta urinish foyda bermaydi
    const retryable = code !== 'COMPANY_NOT_FOUND' && code !== 'COMPANY_REQUIRED';
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
        <div role="alert" className="w-full max-w-sm flex flex-col items-center text-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6">
          <AlertTriangle size={36} className="text-red-500" aria-hidden="true" />
          <p className="text-red-700">{message}</p>
          {retryable && (
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="min-h-11 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-base font-medium disabled:opacity-50"
            >
              {isRefetching ? 'Qayta yuklanmoqda...' : 'Qayta urinish'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="px-4 py-4 text-white" style={{ backgroundColor: primary }}>
        <h1 className="text-xl font-bold">{data.company.name}</h1>
        <p className="text-sm opacity-90">Menyu</p>
      </div>

      {/* Category tabs */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="flex gap-1 px-3 py-2 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`min-h-11 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                activeCat === c.id ? 'text-white' : 'bg-gray-100 text-gray-700'
              }`}
              // style faqat faol (brend rangi) holatda — nofaol holat Tailwind palitrasidan
              style={activeCat === c.id ? { backgroundColor: primary } : undefined}
            >
              {c.name_uz}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="p-3 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{item.name_uz}</p>
              {item.description_uz && (
                <p className="text-xs text-gray-500 truncate">{item.description_uz}</p>
              )}
              {/* Narx — o'qilishi uchun to'q matn; brend rangi tugmada (amber matn oq fonda ~2:1) */}
              <p className="text-base font-semibold mt-1 text-gray-900 tabular-nums">
                {formatMoney(Number(item.price))}
                {item.sell_type === 'weight' ? '/kg' : ''}
              </p>
              {item.sell_type === 'weight' && (
                <p className="text-xs text-gray-500">
                  kamida {minWeightKg(item)} kg
                </p>
              )}
            </div>
            <button
              onClick={() => add(item)}
              className="ml-3 shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: primary }}
              aria-label={`${item.name_uz} — savatga qo'shish`}
            >
              <Plus size={18} />
            </button>
          </div>
        ))}
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <UtensilsCrossed size={40} className="text-gray-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-gray-600">Menyu hozircha bo'sh</p>
          </div>
        ) : (
          items.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-8">Bu kategoriyada taom yo'q</p>
          )
        )}
      </div>

      {/* Cart bar */}
      {count > 0 && (
        <button
          onClick={() => navigate(`/tg/cart${window.location.search}`)}
          className="fixed bottom-4 left-4 right-4 rounded-xl text-white px-4 py-3 flex items-center justify-between shadow-lg"
          style={{ backgroundColor: primary }}
        >
          <span className="flex items-center gap-2 font-medium">
            <ShoppingCart size={18} /> Savat ({count})
          </span>
          <span className="font-semibold">{formatMoney(total)}</span>
        </button>
      )}
    </div>
  );
}
