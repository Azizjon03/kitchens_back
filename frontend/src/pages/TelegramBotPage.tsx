import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, CheckCircle2, Copy, ExternalLink, RefreshCw, Unplug, Users, XCircle } from 'lucide-react';
import api from '../lib/api';
import Layout from '../components/Layout';
import PageGuide from '../components/PageGuide';
import { ErrorState, LoadingState } from '../components/QueryState';
import { apiErrorMessage, apiFieldErrors } from '../lib/apiError';
import { formatDateTime } from '../lib/format';

/** #26: restoranning o'z Telegram boti — ulash, holat, guruh va rahbar chati. */
interface BotInfo {
  username: string | null;
  name: string | null;
  status: 'connected' | 'disconnected';
  last_checked_at: string | null;
  last_error: string | null;
  pending_updates: number;
  connect_code: string;
  group_title: string | null;
  group_connected: boolean;
  owner_connected: boolean;
  owner_link: string | null;
  bot_link: string | null;
}

const GUIDE_STEPS = [
  "Telegram'da @BotFather ni oching va /newbot buyrug'ini yuboring.",
  "Bot nomini (masalan: «Oliyaviy Restoran») va manzilini (oxiri _bot bilan, masalan oliyaviy_bot) yozing.",
  "BotFather bergan tokenni (123456789:AA... ko'rinishidagi uzun matn) nusxalang.",
  "Tokenni pastdagi maydonga qo'yib «Tekshirish va ulash» tugmasini bosing — qolganini tizim o'zi sozlaydi.",
  "Mijozlar botga /start yozadi: raqam, ism va manzilni yuboradi, so'ng «🛒 Buyurtma berish» tugmasi chiqadi.",
];

