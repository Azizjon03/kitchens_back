import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import Layout from '../components/Layout';
import { ErrorState, LoadingState } from '../components/QueryState';
import { apiErrorMessage } from '../lib/apiError';
import { formatDateTime } from '../lib/format';

/** #37: super admin — platformaning xodimlar botini boshqarish. */
interface StaffBotInfo {
  configured: boolean;
  source: 'panel' | 'env' | null;
  username: string | null;
  bot_url: string | null;
  status: 'connected' | 'disconnected' | 'unknown' | 'not_configured';
  last_error: string | null;
  last_checked_at: string | null;
  pending_updates: number;
  login_code: boolean;
  webhook_url: string;
  mini_app_url: string;
  linked_total: number;
  companies: { id: number; name: string; is_active: boolean; staff_total: number; staff_linked: number }[];
}

const STATUS: Record<StaffBotInfo['status'], { label: string; cls: string }> = {
  connected: { label: 'Ulangan', cls: 'bg-green-100 text-green-800' },
  disconnected: { label: 'Uzilgan', cls: 'bg-red-100 text-red-800' },
  unknown: { label: 'Tekshirilmagan', cls: 'bg-gray-100 text-gray-800' },
  not_configured: { label: 'Sozlanmagan', cls: 'bg-gray-100 text-gray-800' },
};

