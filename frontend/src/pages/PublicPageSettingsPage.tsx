import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Globe } from 'lucide-react';
import api from '../lib/api';
import Layout from '../components/Layout';
import PageGuide from '../components/PageGuide';
import { ErrorState, LoadingState } from '../components/QueryState';
import { apiErrorMessage, apiFieldErrors } from '../lib/apiError';

/** #27: restoranning Google'da ko'rinadigan ochiq menyu sahifasi — kitchens.uz/r/{slug}. */
interface PublicPage {
  enabled: boolean;
  description: string | null;
  city: string | null;
  address: string | null;
  opens: string | null;
  closes: string | null;
  cuisine: string | null;
  latitude: number | null;
  longitude: number | null;
  url: string;
}

type Form = Record<'description' | 'city' | 'address' | 'opens' | 'closes' | 'cuisine' | 'latitude' | 'longitude', string> & { enabled: boolean };

const toForm = (p: PublicPage): Form => ({
  enabled: p.enabled,
  description: p.description ?? '',
  city: p.city ?? '',
  address: p.address ?? '',
  opens: p.opens ?? '',
  closes: p.closes ?? '',
  cuisine: p.cuisine ?? '',
  latitude: p.latitude?.toString() ?? '',
  longitude: p.longitude?.toString() ?? '',
});

const inputClass = 'w-full min-h-11 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none';

export default function PublicPageSettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery<PublicPage>({
    queryKey: ['public-page'],
    queryFn: async () => (await api.get('/public-page')).data.data,
  });
  // Tahrir qilinmaguncha — serverdagi qiymat
  const [edit, setEdit] = useState<Form | null>(null);
  const form = edit ?? (data ? toForm(data) : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: async (f: Form) => {
      const blank = (v: string) => (v.trim() === '' ? null : v.trim());
      return (await api.put('/public-page', {
        enabled: f.enabled,
        description: blank(f.description),
        city: blank(f.city),
        address: blank(f.address),
        opens: blank(f.opens),
        closes: blank(f.closes),
        cuisine: blank(f.cuisine),
        latitude: blank(f.latitude) === null ? null : Number(f.latitude),
        longitude: blank(f.longitude) === null ? null : Number(f.longitude),
      })).data.data as PublicPage;
    },
    onSuccess: (p) => {
      queryClient.setQueryData(['public-page'], p);
      setEdit(null);
      setErrors({});
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => {
      const fe = apiFieldErrors(err);
      setErrors(Object.keys(fe).length ? fe : { _: apiErrorMessage(err) });
    },
  });

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    form && setEdit({ ...form, [k]: e.target.value });

  const field = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`pp-${k}`} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        id={`pp-${k}`}
        value={form ? String(form[k]) : ''}
        onChange={set(k)}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `pp-${k}-error` : undefined}
        className={inputClass}
        {...props}
      />
      {errors[k] && <p id={`pp-${k}-error`} className="mt-1 text-sm text-red-600">{errors[k]}</p>}
    </div>
  );

  return (
    <Layout>
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Restoran sahifasi</h1>
          <p className="text-sm text-gray-600 mt-1">Mijozlar Google'da restoraningiz menyusini topishi uchun</p>
        </div>

        <PageGuide
          id="public-page"
          title="Bu sahifa nima beradi?"
          intro="Restoraningiz uchun ochiq sahifa: nomi, manzil, telefon, ish vaqti va to'liq menyu narxlari bilan. Google va Yandex uni topadi — odamlar «Chust restoran menyu» deb qidirganda chiqishi mumkin."
          steps={[
            "Shahar, manzil va ish vaqtini yozing — qidiruvda aynan shular bo'yicha topishadi.",
            "Qisqa tavsif yozing (masalan: «Chustdagi to'y oshi va shashlik, oilaviy zal»).",
            "«Sahifa ochiq» ni yoqing va «Saqlash» ni bosing.",
            "Havolani Instagram, Telegram kanal va Google xaritadagi profilingizga qo'ying.",
            "Menyu o'zgarsa sahifa o'zi yangilanadi.",
          ]}
        />

        {isLoading || !form ? (
          isError ? <ErrorState error={error} onRetry={() => refetch()} /> : <LoadingState />
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}
            className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
          >
            <label className="flex items-start gap-3 min-h-11 cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setEdit({ ...form, enabled: e.target.checked })}
                className="w-5 h-5 mt-0.5 accent-amber-700"
              />
              <span>
                <span className="block font-medium text-gray-900">Sahifa ochiq</span>
                <span className="block text-sm text-gray-600">O'chirilsa, sahifa hech kimga ko'rinmaydi va qidiruvdan chiqib ketadi.</span>
              </span>
            </label>

            {data && (
              <p className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                <Globe size={16} aria-hidden="true" /> Havola:
                {data.enabled ? (
                  <a href={data.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber-700 hover:underline break-all">
                    {data.url} <ExternalLink size={14} aria-hidden="true" />
                  </a>
                ) : (
                  <span className="text-gray-600 break-all">{data.url} (saqlangandan keyin ochiladi)</span>
                )}
              </p>
            )}

            <div>
              <label htmlFor="pp-description" className="block text-sm font-medium text-gray-700 mb-1">Qisqa tavsif</label>
              <textarea
                id="pp-description"
                rows={3}
                maxLength={500}
                value={form.description}
                onChange={set('description')}
                placeholder="Masalan: Chustdagi to'y oshi va shashlik, oilaviy zal, yetkazib berish"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('city', 'Shahar yoki tuman', { placeholder: 'Chust', maxLength: 60 })}
              {field('cuisine', 'Oshxona turi', { placeholder: "O'zbek taomlari", maxLength: 60 })}
            </div>
            {field('address', 'Manzil', { placeholder: "Navoiy ko'chasi 5, bozor yonida", maxLength: 255 })}
            <div className="grid grid-cols-2 gap-4">
              {field('opens', 'Ochiladi', { type: 'time' })}
              {field('closes', 'Yopiladi', { type: 'time' })}
            </div>
            <details className="rounded-lg border border-gray-200 px-4 py-2">
              <summary className="min-h-11 flex items-center cursor-pointer text-sm font-medium text-gray-800">Xaritadagi nuqta (ixtiyoriy)</summary>
              <p className="text-sm text-gray-600 mb-3">Google xaritada restoraningizni bosib turing — pastda chiqqan ikki raqamni (masalan 40.9983, 71.2372) shu yerga yozing.</p>
              <div className="grid grid-cols-2 gap-4 pb-2">
                {field('latitude', 'Kenglik', { inputMode: 'decimal', placeholder: '40.9983' })}
                {field('longitude', 'Uzunlik', { inputMode: 'decimal', placeholder: '71.2372' })}
              </div>
            </details>

            {errors._ && <p role="alert" className="text-sm text-red-600">{errors._}</p>}
            <div className="flex items-center gap-3">
              <button type="submit" disabled={save.isPending} className="min-h-11 px-5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50">
                {save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
              {saved && <span role="status" className="text-sm text-green-800">Saqlandi</span>}
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
