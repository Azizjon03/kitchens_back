import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutTemplate, Pencil, Plus, Trash2, X } from 'lucide-react';
import api from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { formatMoney } from '../lib/format';
import { ErrorState, LoadingState } from './QueryState';
import { useTableTemplates, type TableTemplate } from '../lib/tableTemplates';

/**
 * Stol shablonlari (#24): stolga oldindan qo'yiladigan narsalar (masalan 3 sharbat, 4 mohito).
 * Mehmon ketayotganda ofitsiant nechtasi ochilganini belgilaydi — faqat o'shalar hisobga.
 */
interface MenuOption {
  id: number;
  label: string;
  price: number;
}

interface PosCategory {
  id: number;
  parent_id?: number | null;
  name_uz: string;
  menu_items?: { id: number; name_uz: string; price: string | number }[];
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none';

function useMenuOptions() {
  return useQuery<PosCategory[], Error, MenuOption[]>({
    queryKey: ['pos-menu', 'table-template-options'],
    queryFn: async () => ((await api.get('/pos/menu')).data.data ?? []) as PosCategory[],
    select: (cats) => {
      const byId = new Map(cats.map((c) => [c.id, c] as const));
      return cats.flatMap((c) => {
        const parent = c.parent_id ? byId.get(c.parent_id) : undefined;
        const group = parent ? `${parent.name_uz} → ${c.name_uz}` : c.name_uz;
        return (c.menu_items ?? []).map((m) => ({ id: m.id, label: `${m.name_uz} (${group})`, price: Number(m.price) }));
      });
    },
  });
}

function TemplateModal({ template, onClose }: { template?: TableTemplate; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: options = [], isLoading } = useMenuOptions();
  const [name, setName] = useState(template?.name ?? '');
  const [rows, setRows] = useState<{ menu_item_id: number | ''; quantity: number }[]>(
    template?.items.map((i) => ({ menu_item_id: i.menu_item_id, quantity: i.quantity })) ?? [{ menu_item_id: '', quantity: 1 }],
  );
  const [error, setError] = useState('');
  const priceOf = useMemo(() => new Map(options.map((o) => [o.id, o.price])), [options]);
  const total = rows.reduce((sum, r) => sum + (r.menu_item_id ? (priceOf.get(r.menu_item_id) ?? 0) * r.quantity : 0), 0);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { name: name.trim(), items: rows.filter((r) => r.menu_item_id) };
      return template
        ? (await api.put(`/table-templates/${template.id}`, payload)).data
        : (await api.post('/table-templates', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-templates'] });
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const update = (i: number, patch: Partial<(typeof rows)[number]>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{template ? 'Shablonni tahrirlash' : 'Yangi stol shabloni'}</h2>
          <button onClick={onClose} aria-label="Oynani yopish" className="min-h-11 min-w-11 -m-2 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            mutation.mutate();
          }}
          className="p-5 space-y-4 overflow-y-auto"
        >
          {error && <div role="alert" className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">{error}</div>}
          <div>
            <label htmlFor="tpl-name" className="block text-sm font-medium text-gray-700 mb-1">
              Shablon nomi <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input id="tpl-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: VIP stol, Oilaviy stol" className={inputClass} />
          </div>

          <div>
            <p className="block text-sm font-medium text-gray-700 mb-1">Stolga qo'yiladigan narsalar</p>
            <p className="text-xs text-gray-500 mb-2">Mehmon ketayotganda faqat ochilganlari hisobga qo'shiladi.</p>
            {isLoading ? (
              <LoadingState label="Menyu yuklanmoqda..." />
            ) : (
              <div className="space-y-2">
                {rows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      aria-label={`${i + 1}-narsa`}
                      required
                      value={r.menu_item_id}
                      onChange={(e) => update(i, { menu_item_id: e.target.value ? Number(e.target.value) : '' })}
                      className={`${inputClass} flex-1 min-h-11`}
                    >
                      <option value="">Menyudan tanlang...</option>
                      {options.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      aria-label="Soni"
                      min={1}
                      max={99}
                      required
                      value={r.quantity}
                      onChange={(e) => update(i, { quantity: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })}
                      className="w-20 h-11 px-3 border border-gray-300 rounded-lg text-base text-center"
                    />
                    <button
                      type="button"
                      onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                      disabled={rows.length === 1}
                      aria-label="Qatorni olib tashlash"
                      className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setRows((rs) => [...rs, { menu_item_id: '', quantity: 1 }])}
                  className="min-h-11 inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800"
                >
                  <Plus size={16} /> Yana narsa qo'shish
                </button>
                {options.length === 0 && (
                  <p className="text-sm text-gray-500">Menyuda hali taom yo'q — avval "Menyu" bo'limida taom qo'shing.</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm">
            <span className="text-gray-600">Hammasi ochilsa:</span>
            <span className="font-semibold text-gray-900 tabular-nums">{formatMoney(total)}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 min-h-11 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
              Bekor qilish
            </button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 min-h-11 px-4 py-2.5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50">
              {mutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TableTemplatesPanel() {
  const queryClient = useQueryClient();
  const { data: templates = [], isLoading, isError, error, refetch } = useTableTemplates();
  const [editing, setEditing] = useState<TableTemplate | 'new' | null>(null);
  const [deleting, setDeleting] = useState<TableTemplate | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/table-templates/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-templates'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setDeleting(null);
    },
    onError: (err) => setDeleteError(apiErrorMessage(err)),
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-600 max-w-xl">
          Shablon — stolga oldindan qo'yiladigan narsalar ro'yxati. Stol qo'shishda yoki tahrirlashda tanlanadi.
        </p>
        <button onClick={() => setEditing('new')} className="inline-flex items-center gap-2 min-h-11 bg-amber-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-800">
          <Plus size={18} /> Yangi shablon
        </button>
      </div>

      {isLoading ? (
        <LoadingState label="Shablonlar yuklanmoqda..." />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} title="Shablonlarni yuklab bo'lmadi" />
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <LayoutTemplate size={40} className="text-gray-300 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-700 font-medium">Hali shablon yo'q</p>
          <p className="text-sm text-gray-500 mt-1">Stolga har doim bir xil narsalar qo'yilsa (masalan 3 sharbat, 4 mohito), "Yangi shablon" tugmasini bosing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => {
            const total = t.items.reduce((s, i) => s + Number(i.menu_item?.price ?? 0) * i.quantity, 0);
            return (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{t.tables_count ?? 0} ta stolda</span>
                </div>
                <ul className="mt-2 text-sm text-gray-700 space-y-0.5 flex-1">
                  {t.items.map((i) => (
                    <li key={i.id}>
                      {i.menu_item?.name_uz ?? '—'} <span className="text-gray-500">× {i.quantity}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-gray-600">
                  Hammasi ochilsa: <span className="font-medium text-gray-900 tabular-nums">{formatMoney(total)}</span>
                </p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setEditing(t)} className="flex-1 min-h-11 inline-flex items-center justify-center gap-1 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                    <Pencil size={16} /> Tahrirlash
                  </button>
                  <button onClick={() => { setDeleteError(''); setDeleting(t); }} className="min-h-11 px-3 inline-flex items-center justify-center gap-1 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50">
                    <Trash2 size={16} /> O'chirish
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <TemplateModal template={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}

      {deleting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900">"{deleting.name}" o'chirilsinmi?</h2>
            <p className="text-sm text-gray-600 mt-2">
              Bu shablon {deleting.tables_count ?? 0} ta stoldan olib tashlanadi. Avval ochilgan hisoblarga ta'sir qilmaydi.
            </p>
            {deleteError && <p role="alert" className="mt-3 text-sm text-red-600">{deleteError}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDeleting(null)} className="flex-1 min-h-11 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Orqaga</button>
              <button onClick={() => deleteMutation.mutate(deleting.id)} disabled={deleteMutation.isPending} className="flex-1 min-h-11 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {deleteMutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