export default function SuperStaffBotPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery<StaffBotInfo>({
    queryKey: ['super-staff-bot'],
    queryFn: async () => (await api.get('/super/staff-bot')).data.data,
  });
  const [token, setToken] = useState('');
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);

  const done = (text: string) => (info: StaffBotInfo) => {
    queryClient.setQueryData(['super-staff-bot'], info);
    setMessage({ ok: true, text });
  };
  const failed = (err: unknown) => setMessage({ ok: false, text: apiErrorMessage(err, "Bajarib bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.") });

  const save = useMutation({
    mutationFn: async (t: string) => (await api.put('/super/staff-bot', { token: t.trim() })).data.data as StaffBotInfo,
    onSuccess: (info) => { done('Bot ulandi va sozlandi.')(info); setToken(''); setEditing(false); },
    onError: failed,
  });
  const toggleCode = useMutation({
    mutationFn: async (on: boolean) => (await api.patch('/super/staff-bot/settings', { login_code: on })).data.data as StaffBotInfo,
    onSuccess: (info) => done(info.login_code ? 'Tasdiqlash kodi yoqildi.' : "Tasdiqlash kodi o'chirildi.")(info),
    onError: failed,
  });
  const check = useMutation({
    mutationFn: async () => (await api.post('/super/staff-bot/check')).data.data as StaffBotInfo,
    onSuccess: (info) => done(info.status === 'connected' ? 'Bot ishlayapti.' : 'Bot uzilgan — xatoni pastda ko\'ring.')(info),
    onError: failed,
  });
  const remove = useMutation({
    mutationFn: async () => (await api.delete('/super/staff-bot')).data.data as StaffBotInfo,
    onSuccess: (info) => { done('Bot uzildi.')(info); setConfirmOff(false); },
    onError: failed,
  });

  const submit = (e: FormEvent) => { e.preventDefault(); setMessage(null); save.mutate(token); };
  const st = data ? STATUS[data.status] : null;

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Xodimlar boti</h1>
          <p className="text-sm text-gray-600 mt-1">
            Barcha restoranlar xodimlari uchun bitta bot: ofitsiant buyurtma beradi, oshpaz «Tayyor» ni bosadi, rahbarga hisobot keladi.
          </p>
        </div>

        {isLoading ? <LoadingState /> : isError || !data ? <ErrorState error={error} onRetry={() => refetch()} /> : (
          <div className="space-y-4">
            {message && (
              <p role={message.ok ? 'status' : 'alert'} className={`rounded-lg border px-4 py-3 text-sm ${message.ok ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-800'}`}>
                {message.text}
              </p>
            )}

            <section className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-900">Holat</h2>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-800">
                    {st && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>}
                    {data.bot_url && (
                      <a href={data.bot_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-sky-800 hover:underline">
                        @{data.username} <ExternalLink size={14} aria-hidden="true" />
                      </a>
                    )}
                    {data.source === 'env' && <span className="text-gray-600">(token server .env faylida)</span>}
                  </p>
                  {data.last_error && <p className="mt-2 text-sm text-red-700">{data.last_error}</p>}
                  <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div><dt className="inline text-gray-600">Oxirgi tekshiruv: </dt><dd className="inline text-gray-900">{data.last_checked_at ? formatDateTime(data.last_checked_at) : '—'}</dd></div>
                    <div><dt className="inline text-gray-600">Navbatdagi xabarlar: </dt><dd className="inline text-gray-900">{data.pending_updates}</dd></div>
                    <div><dt className="inline text-gray-600">Ulangan xodimlar: </dt><dd className="inline text-gray-900">{data.linked_total}</dd></div>
                  </dl>
                </div>
                {data.configured && (
                  <button type="button" onClick={() => { setMessage(null); check.mutate(); }} disabled={check.isPending}
                    className="min-h-11 inline-flex items-center gap-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50">
                    <RefreshCw size={16} aria-hidden="true" className={check.isPending ? 'animate-spin' : ''} /> Tekshirish
                  </button>
                )}
              </div>
              <p className="mt-3 text-xs text-gray-600">Tizim har 5 daqiqada tekshiradi va yo'qolgan webhookni o'zi tiklaydi.</p>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900">Bot tokeni</h2>
              {data.configured && !editing ? (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-gray-800">Token saqlangan (shifrlangan, ko'rsatilmaydi).</span>
                  <button type="button" onClick={() => setEditing(true)} className="min-h-11 px-3 text-amber-800 font-medium hover:underline">Almashtirish</button>
                  {data.source === 'panel' && (
                    confirmOff ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-red-800">Bot uzilsa, xodimlarga xabar bormaydi.</span>
                        <button type="button" onClick={() => remove.mutate()} disabled={remove.isPending} className="min-h-11 px-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">Uzish</button>
                        <button type="button" onClick={() => setConfirmOff(false)} className="min-h-11 px-3 text-gray-700">Bekor</button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirmOff(true)} className="min-h-11 px-3 text-red-700 hover:underline">Botni uzish</button>
                    )
                  )}
                </div>
              ) : (
                <form onSubmit={submit} className="mt-3 space-y-3">
                  <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
                    <li>Telegram'da @BotFather → /newbot → nom va username bering (masalan, kitchens_xodim_bot).</li>
                    <li>BotFather bergan tokenni shu yerga qo'ying va «Ulash» ni bosing — webhook va menyu tugmasi o'zi o'rnatiladi.</li>
                  </ol>
                  <label htmlFor="sb-token" className="block text-sm font-medium text-gray-700">Token</label>
                  <input id="sb-token" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" spellCheck={false}
                    placeholder="123456789:AAH..." className="w-full min-h-11 px-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                  <div className="flex gap-2">
                    <button type="submit" disabled={save.isPending || token.trim() === ''} className="min-h-11 px-5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50">
                      {save.isPending ? 'Tekshirilmoqda...' : 'Ulash'}
                    </button>
                    {editing && <button type="button" onClick={() => { setEditing(false); setToken(''); }} className="min-h-11 px-4 text-sm text-gray-700">Bekor</button>}
                  </div>
                </form>
              )}
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-5">
              <label className="flex items-start gap-3 cursor-pointer min-h-11">
                <input type="checkbox" checked={data.login_code} disabled={toggleCode.isPending || !data.configured}
                  onChange={(e) => { setMessage(null); toggleCode.mutate(e.target.checked); }} className="w-5 h-5 mt-0.5 accent-amber-700" />
                <span>
                  <span className="block font-medium text-gray-900">Birinchi kirishda tasdiqlash kodi</span>
                  <span className="block text-sm text-gray-600">
                    Yoqilsa: Telegram'i ulanmagan har bir foydalanuvchi (vebda ham) parol to'g'ri bo'lgach botdan kelgan 6 raqamli kodni yozadi. Super admin kodsiz kiradi.
                  </span>
                </span>
              </label>
            </section>

            <section className="bg-white rounded-xl border border-gray-200">
              <h2 className="font-semibold text-gray-900 px-5 pt-5">Restoranlar bo'yicha</h2>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-5 py-3 font-medium">Restoran</th>
                      <th className="px-5 py-3 font-medium">Botga ulangan xodimlar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.companies.map((c) => (
                      <tr key={c.id}>
                        <td className="px-5 py-3 text-gray-900">{c.name}{!c.is_active && <span className="ml-2 text-xs text-gray-600">(bloklangan)</span>}</td>
                        <td className="px-5 py-3 text-gray-800">{c.staff_linked} / {c.staff_total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </Layout>
  );
}
