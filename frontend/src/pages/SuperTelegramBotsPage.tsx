import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import Layout from '../components/Layout';
import { ErrorState, LoadingState } from '../components/QueryState';
import { formatDateTime } from '../lib/format';

/** #26: super admin — barcha restoran botlari holati (uzilganlari tepada). */
interface BotRow {
  company: { id: number; name: string };
  username: string | null;
  status: 'connected' | 'disconnected';
  last_checked_at: string | null;
  last_error: string | null;
  pending_updates: number;
  group_connected: boolean;
}

export default function SuperTelegramBotsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery<BotRow[]>({
    queryKey: ['super-telegram-bots'],
    queryFn: async () => (await api.get('/super/telegram-bots')).data.data,
    refetchInterval: 60_000,
  });
  const down = data?.filter((b) => b.status === 'disconnected').length ?? 0;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Telegram botlar</h1>
        <p className="text-sm text-gray-600 mt-1">
          Restoranlar botlari holati. Tizim har 5 daqiqada tekshiradi va uzilgan webhookni o'zi tiklaydi; token bekor bo'lsa — restoran yangi token kiritishi kerak.
        </p>
      </div>
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">Hali birorta restoran bot ulamagan.</p>
      ) : (
        <>
          {down > 0 && (
            <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {down} ta bot uzilgan — restoran rahbari bilan bog'laning.
            </p>
          )}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Restoran</th>
                  <th className="px-4 py-3 font-medium">Bot</th>
                  <th className="px-4 py-3 font-medium">Holat</th>
                  <th className="px-4 py-3 font-medium">Oxirgi tekshiruv</th>
                  <th className="px-4 py-3 font-medium">Guruh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((b) => (
                  <tr key={b.company.id}>
                    <td className="px-4 py-3 text-gray-900">{b.company.name}</td>
                    <td className="px-4 py-3 text-gray-800">{b.username ? `@${b.username}` : '—'}</td>
                    <td className="px-4 py-3">
                      {b.status === 'connected' ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Ulangan</span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Uzilgan</span>
                      )}
                      {b.last_error && <p className="mt-1 text-xs text-gray-600 max-w-xs">{b.last_error}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-800">{b.last_checked_at ? formatDateTime(b.last_checked_at) : '—'}</td>
                    <td className="px-4 py-3 text-gray-800">{b.group_connected ? 'Ulangan' : "Yo'q"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}
