import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, X } from 'lucide-react';
import api from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { formatMoney } from '../lib/format';
import { ErrorState, LoadingState } from './QueryState';

/**
 * Stol to'plami (#24): stolga oldindan qo'yilgan narsalardan nechtasi ochilganini belgilash.
 * Faqat belgilangani hisobga qo'shiladi; oshxonaga (KDS) hech narsa yuborilmaydi.
 */
interface TableSetLine {
  menu_item_id: number;
  name_uz: string;
  price: string | number;
  placed: number;
  used: number;
}

interface TableSetData {
  template: { id: number; name: string } | null;
  items: TableSetLine[];
  order_total: string | number;
}

export default function TableSetModal({ orderId, tableLabel, onClose }: { orderId: number; tableLabel: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery<TableSetData>({
    queryKey: ['table-set', orderId],
    queryFn: async () => (await api.get(`/orders/${orderId}/table-set`)).data.data,
  });
  const [used, setUsed] = useState<Record<number, number> | null>(null);
  const [saveError, setSaveError] = useState('');
  const counts = used ?? Object.fromEntries((data?.items ?? []).map((i) => [i.menu_item_id, i.used]));
  const extra = (data?.items ?? []).reduce((s, i) => s + Number(i.price) * (counts[i.menu_item_id] ?? 0), 0);

  const mutation = useMutation({
    mutationFn: async () =>
      (await api.put(`/orders/${orderId}/table-set`, {
        items: Object.entries(counts).map(([id, quantity]) => ({ menu_item_id: Number(id), quantity })),
      })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-set', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['waiter-orders'] });
      onClose();
    },
    onError: (err) => setSaveError(apiErrorMessage(err)),
  });

  const set = (id: number, value: number, max: number) => setUsed({ ...counts, [id]: Math.max(0, Math.min(max, value)) });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="table-set-title" className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-200">
          <div>
            <h2 id="table-set-title" className="text-lg font-semibold text-gray-900">Stoldagi narsalar — {tableLabel}</h2>
            <p className="text-sm text-gray-600 mt-0.5">Nechtasi ochilganini belgilang. Faqat ochilgani hisobga qo'shiladi.</p>
          </div>
          <button onClick={onClose} aria-label="Oynani yopish" className="min-h-11 min-w-11 -m-2 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3">
          {isLoading ? (
            <LoadingState label="Yuklanmoqda..." />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => refetch()} title="Ma'lumotni yuklab bo'lmadi" />
          ) : !data?.template ? (
            <p className="text-sm text-gray-600">Bu stolga oldindan narsa qo'yilmagan.</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">Shablon: {data.template.name}</p>
              {data.items.map((i) => {
                const n = counts[i.menu_item_id] ?? 0;
                return (
                  <div key={i.menu_item_id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{i.name_uz}</p>
                      <p className="text-sm text-gray-600">Stolda {i.placed} ta · {formatMoney(i.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => set(i.menu_item_id, n - 1, i.placed)} disabled={n === 0} aria-label={`${i.name_uz} — kamaytirish`} className="min-h-11 min-w-11 inline-flex items-center justify-center border border-gray-300 rounded-lg disabled:opacity-40">
                        <Minus size={18} />
                      </button>
                      <span className="w-8 text-center text-lg font-semibold tabular-nums" aria-live="polite">{n}</span>
                      <button type="button" onClick={() => set(i.menu_item_id, n + 1, i.placed)} disabled={n >= i.placed} aria-label={`${i.name_uz} — oshirish`} className="min-h-11 min-w-11 inline-flex items-center justify-center border border-gray-300 rounded-lg disabled:opacity-40">
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm">
                <span className="text-gray-600">Hisobga qo'shiladi:</span>
                <span className="font-semibold text-gray-900 tabular-nums">{formatMoney(extra)}</span>
              </div>
            </>
          )}
          {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-200">
          <button onClick={onClose} className="flex-1 min-h-11 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Orqaga</button>
          <button
            onClick={() => { setSaveError(''); mutation.mutate(); }}
            disabled={!data?.template || mutation.isPending}
            className="flex-1 min-h-11 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}
