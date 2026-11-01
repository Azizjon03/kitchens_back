import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import api from '../lib/api';
import Layout from '../components/Layout';
import PageGuide from '../components/PageGuide';
import { ErrorState, LoadingState } from '../components/QueryState';
import { apiErrorMessage, apiFieldErrors } from '../lib/apiError';
import { useEscape } from '../lib/useEscape';

/** #40: oshxona bo'limlari — har bo'limga kategoriyalar va oshpazlar biriktiriladi. */
interface Station {
  id: number;
  name: string;
  is_active: boolean;
  users: { id: number; name: string }[];
  categories: { id: number; name_uz: string }[];
}
interface Cat { id: number; name_uz: string; parent_id: number | null; kitchen_station_id?: number | null; icon?: string | null }
interface Chef { id: number; name?: string; full_name?: string }

function StationModal({ station, stations, cats, chefs, onClose }: {
  station?: Station; stations: Station[]; cats: Cat[]; chefs: Chef[]; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  useEscape(onClose);
  const [name, setName] = useState(station?.name ?? '');
  const [catIds, setCatIds] = useState<number[]>(station?.categories.map((c) => c.id) ?? []);
  const [userIds, setUserIds] = useState<number[]>(station?.users.map((u) => u.id) ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const owner = new Map(stations.flatMap((st) => st.categories.map((c) => [c.id, st] as const)));
  const tops = cats.filter((c) => !c.parent_id);
  const toggle = (list: number[], id: number) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const save = useMutation({
    mutationFn: async () => {
      const body = { name: name.trim(), category_ids: catIds, user_ids: userIds };
      return station ? api.put(`/kitchen-stations/${station.id}`, body) : api.post('/kitchen-stations', body);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kitchen-stations'] }); queryClient.invalidateQueries({ queryKey: ['station-categories'] }); onClose(); },
    onError: (err) => {
      const fe = apiFieldErrors(err);
      setErrors(Object.keys(fe).length ? fe : { _: apiErrorMessage(err, "Saqlab bo'lmadi") });
    },
  });

  const catRow = (c: Cat, sub = false) => {
    const other = owner.get(c.id);
    const busy = other && other.id !== station?.id;
    return (
      <label key={c.id} className={`flex items-center gap-3 min-h-11 cursor-pointer ${sub ? 'pl-7' : ''}`}>
        <input type="checkbox" checked={catIds.includes(c.id)} onChange={() => setCatIds((l) => toggle(l, c.id))} className="w-5 h-5 accent-amber-700" />
        <span className={sub ? 'text-gray-800' : 'font-medium text-gray-900'}>
          {c.icon ? `${c.icon} ` : ''}{c.name_uz}
          {busy && <span className="ml-2 text-xs text-gray-600">(hozir: {other.name} — tanlansa shu yerga o'tadi)</span>}
        </span>
      </label>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <form
        role="dialog" aria-modal="true" aria-labelledby="st-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e: FormEvent) => { e.preventDefault(); setErrors({}); save.mutate(); }}
        className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 id="st-title" className="text-lg font-semibold text-gray-900">{station ? "Bo'limni tahrirlash" : "Yangi bo'lim"}</h2>
          <button type="button" onClick={onClose} aria-label="Yopish" className="min-h-11 min-w-11 inline-flex items-center justify-center text-gray-600 hover:text-gray-900"><X size={20} /></button>
        </div>

        <div>
          <label htmlFor="st-name" className="block text-sm font-medium text-gray-700 mb-1">Nomi</label>
          <input id="st-name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Kabob, Somsa, Salatlar, Osh"
            aria-invalid={!!errors.name} className="w-full min-h-11 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
          {errors.name && <p className="mt-1 text-sm text-red-700">{errors.name}</p>}
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-gray-700">Qaysi taomlar shu bo'limda tayyorlanadi?</legend>
          <p className="text-xs text-gray-600 mb-2">Menyu bo'limini belgilasangiz, ichidagi barcha sub-menyular ham shu yerga tushadi.</p>
          {cats.length === 0 ? <p className="text-sm text-gray-600">Menyuda hali kategoriya yo'q.</p> : (
            <div className="rounded-lg border border-gray-200 px-3 py-1 max-h-64 overflow-y-auto">
              {tops.map((top) => (
                <div key={top.id}>
                  {catRow(top)}
                  {cats.filter((c) => c.parent_id === top.id).map((c) => catRow(c, true))}
                </div>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-gray-700">Oshpazlar</legend>
          <p className="text-xs text-gray-600 mb-2">Belgilangan oshpaz oshxona ekranida va botda faqat shu bo'lim taomlarini ko'radi.</p>
          {chefs.length === 0 ? <p className="text-sm text-gray-600">Oshpaz yo'q — «Xodimlar» bo'limida qo'shing.</p> : (
            <div className="flex flex-wrap gap-2">
              {chefs.map((c) => (
                <label key={c.id} className={`inline-flex items-center gap-2 min-h-11 px-3 rounded-lg border cursor-pointer ${userIds.includes(c.id) ? 'border-amber-600 bg-amber-50' : 'border-gray-300'}`}>
                  <input type="checkbox" checked={userIds.includes(c.id)} onChange={() => setUserIds((l) => toggle(l, c.id))} className="w-4 h-4 accent-amber-700" />
                  <span className="text-sm text-gray-900">{c.name || c.full_name}</span>
                </label>
              ))}
            </div>
          )}
          {errors['user_ids.0'] && <p className="mt-1 text-sm text-red-700">{errors['user_ids.0']}</p>}
        </fieldset>

        {errors._ && <p role="alert" className="text-sm text-red-700">{errors._}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="min-h-11 px-4 text-sm text-gray-700">Bekor qilish</button>
          <button type="submit" disabled={save.isPending} className="min-h-11 px-5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50">
            {save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function KitchenStationsPage() {
  const queryClient = useQueryClient();
  const { data: stations = [], isLoading, isError, error, refetch } = useQuery<Station[]>({
    queryKey: ['kitchen-stations'],
    queryFn: async () => (await api.get('/kitchen-stations')).data.data,
  });
  const { data: cats = [] } = useQuery<Cat[]>({
    queryKey: ['station-categories'],
    queryFn: async () => {
      const list = (await api.get('/categories')).data.data as (Cat & { children?: Cat[] })[];
      // API ota kategoriyalarni bolalari bilan ham qaytaradi — tekis, takrorsiz ro'yxat
      const all = new Map<number, Cat>();
      list.forEach((c) => { all.set(c.id, c); c.children?.forEach((ch) => all.set(ch.id, ch)); });
      return [...all.values()];
    },
  });
  const { data: chefs = [] } = useQuery<Chef[]>({
    queryKey: ['chefs'],
    queryFn: async () => (await api.get('/kitchen-stations/chefs')).data.data,
  });
  const [modal, setModal] = useState<{ station?: Station } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Station | null>(null);

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/kitchen-stations/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kitchen-stations'] }); setConfirmDelete(null); },
  });

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Oshxona bo'limlari</h1>
            <p className="text-sm text-gray-600 mt-1">Har oshpaz faqat o'z bo'limi taomlarini ko'radi va tayyorlaydi</p>
          </div>
          <button type="button" onClick={() => setModal({})} className="min-h-11 inline-flex items-center gap-2 px-4 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800">
            <Plus size={18} aria-hidden="true" /> Yangi bo'lim
          </button>
        </div>

        <PageGuide id="kitchenStations" />

        {isLoading ? <LoadingState /> : isError ? <ErrorState error={error} onRetry={() => refetch()} /> : stations.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-900 font-medium">Hali bo'lim yo'q</p>
            <p className="mt-1 text-sm text-gray-600">Bo'lim bo'lmasa, har oshpaz barcha taomlarni ko'radi. Oshxona bir necha joyda bo'lsa (kabob tashqarida, osh ichkarida) — bo'lim yarating.</p>
            <button type="button" onClick={() => setModal({})} className="mt-4 min-h-11 px-4 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800">Birinchi bo'limni yaratish</button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stations.map((st) => (
              <li key={st.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">{st.name}</h2>
                  <div className="flex -mr-2 -mt-2">
                    <button type="button" onClick={() => setModal({ station: st })} aria-label={`${st.name} — tahrirlash`} className="min-h-11 min-w-11 inline-flex items-center justify-center text-gray-600 hover:text-amber-800"><Pencil size={18} /></button>
                    <button type="button" onClick={() => setConfirmDelete(st)} aria-label={`${st.name} — o'chirish`} className="min-h-11 min-w-11 inline-flex items-center justify-center text-gray-600 hover:text-red-700"><Trash2 size={18} /></button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600">Taomlar</p>
                <p className="text-sm text-gray-900">{st.categories.length ? st.categories.map((c) => c.name_uz).join(', ') : <span className="text-amber-800">Biriktirilmagan — ekranda taom chiqmaydi</span>}</p>
                <p className="mt-2 text-sm text-gray-600">Oshpazlar</p>
                <p className="text-sm text-gray-900">{st.users.length ? st.users.map((u) => u.name).join(', ') : <span className="text-gray-600">Yo'q — umumiy planshetdan bo'lim tanlab ishlatiladi</span>}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modal && <StationModal station={modal.station} stations={stations} cats={cats} chefs={chefs} onClose={() => setModal(null)} />}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmDelete(null)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-5 max-w-sm w-full">
            <h2 id="del-title" className="text-lg font-semibold text-gray-900">«{confirmDelete.name}» bo'limini o'chirasizmi?</h2>
            <p className="mt-2 text-sm text-gray-700">Uning taomlari va oshpazlari bo'limsiz qoladi — oshpazlar yana barcha taomlarni ko'radi.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDelete(null)} className="min-h-11 px-4 text-sm text-gray-700">Bekor qilish</button>
              <button type="button" onClick={() => remove.mutate(confirmDelete.id)} disabled={remove.isPending} className="min-h-11 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">O'chirish</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
