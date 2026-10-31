import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronRight, Plus, Search, X } from 'lucide-react';
import api from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { formatMoney } from '../lib/format';
import { useEscape } from '../lib/useEscape';
import { ErrorState, LoadingState } from './QueryState';

/**
 * #29: menyuga qo'shishda avval standart katalog — keraklisini belgilab qo'shish;
 * standartda bo'lmasa "Yangisini yaratish" (oddiy forma).
 * Restoranda bor narsalar "Qo'shilgan" deb ko'rsatiladi va qayta qo'shilmaydi.
 */
interface CatalogItemRow {
  id: number;
  name_uz: string;
  sell_type: 'portion' | 'weight';
  price: string | number;
  added: boolean;
}
interface CatalogSub {
  id: number;
  name_uz: string;
  added: boolean;
  items: CatalogItemRow[];
}
interface CatalogTop {
  id: number;
  name_uz: string;
  added: boolean;
  children: CatalogSub[];
}

export default function CatalogPickerModal({
  mode,
  onClose,
  onCreateNew,
}: {
  /** items — taom qo'shish; categories — kategoriya/sub-menyu qo'shish */
  mode: 'items' | 'categories';
  onClose: () => void;
  onCreateNew: () => void;
}) {
  useEscape(onClose);
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery<CatalogTop[]>({
    queryKey: ['menu-catalog'],
    queryFn: async () => (await api.get('/menu/catalog')).data.data.categories,
  });
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [pickedItems, setPickedItems] = useState<Set<number>>(new Set());
  const [pickedCats, setPickedCats] = useState<Set<number>>(new Set());
  const [withItems, setWithItems] = useState(true);
  const [done, setDone] = useState<{ items: number; categories: number } | null>(null);
  const [saveError, setSaveError] = useState('');

  const needle = q.trim().toLowerCase();
  const tree = useMemo(() => {
    if (!data) return [];
    if (!needle || mode === 'categories') return data;
    return data
      .map((top) => ({
        ...top,
        children: top.children
          .map((sub) => ({ ...sub, items: sub.items.filter((i) => i.name_uz.toLowerCase().includes(needle)) }))
          .filter((sub) => sub.items.length > 0 || sub.name_uz.toLowerCase().includes(needle)),
      }))
      .filter((top) => top.children.length > 0);
  }, [data, needle, mode]);

  const isOpen = (id: number) => !!needle || open.has(id);
  const toggleOpen = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleItem = (id: number) =>
    setPickedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleSubItems = (sub: CatalogSub) => {
    const free = sub.items.filter((i) => !i.added).map((i) => i.id);
    setPickedItems((prev) => {
      const next = new Set(prev);
      const allPicked = free.every((id) => next.has(id));
      free.forEach((id) => (allPicked ? next.delete(id) : next.add(id)));
      return next;
    });
  };
  const toggleCat = (id: number) =>
    setPickedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const count = mode === 'items' ? pickedItems.size : pickedCats.size;

  const mutation = useMutation({
    mutationFn: async () =>
      (await api.post('/menu/catalog/import',
        mode === 'items'
          ? { item_ids: [...pickedItems] }
          : { category_ids: [...pickedCats], with_items: withItems },
      )).data.data as { items_added: number; categories_added: number },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['menu-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['pos-menu'] });
      setDone({ items: res.items_added, categories: res.categories_added });
      setPickedItems(new Set());
      setPickedCats(new Set());
    },
    onError: (err) => setSaveError(apiErrorMessage(err)),
  });

  const title = mode === 'items' ? "Taom qo'shish" : "Kategoriya qo'shish";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="picker-title" className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-200">
          <div>
            <h2 id="picker-title" className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Standart menyudan keraklisini belgilang. Narxni keyin o'zingiz o'zgartirasiz.
            </p>
          </div>
          <button onClick={onClose} aria-label="Oynani yopish" className="min-h-11 min-w-11 -m-2 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pt-4 space-y-3">
          {done && (
            <div role="status" className="flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              <span>
                Qo'shildi: {done.items} ta taom{done.categories > 0 ? `, ${done.categories} ta kategoriya/sub-menyu` : ''}. Yana tanlashingiz yoki oynani yopishingiz mumkin.
              </span>
            </div>
          )}
          {saveError && <div role="alert" className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>}
          {mode === 'items' ? (
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Taom qidirish: osh, cola, lavash..."
                aria-label="Standart menyudan qidirish"
                className="w-full min-h-11 pl-10 pr-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          ) : (
            <label className="flex items-center gap-2 min-h-11 text-sm text-gray-800">
              <input type="checkbox" checked={withItems} onChange={(e) => setWithItems(e.target.checked)} className="w-5 h-5 accent-amber-700" />
              Taomlari bilan birga qo'shish
            </label>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {isLoading ? (
            <LoadingState label="Standart menyu yuklanmoqda..." />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => refetch()} title="Standart menyuni yuklab bo'lmadi" />
          ) : tree.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-600">
              "{q}" standart menyuda topilmadi — pastdagi "Yangisini yaratish" tugmasini bosing.
            </p>
          ) : (
            <ul className="space-y-2">
              {tree.map((top) => (
                <li key={top.id} className="rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2 px-2">
                    {mode === 'categories' && (
                      <input
                        type="checkbox"
                        aria-label={`${top.name_uz} — butun kategoriya`}
                        checked={pickedCats.has(top.id)}
                        disabled={top.added && top.children.every((s) => s.added)}
                        onChange={() => toggleCat(top.id)}
                        className="w-5 h-5 m-3 accent-amber-700"
                      />
                    )}
                    <button type="button" onClick={() => toggleOpen(top.id)} aria-expanded={isOpen(top.id)} className="flex-1 min-h-12 flex items-center gap-2 px-2 text-left font-medium text-gray-900">
                      {isOpen(top.id) ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
                      {top.name_uz}
                      {top.added && <AddedBadge />}
                    </button>
                  </div>
                  {isOpen(top.id) && (
                    <ul className="border-t border-gray-100 px-3 pb-2">
                      {top.children.map((sub) => {
                        const free = sub.items.filter((i) => !i.added);
                        const allPicked = free.length > 0 && free.every((i) => pickedItems.has(i.id));
                        return (
                          <li key={sub.id} className="mt-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                aria-label={mode === 'items' ? `${sub.name_uz} — barcha taomlari` : sub.name_uz}
                                checked={mode === 'items' ? allPicked : pickedCats.has(sub.id)}
                                disabled={mode === 'items' ? free.length === 0 : sub.added}
                                onChange={() => (mode === 'items' ? toggleSubItems(sub) : toggleCat(sub.id))}
                                className="w-5 h-5 m-3 accent-amber-700"
                              />
                              <span className="text-sm font-semibold text-gray-800">{sub.name_uz}</span>
                              <span className="text-xs text-gray-500">({sub.items.length} ta taom)</span>
                              {sub.added && mode === 'categories' && <AddedBadge />}
                            </div>
                            {mode === 'items' && (
                              <ul className="pl-8">
                                {sub.items.map((i) => (
                                  <li key={i.id}>
                                    <label className={`flex items-center gap-3 min-h-11 rounded-lg px-2 ${i.added ? 'opacity-70' : 'hover:bg-gray-50 cursor-pointer'}`}>
                                      <input
                                        type="checkbox"
                                        checked={i.added || pickedItems.has(i.id)}
                                        disabled={i.added}
                                        onChange={() => toggleItem(i.id)}
                                        className="w-5 h-5 accent-amber-700"
                                      />
                                      <span className="flex-1 text-sm text-gray-900">{i.name_uz}</span>
                                      {i.added ? (
                                        <AddedBadge />
                                      ) : (
                                        <span className="text-sm text-gray-700 tabular-nums whitespace-nowrap">
                                          {formatMoney(i.price)}{i.sell_type === 'weight' ? ' / kg' : ''}
                                        </span>
                                      )}
                                    </label>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 p-5 border-t border-gray-200">
          <button
            type="button"
            onClick={onCreateNew}
            className="sm:mr-auto min-h-11 inline-flex items-center justify-center gap-1 px-4 border border-gray-300 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <Plus size={16} aria-hidden="true" />
            Standartda yo'qmi? Yangisini yaratish
          </button>
          <button
            type="button"
            onClick={() => { setSaveError(''); mutation.mutate(); }}
            disabled={count === 0 || mutation.isPending}
            className="min-h-11 px-5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50"
          >
            {mutation.isPending ? "Qo'shilmoqda..." : `Tanlanganlarni qo'shish (${count})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
      <Check size={12} aria-hidden="true" /> Qo'shilgan
    </span>
  );
}
