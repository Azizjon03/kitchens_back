import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import tgApi, { tgInit, tgTableId } from '../../lib/tgApi';
import { useTgCart, cartTotal, lineTotal, type TgCartLine } from '../../lib/tgCart';
import type { Category } from '../../types';
import { ArrowLeft, Minus, Plus, X } from 'lucide-react';

function formatPrice(price: number) {
  return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
}

interface TgMenuResponse {
  company: { primary_color?: string };
  branches: { id: number; name: string; address?: string }[];
  menu: Category[];
}

export default function TgCartPage() {
  const navigate = useNavigate();
  const { cart, update, remove, clear } = useTgCart();
  const tableId = tgTableId();
  const [branchId, setBranchId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    tgInit();
  }, []);

  const { data } = useQuery<TgMenuResponse>({
    queryKey: ['tg-menu'],
    queryFn: async () => (await tgApi.get('/menu')).data.data as TgMenuResponse,
  });

  const primary = data?.company.primary_color || '#F59E0B';
  const branches = data?.branches ?? [];

  useEffect(() => {
    if (!tableId && branchId === null && branches.length > 0) setBranchId(branches[0].id);
  }, [branches, branchId, tableId]);

  const toggleId = (line: TgCartLine, field: 'modifier_ids' | 'addon_ids', id: number) => {
    const set = new Set(line[field]);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    update(line.key, { [field]: Array.from(set) } as Partial<TgCartLine>);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        items: cart.map((l) => ({
          menu_item_id: l.item.id,
          quantity: l.quantity,
          weight_kg: l.item.sell_type === 'weight' ? l.weight_kg : null,
          modifier_ids: l.modifier_ids,
          addon_ids: l.addon_ids,
        })),
      };
      if (tableId) payload.table_id = tableId;
      else payload.branch_id = branchId;
      return (await tgApi.post('/orders', payload)).data;
    },
    onSuccess: (res) => {
      const order = res?.data;
      clear();
      navigate(`/tg/order/${order.id}${window.location.search}`);
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      setError(axiosErr.response?.data?.error?.message || axiosErr.response?.data?.message || 'Xatolik yuz berdi');
    },
  });

  const total = cartTotal(cart);

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="px-4 py-4 text-white flex items-center gap-3" style={{ backgroundColor: primary }}>
        <button onClick={() => navigate(`/tg${window.location.search}`)} aria-label="Orqaga">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold">Savat</h1>
      </div>

      <div className="p-3 space-y-3">
        {cart.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            Savat bo'sh
            <div>
              <button
                onClick={() => navigate(`/tg${window.location.search}`)}
                className="mt-3 text-sm font-medium"
                style={{ color: primary }}
              >
                Menyuga qaytish
              </button>
            </div>
          </div>
        )}

        {cart.map((l) => (
          <div key={l.key} className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{l.item.name_uz}</span>
              <button onClick={() => remove(l.key)} className="text-gray-400 hover:text-red-500">
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
                  onChange={(e) => update(l.key, { weight_kg: Number(e.target.value) })}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-xs text-gray-500">kg</span>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={() => update(l.key, { quantity: Math.max(0.1, Math.round((l.quantity - 1) * 100) / 100) })}
                  className="p-1.5 border border-gray-200 rounded-lg"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  step={0.1}
                  min={0.1}
                  value={l.quantity}
                  onChange={(e) => update(l.key, { quantity: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                  className="w-16 text-sm text-center border border-gray-200 rounded-lg py-1"
                />
                <button
                  onClick={() => update(l.key, { quantity: Math.round((l.quantity + 1) * 100) / 100 })}
                  className="p-1.5 border border-gray-200 rounded-lg"
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
                    className="px-2 py-0.5 rounded text-[11px] border"
                    style={
                      l.modifier_ids.includes(m.id)
                        ? { backgroundColor: primary, color: 'white', borderColor: primary }
                        : { backgroundColor: 'white', color: '#4b5563', borderColor: '#e5e7eb' }
                    }
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

            <div className="mt-2 text-right text-sm font-semibold text-gray-800">
              {formatPrice(lineTotal(l))}
            </div>
          </div>
        ))}

        {cart.length > 0 && !tableId && branches.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filial (olib ketish)</label>
            <select
              value={branchId ?? ''}
              onChange={(e) => setBranchId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 space-y-2">
          {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg">{error}</div>}
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Jami</span>
            <span>{formatPrice(total)}</span>
          </div>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="w-full px-4 py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: primary }}
          >
            {mutation.isPending ? 'Yuborilmoqda...' : 'Buyurtma berish'}
          </button>
        </div>
      )}
    </div>
  );
}