export default function TelegramBotPage() {
  const queryClient = useQueryClient();
  const { data: bot, isLoading, isError, error, refetch } = useQuery<BotInfo | null>({
    queryKey: ['telegram-bot'],
    queryFn: async () => (await api.get('/telegram-bot')).data.data,
  });
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [actionError, setActionError] = useState('');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [copied, setCopied] = useState(false);

  const setBot = (b: BotInfo | null) => queryClient.setQueryData(['telegram-bot'], b);

  const connect = useMutation({
    mutationFn: async () => (await api.post('/telegram-bot', { token: token.trim() })).data.data as BotInfo,
    onSuccess: (b) => { setBot(b); setToken(''); setTokenError(''); },
    onError: (err) => setTokenError(apiFieldErrors(err).token || apiErrorMessage(err)),
  });
  const reconnect = useMutation({
    mutationFn: async () => (await api.post('/telegram-bot/reconnect')).data.data as BotInfo,
    onSuccess: (b) => { setBot(b); setActionError(''); },
    onError: (err) => setActionError(apiErrorMessage(err)),
  });
  const disconnect = useMutation({
    mutationFn: async () => api.delete('/telegram-bot'),
    onSuccess: () => { setBot(null); setConfirmDisconnect(false); },
    onError: (err) => setActionError(apiErrorMessage(err)),
  });

  const copyCode = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard yo'q (http) — kod ekranda ko'rinib turibdi */
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Telegram bot</h1>
          <p className="text-sm text-gray-600 mt-1">Mijozlar restoraningiz botidan buyurtma beradi</p>
        </div>

        <PageGuide
          id="telegram-bot"
          title="Botni qanday ulash kerak?"
          intro="Har restoranning o'z boti bo'ladi — nomi va rasmi sizniki. Ulash 5 daqiqa oladi, dasturchi kerak emas."
          steps={GUIDE_STEPS}
        />

        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : !bot || bot.status === 'disconnected' ? (
          <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            {bot && (
              <div role="alert" className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <XCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium">@{bot.username} — aloqa uzilgan</p>
                  {bot.last_error && <p className="mt-0.5">{bot.last_error}</p>}
                  <button
                    type="button"
                    onClick={() => reconnect.mutate()}
                    disabled={reconnect.isPending}
                    className="mt-2 min-h-11 inline-flex items-center gap-2 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    <RefreshCw size={16} aria-hidden="true" className={reconnect.isPending ? 'animate-spin' : ''} />
                    {reconnect.isPending ? 'Ulanmoqda...' : 'Qayta ulash'}
                  </button>
                  {actionError && <p className="mt-2">{actionError}</p>}
                </div>
              </div>
            )}
            <h2 className="font-semibold text-gray-900 mb-1">{bot ? 'Yangi token bilan ulash' : 'Botni ulash'}</h2>
            <p className="text-sm text-gray-600 mb-4">Token BotFather'dan olinadi (yuqoridagi yo'riqnomaga qarang).</p>
            <form
              onSubmit={(e) => { e.preventDefault(); setTokenError(''); connect.mutate(); }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="flex-1">
                <label htmlFor="bot-token" className="sr-only">Bot tokeni</label>
                <input
                  id="bot-token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="123456789:AAH..."
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={!!tokenError}
                  aria-describedby={tokenError ? 'bot-token-error' : undefined}
                  className="w-full min-h-11 px-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                />
                {tokenError && <p id="bot-token-error" className="mt-1 text-sm text-red-600">{tokenError}</p>}
              </div>
              <button
                type="submit"
                disabled={!token.trim() || connect.isPending}
                className="sm:self-start min-h-11 px-5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50"
              >
                {connect.isPending ? 'Tekshirilmoqda...' : 'Tekshirish va ulash'}
              </button>
            </form>
          </section>
        ) : (
          <>
            <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Bot size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{bot.name}</p>
                    {bot.bot_link && (
                      <a href={bot.bot_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-amber-700 hover:underline">
                        @{bot.username} <ExternalLink size={14} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                  <CheckCircle2 size={16} aria-hidden="true" /> Ulangan
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-600">Oxirgi tekshiruv</dt>
                  <dd className="text-gray-900">{bot.last_checked_at ? formatDateTime(bot.last_checked_at) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">Navbatdagi xabarlar</dt>
                  <dd className="text-gray-900">{bot.pending_updates}</dd>
                </div>
              </dl>
              {bot.last_error && (
                <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
                  Oxirgi ogohlantirish: {bot.last_error}
                </p>
              )}
              <p className="mt-3 text-sm text-gray-600">Tizim botni har 5 daqiqada tekshiradi va aloqa uzilsa o'zi qayta ulaydi.</p>
              {actionError && <p role="alert" className="mt-2 text-sm text-red-600">{actionError}</p>}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => reconnect.mutate()}
                  disabled={reconnect.isPending}
                  className="min-h-11 inline-flex items-center gap-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw size={16} aria-hidden="true" className={reconnect.isPending ? 'animate-spin' : ''} />
                  {reconnect.isPending ? 'Tekshirilmoqda...' : 'Hozir tekshirish'}
                </button>
                {confirmDisconnect ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                    <span className="text-sm text-red-800">Bot uziladi, mijozlar buyurtma bera olmaydi. Davom etasizmi?</span>
                    <button type="button" onClick={() => disconnect.mutate()} disabled={disconnect.isPending} className="min-h-11 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                      {disconnect.isPending ? 'Uzilmoqda...' : 'Ha, uzish'}
                    </button>
                    <button type="button" onClick={() => setConfirmDisconnect(false)} className="min-h-11 px-4 border border-gray-300 bg-white rounded-lg text-sm text-gray-800">Bekor</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDisconnect(true)}
                    className="min-h-11 inline-flex items-center gap-2 px-4 border border-red-200 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    <Unplug size={16} aria-hidden="true" /> Botni uzish
                  </button>
                )}
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                <Users size={18} aria-hidden="true" /> Xodimlar guruhi — yangi buyurtmalar
              </h2>
              {bot.group_connected ? (
                <p className="mt-2 text-sm text-green-800">✅ Ulangan: {bot.group_title || 'guruh'}. Yangi Telegram buyurtmalari shu guruhga keladi.</p>
              ) : (
                <ol className="mt-2 list-decimal pl-5 space-y-1 text-sm text-gray-800">
                  <li>Telegram'da xodimlar guruhini oching (yoki yangisini yarating).</li>
                  <li>Guruhga @{bot.username} ni qo'shing.</li>
                  <li>
                    Guruhga shu xabarni yozing:{' '}
                    <code className="rounded bg-gray-100 px-2 py-1 font-mono text-gray-900">/connect {bot.connect_code}</code>{' '}
                    <button type="button" onClick={() => copyCode(`/connect ${bot.connect_code}`)} className="min-h-11 inline-flex items-center gap-1 px-2 text-amber-700 hover:underline">
                      <Copy size={14} aria-hidden="true" /> {copied ? 'Nusxalandi' : 'Nusxalash'}
                    </button>
                  </li>
                  <li>Bot «Guruh ulandi» deb javob beradi — sahifani yangilang.</li>
                </ol>
              )}
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900">Rahbarga kunlik hisobot</h2>
              {bot.owner_connected ? (
                <p className="mt-2 text-sm text-green-800">✅ Ulangan. Har kuni soat 23:00 da tushum, buyurtmalar soni va o'rtacha chek yuboriladi.</p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-gray-800">
                    Telefoningizda quyidagi havolani oching va «Start» ni bosing — har kuni 23:00 da hisobot va bot haqidagi ogohlantirishlar keladi.
                  </p>
                  {bot.owner_link && (
                    <a href={bot.owner_link} target="_blank" rel="noreferrer" className="mt-3 min-h-11 inline-flex items-center gap-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                      <ExternalLink size={16} aria-hidden="true" /> Hisobotni ulash
                    </a>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
