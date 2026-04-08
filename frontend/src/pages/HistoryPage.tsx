import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import Layout from '../components/Layout';
import { History, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditLog {
  id: number;
  company_id: number | null;
  user_id: number | null;
  action: string;
  model: string;
  model_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user?: { id: number; name: string; email: string } | null;
  company?: { id: number; name: string } | null;
}

interface PaginatedResponse {
  data: AuditLog[];
  current_page: number;
  last_page: number;
  total: number;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: 'Yaratildi', color: 'bg-green-50 text-green-700' },
  updated: { label: 'Yangilandi', color: 'bg-blue-50 text-blue-700' },
  deleted: { label: "O'chirildi", color: 'bg-red-50 text-red-700' },
  login: { label: 'Kirish', color: 'bg-purple-50 text-purple-700' },
  logout: { label: 'Chiqish', color: 'bg-gray-100 text-gray-700' },
};

const MODEL_LABELS: Record<string, string> = {
  Company: 'Kompaniya',
  User: 'Foydalanuvchi',
  Order: 'Buyurtma',
  MenuItem: 'Menyu',
  Table: 'Stol',
  Branch: 'Filial',
  Category: 'Kategoriya',
  Payment: 'To\'lov',
  Plan: 'Tarif',
};

export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ['audit-logs', page, search, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('per_page', '20');
      if (search) params.set('search', search);
      if (actionFilter) params.set('action', actionFilter);
      const res = await api.get(`/super/audit-logs?${params.toString()}`);
      return res.data.data;
    },
  });

  const logs = data?.data ?? [];
  const lastPage = data?.last_page ?? 1;
  const total = data?.total ?? 0;

  const getActionBadge = (action: string) => {
    const info = ACTION_LABELS[action] ?? { label: action, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${info.color}`}>
        {info.label}
      </span>
    );
  };

  const getModelLabel = (model: string) => {
    const short = model.replace(/^App\\Models\\/, '');
    return MODEL_LABELS[short] ?? short;
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tarix</h1>
        <p className="text-gray-500 text-sm mt-1">
          Tizimdagi barcha o'zgarishlar tarixi ({total} ta yozuv)
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Qidirish..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
        >
          <option value="">Barcha amallar</option>
          <option value="created">Yaratildi</option>
          <option value="updated">Yangilandi</option>
          <option value="deleted">O'chirildi</option>
          <option value="login">Kirish</option>
          <option value="logout">Chiqish</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <History size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Tarix yozuvlari topilmadi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Sana</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Foydalanuvchi</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Amal</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Model</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Kompaniya</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">IP manzil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('uz-UZ')}
                    </td>
                    <td className="px-6 py-4">
                      {log.user ? (
                        <div>
                          <p className="font-medium text-gray-900">{log.user.name}</p>
                          <p className="text-xs text-gray-500">{log.user.phone}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Tizim</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{getActionBadge(log.action)}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {getModelLabel(log.model)}
                      {log.model_id && (
                        <span className="text-gray-400 ml-1">#{log.model_id}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {log.company?.name ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs font-mono">
                      {log.ip_address ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-500">
              Sahifa {data?.current_page ?? 1} / {lastPage}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
                Oldingi
              </button>
              <button
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page >= lastPage}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Keyingi
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
