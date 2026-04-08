import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { CashShift, Branch } from '../types';
import Layout from '../components/Layout';
import {
  Plus,
  X,
  FileText,
  Clock,
  Building2,
  Banknote,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────

function formatAmount(amount: number) {
  return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('uz-UZ');
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none';

// ─── Report types ────────────────────────────────────────────────

interface RevenueByMethod {
  method: string;
  total: number;
  change: number;
  net: number;
  count: number;
}

interface ShiftReport {
  cash_shift_id: number;
  status: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  revenue_by_method: RevenueByMethod[];
  refunds_total: number;
  total_revenue: number;
  total_transactions: number;
}

// ─── Open Shift Modal ────────────────────────────────────────────

function OpenShiftModal({
  branches,
  onClose,
}: {
  branches: Branch[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    branch_id: branches[0]?.id ?? 0,
    opening_amount: '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      return (
        await api.post('/cash-shifts/open', {
          branch_id: form.branch_id,
          opening_amount: parseFloat(form.opening_amount),
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      onClose();
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(axiosErr.response?.data?.detail || axiosErr.response?.data?.message || 'Xatolik yuz berdi');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Smena ochish</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filial</label>
            <select
              required
              value={form.branch_id}
              onChange={(e) => setForm((p) => ({ ...p, branch_id: parseInt(e.target.value) }))}
              className={inputClass}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Boshlang'ich summa
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={form.opening_amount}
              onChange={(e) => setForm((p) => ({ ...p, opening_amount: e.target.value }))}
              placeholder="0"
              className={inputClass}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Ochilmoqda...' : 'Ochish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Close Shift Modal ───────────────────────────────────────────

function CloseShiftModal({
  currentShift,
  onClose,
}: {
  currentShift: CashShift;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    closing_amount: '',
    difference_reason: '',
  });
  const [error, setError] = useState('');

  const closingNum = parseFloat(form.closing_amount) || 0;
  const expectedAmount = currentShift.expected_amount ?? currentShift.opening_amount;
  const difference = closingNum - expectedAmount;
  const hasDifference = form.closing_amount !== '' && difference !== 0;

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: { closing_amount: number; difference_reason?: string } = {
        closing_amount: closingNum,
      };
      if (hasDifference && form.difference_reason.trim()) {
        payload.difference_reason = form.difference_reason.trim();
      }
      return (await api.post('/cash-shifts/close', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      onClose();
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(axiosErr.response?.data?.detail || axiosErr.response?.data?.message || 'Xatolik yuz berdi');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Smena yopish</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (hasDifference && !form.difference_reason.trim()) {
              setError('Farq mavjud, sababini kiriting');
              return;
            }
            mutation.mutate();
          }}
          className="p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Kutilgan summa:</span>
              <span className="font-medium text-gray-900">{formatAmount(expectedAmount)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yopish summasi</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={form.closing_amount}
              onChange={(e) => setForm((p) => ({ ...p, closing_amount: e.target.value }))}
              placeholder="0"
              className={inputClass}
            />
          </div>

          {form.closing_amount !== '' && (
            <div
              className={`rounded-lg p-3 text-sm font-medium ${
                difference === 0
                  ? 'bg-green-50 text-green-700'
                  : difference > 0
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              Farq: {difference >= 0 ? '+' : ''}
              {formatAmount(difference)}
            </div>
          )}

          {hasDifference && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Farq sababi <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={form.difference_reason}
                onChange={(e) => setForm((p) => ({ ...p, difference_reason: e.target.value }))}
                placeholder="Farq sababini kiriting..."
                className={inputClass}
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Yopilmoqda...' : 'Yopish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Report Modal ────────────────────────────────────────────────

function ReportModal({
  shiftId,
  onClose,
}: {
  shiftId: number;
  onClose: () => void;
}) {
  const { data: report, isLoading } = useQuery<ShiftReport>({
    queryKey: ['shift-report', shiftId],
    queryFn: async () => {
      const res = await api.get(`/cash-shifts/${shiftId}/report`);
      return res.data.data ?? res.data;
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">Smena hisoboti</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : report ? (
          <div className="p-6 space-y-6">
            {/* Shift info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Holat</div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    report.status === 'open'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {report.status === 'open' ? 'Ochiq' : 'Yopiq'}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Ochilgan vaqt</div>
                <div className="text-sm font-medium text-gray-900">{formatDate(report.opened_at)}</div>
              </div>
              {report.closed_at && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">Yopilgan vaqt</div>
                  <div className="text-sm font-medium text-gray-900">{formatDate(report.closed_at)}</div>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Jami tranzaksiyalar</div>
                <div className="text-sm font-medium text-gray-900">{report.total_transactions}</div>
              </div>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">Boshlang'ich</div>
                <div className="text-sm font-bold text-gray-900">{formatAmount(report.opening_amount)}</div>
              </div>
              {report.closing_amount != null && (
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">Yopish summasi</div>
                  <div className="text-sm font-bold text-gray-900">{formatAmount(report.closing_amount)}</div>
                </div>
              )}
              {report.expected_amount != null && (
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">Kutilgan</div>
                  <div className="text-sm font-bold text-gray-900">{formatAmount(report.expected_amount)}</div>
                </div>
              )}
              {report.difference != null && (
                <div
                  className={`rounded-lg p-4 text-center ${
                    report.difference === 0
                      ? 'bg-green-50'
                      : report.difference > 0
                      ? 'bg-blue-50'
                      : 'bg-red-50'
                  }`}
                >
                  <div className="text-xs text-gray-500 mb-1">Farq</div>
                  <div
                    className={`text-sm font-bold ${
                      report.difference === 0
                        ? 'text-green-700'
                        : report.difference > 0
                        ? 'text-blue-700'
                        : 'text-red-700'
                    }`}
                  >
                    {report.difference >= 0 ? '+' : ''}
                    {formatAmount(report.difference)}
                  </div>
                </div>
              )}
            </div>

            {/* Revenue summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">Jami tushum</div>
                <div className="text-sm font-bold text-green-700">{formatAmount(report.total_revenue)}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">Qaytarilgan</div>
                <div className="text-sm font-bold text-red-700">{formatAmount(report.refunds_total)}</div>
              </div>
            </div>

            {/* Revenue by method table */}
            {report.revenue_by_method.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  To'lov usullari bo'yicha tushum
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                          To'lov usuli
                        </th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                          Soni
                        </th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                          Jami
                        </th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                          Qaytim
                        </th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                          Sof
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.revenue_by_method.map((rm) => (
                        <tr key={rm.method} className="border-b border-gray-100">
                          <td className="py-2 px-3 font-medium text-gray-900">{rm.method}</td>
                          <td className="py-2 px-3 text-right text-gray-600">{rm.count}</td>
                          <td className="py-2 px-3 text-right text-gray-900">{formatAmount(rm.total)}</td>
                          <td className="py-2 px-3 text-right text-gray-500">{formatAmount(rm.change)}</td>
                          <td className="py-2 px-3 text-right font-medium text-gray-900">
                            {formatAmount(rm.net)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Yopish
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function CashShiftsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [reportShiftId, setReportShiftId] = useState<number | null>(null);

  // Branches
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.data ?? [];
    },
  });

  // Current shift
  const { data: currentShift } = useQuery<CashShift | null>({
    queryKey: ['current-shift'],
    queryFn: async () => {
      try {
        const res = await api.get('/cash-shifts/current');
        return res.data.data ?? res.data;
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 404) return null;
        throw err;
      }
    },
  });

  // Shifts list
  const { data: shiftsData, isLoading } = useQuery<{
    data: CashShift[];
    total: number;
    current_page: number;
    last_page: number;
  }>({
    queryKey: ['cash-shifts', page, filterBranch, filterStatus],
    queryFn: async () => {
      const params: Record<string, string | number> = { page };
      if (filterBranch) params.branch_id = filterBranch;
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/cash-shifts', { params });
      return res.data.data;
    },
  });

  const shifts = shiftsData?.data ?? [];
  const lastPage = shiftsData?.last_page ?? 1;

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kassa smenalari</h1>
          <p className="text-gray-500 text-sm mt-1">Smena ochish, yopish va hisobotlarni ko'rish</p>
        </div>
        {!currentShift && (
          <button
            onClick={() => setShowOpenModal(true)}
            className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            <Plus size={18} />
            Smena ochish
          </button>
        )}
      </div>

      {/* Current shift card */}
      {currentShift && (
        <div className="bg-white rounded-xl border-2 border-green-300 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                  Ochiq smena
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Building2 size={14} className="text-gray-400" />
                  {currentShift.branch?.name ?? `Filial #${currentShift.branch_id}`}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-gray-400" />
                  {formatDate(currentShift.opened_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Banknote size={14} className="text-gray-400" />
                  {formatAmount(currentShift.opening_amount)}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowCloseModal(true)}
              className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Smena yopish
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <select
          value={filterBranch}
          onChange={(e) => {
            setFilterBranch(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
        >
          <option value="">Barcha filiallar</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
        >
          <option value="">Barchasi</option>
          <option value="open">Ochiq</option>
          <option value="closed">Yopiq</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : shifts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Banknote size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Smenalar topilmadi</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    Sana
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    Kassir
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    Filial
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    Holat
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    Boshlang'ich
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    Yopish summa
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    Farq
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    Amallar
                  </th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{formatDate(shift.opened_at)}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {shift.user?.name ?? `#${shift.user_id}`}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {shift.branch?.name ?? `#${shift.branch_id}`}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          shift.status === 'open'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {shift.status === 'open' ? 'Ochiq' : 'Yopiq'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {formatAmount(shift.opening_amount)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {shift.closing_amount != null ? formatAmount(shift.closing_amount) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {shift.difference != null ? (
                        <span
                          className={
                            shift.difference === 0
                              ? 'text-green-600'
                              : shift.difference > 0
                              ? 'text-blue-600'
                              : 'text-red-600'
                          }
                        >
                          {shift.difference >= 0 ? '+' : ''}
                          {formatAmount(shift.difference)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setReportShiftId(shift.id)}
                        className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
                      >
                        <FileText size={14} />
                        Hisobot
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Sahifa {page} / {lastPage}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                  Oldingi
                </button>
                <button
                  disabled={page >= lastPage}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Keyingi
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showOpenModal && (
        <OpenShiftModal branches={branches} onClose={() => setShowOpenModal(false)} />
      )}

      {showCloseModal && currentShift && (
        <CloseShiftModal currentShift={currentShift} onClose={() => setShowCloseModal(false)} />
      )}

      {reportShiftId !== null && (
        <ReportModal shiftId={reportShiftId} onClose={() => setReportShiftId(null)} />
      )}
    </Layout>
  );
}
