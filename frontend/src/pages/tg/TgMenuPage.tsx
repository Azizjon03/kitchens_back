import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import tgApi, { tgInit } from '../../lib/tgApi';
import { useTgCart, cartTotal, cartCount } from '../../lib/tgCart';
import type { Category, MenuItem } from '../../types';
import { Plus, ShoppingCart } from 'lucide-react';

function formatPrice(price: number) {
  return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
}

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

  const { data, isLoading, isError } = useQuery<TgMenuResponse>({
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 text-center text-gray-500">
        Menyuni yuklab bo'lmadi. Iltimos, qaytadan urinib ko'ring.
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
              className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
              style={
                activeCat === c.id
                  ? { backgroundColor: primary, color: 'white' }
                  : { backgroundColor: '#f3f4f6', color: '#4b5563' }
              }
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
              <p className="text-sm font-semibold mt-1" style={{ color: primary }}>
                {formatPrice(Number(item.price))}
                {item.sell_type === 'weight' ? '/kg' : ''}
              </p>
            </div>
            <button
              onClick={() => add(item)}
              className="ml-3 shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: primary }}
              aria-label="Savatga qo'shish"
            >
              <Plus size={18} />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">Bu kategoriyada taom yo'q</p>
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
          <span className="font-semibold">{formatPrice(total)}</span>
        </button>
      )}
    </div>
  );
}
