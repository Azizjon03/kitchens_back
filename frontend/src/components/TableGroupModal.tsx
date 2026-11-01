import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import api from '../lib/api';
import { apiErrorMessage, apiFieldErrors } from '../lib/apiError';
import { useEscape } from '../lib/useEscape';
import type { Branch, Table, TableGroup } from '../types';

/** #49: zal — nom, ichidagi stollar, butun zalga buyurtma ruxsati */
export default function TableGroupModal({ group, branches, tables, onClose }: {
  group?: TableGroup;
  branches: Branch[];
  tables: Table[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  useEscape(onClose);
  const [name, setName] = useState(group?.name ?? '');
  const [branchId, setBranchId] = useState<number>(group?.branch_id ?? branches[0]?.id ?? 0);
  const [allowWhole, setAllowWhole] = useState(group?.allow_whole ?? true);
  const [ids, setIds] = useState<number[]>(
    tables.filter((t) => group && t.table_group_id === group.id && !t.is_whole_group).map((t) => t.id),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const candidates = tables
    .filter((t) => !t.is_whole_group && t.branch_id === branchId)
    .sort((a, b) => String(a.number).localeCompare(String(b.number), 'uz', { numeric: true }));
  const seats = candidates.filter((t) => ids.includes(t.id)).reduce((s, t) => s + t.seats, 0);

  const save = useMutation({
    mutationFn: async () => {
      const body = { name: name.trim(), allow_whole: allowWhole, table_ids: ids };
      return group ? api.put(`/table-groups/${group.id}`, body) : api.post('/table-groups', { ...body, branch_id: branchId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['table-groups'] });
      queryClient.invalidateQueries({ queryKey: ['waiter-tables'] });
      onClose();
    },
    onError: (err) => {
      const fe = apiFieldErrors(err);
      setErrors(Object.keys(fe).length ? fe : { _: apiErrorMessage(err, "Saqlab bo'lmadi") });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-labelledby="tg-title" onClick={(e) => e.stopPropagation()}
        onSubmit={(e: FormEvent) => { e.preventDefault(); setErrors({}); save.mutate(); }}
        className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="tg-title" className="text-lg font-semibold text-gray-900">{group ? 'Zalni tahrirlash' : 'Yangi zal'}</h2>
          <button type="button" onClick={onClose} aria-label="Yopish" className="min-h-11 min-w-11 inline-flex items-center justify-center text-gray-600 hover:text-gray-900"><X size={20} /></button>
        </div>

        <div>
          <label htmlFor="tg-name" className="block text-sm font-medium text-gray-700 mb-1">Nomi</label>
          <input id="tg-name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Katta zal, Kichik zal, Tepa"
            aria-invalid={!!errors.name} className="w-full min-h-11 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
          {errors.name && <p className="mt-1 text-sm text-red-700">{errors.name}</p>}
        </div>

        {!group && branches.length > 1 && (
          <div>
            <label htmlFor="tg-branch" className="block text-sm font-medium text-gray-700 mb-1">Filial</label>
            <select id="tg-branch" value={branchId} onChange={(e) => { setBranchId(Number(e.target.value)); setIds([]); }} className="w-full min-h-11 px-3 border border-gray-300 rounded-lg text-sm">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        <label className="flex items-start gap-3 min-h-11 cursor-pointer">
          <input type="checkbox" checked={allowWhole} onChange={(e) => setAllowWhole(e.target.checked)} className="w-5 h-5 mt-0.5 accent-amber-700" />
          <span>
            <span className="block font-medium text-gray-900">Butun zalga buyurtma olish mumkin</span>
            <span className="block text-sm text-gray-600">
              Ofitsiant ekranida «{name.trim() || 'Zal'} — butun zal» joyi chiqadi{seats ? ` (${seats} kishi)` : ''}. Butun zal band bo'lsa ichidagi stollar ham band bo'ladi, biror stol band bo'lsa butun zalni olib bo'lmaydi.
            </span>
          </span>
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-1">Zal ichidagi stollar</legend>
          {candidates.length === 0 ? <p className="text-sm text-gray-600">Bu filialda stol yo'q — avval stol qo'shing.</p> : (
            <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
              {candidates.map((t) => {
                const other = t.group && t.group.id !== group?.id ? t.group.name : null;
                const on = ids.includes(t.id);
                return (
                  <label key={t.id} className={`flex items-center gap-2 min-h-11 px-2 rounded-lg border cursor-pointer ${on ? 'border-amber-600 bg-amber-50' : 'border-gray-200'}`}>
                    <input type="checkbox" checked={on} onChange={() => setIds((l) => (on ? l.filter((x) => x !== t.id) : [...l, t.id]))} className="w-4 h-4 accent-amber-700" />
                    <span className="min-w-0 text-sm">
                      <span className="block text-gray-900 truncate">{t.number}</span>
                      <span className="block text-xs text-gray-600">{t.seats} kishi{other ? ` · hozir: ${other}` : ''}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        {errors._ && <p role="alert" className="text-sm text-red-700">{errors._}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-11 px-4 text-sm text-gray-700">Bekor qilish</button>
          <button type="submit" disabled={save.isPending} className="min-h-11 px-5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50">
            {save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </div>
  );
}
