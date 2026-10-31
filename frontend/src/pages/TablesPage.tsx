import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Table, Branch } from '../types';
import Layout from '../components/Layout';
import PageGuide from '../components/PageGuide';
import TableTemplatesPanel from '../components/TableTemplatesPanel';
import { useTableTemplates } from '../lib/tableTemplates';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Grid3X3,
  Users,
  MapPin,
  LayoutTemplate,
} from 'lucide-react';
import { apiErrorMessage, apiFieldErrors } from '../lib/apiError';
import { useEscape } from '../lib/useEscape';

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  free: { label: 'Bo\'sh', bg: 'bg-green-100', text: 'text-green-700' },
  occupied: { label: 'Band', bg: 'bg-red-100', text: 'text-red-700' },
  reserved: { label: 'Bron', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  cleaning: { label: 'Tozalanmoqda', bg: 'bg-blue-100', text: 'text-blue-700' },
  merged: { label: 'Birlashtirilgan', bg: 'bg-gray-100', text: 'text-gray-600' },
};

const STATUS_BORDER: Record<string, string> = {
  free: 'border-green-300',
  occupied: 'border-red-300',
  reserved: 'border-yellow-300',
  cleaning: 'border-blue-300',
  merged: 'border-gray-300',
};

// ─── Table Modal ──────────────────────────────────────────────────

function TableModal({
  table,
  branches,
  onClose,
}: {
  table?: Table;
  branches: Branch[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!table;
  const [form, setForm] = useState({
    number: table?.number?.toString() || '',
    seats: table?.seats?.toString() || '4',
    zone: table?.zone || '',
    branch_id: table?.branch_id || (branches[0]?.id ?? 0),
    table_template_id: table?.table_template_id ? String(table.table_template_id) : '',
  });
  const { data: templates = [] } = useTableTemplates();
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  useEscape(onClose);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        // Backend stol raqamini matn sifatida qabul qiladi ("A1", "VIP-2"); son yuborilsa 422 edi
        number: form.number.trim(),
        seats: parseInt(form.seats),
        zone: form.zone || null,
        // Bo'sh tanlov — stolga oldindan hech narsa qo'yilmaydi (#24)
        table_template_id: form.table_template_id ? Number(form.table_template_id) : null,
      };
      if (isEdit) {
        return (await api.put(`/tables/${table.id}`, payload)).data;
      }
      return (await api.post('/tables', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      onClose();
    },
    onError: (err: unknown) => {
      const byField = apiFieldErrors(err);
      setFieldErrors(byField);
      setError(Object.keys(byField).length ? '' : apiErrorMessage(err));
    },
  });

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="table-modal-title" className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="table-modal-title" className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Stolni tahrirlash' : 'Yangi stol'}
          </h2>
          <button onClick={onClose} aria-label="Oynani yopish" className="min-h-11 min-w-11 -m-2 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
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

          {/* Bitta filial bo'lsa filial tanlovi ko'rsatilmaydi — backend o'zi qo'yadi (#21) */}
          {branches.length > 1 && (
            <div>
              <label htmlFor="table-branch" className="block text-sm font-medium text-gray-700 mb-1">Filial</label>
              <select
              id="table-branch"
              aria-invalid={!!fieldErrors.branch_id}
                required
                value={form.branch_id}
                onChange={(e) => setForm((p) => ({ ...p, branch_id: parseInt(e.target.value) }))}
                className={inputClass}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {fieldErrors.branch_id && <p className="mt-1 text-sm text-red-600">{fieldErrors.branch_id}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="table-number" className="block text-sm font-medium text-gray-700 mb-1">Stol raqami <span className="text-red-600" aria-hidden="true">*</span></label>
              <input
              id="table-number"
              aria-invalid={!!fieldErrors.number}
                type="text"
                required
                maxLength={20}
                value={form.number}
                onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))}
                placeholder="1, A1, VIP-2"
                className={inputClass}
              />
              {fieldErrors.number && <p className="mt-1 text-sm text-red-600">{fieldErrors.number}</p>}
            </div>
            <div>
              <label htmlFor="table-seats" className="block text-sm font-medium text-gray-700 mb-1">O'rindiqlar <span className="text-red-600" aria-hidden="true">*</span></label>
              <input
              id="table-seats"
              aria-invalid={!!fieldErrors.seats}
                type="number"
                required
                min="1"
                value={form.seats}
                onChange={(e) => setForm((p) => ({ ...p, seats: e.target.value }))}
                placeholder="4"
                className={inputClass}
              />
              {fieldErrors.seats && <p className="mt-1 text-sm text-red-600">{fieldErrors.seats}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="table-zone" className="block text-sm font-medium text-gray-700 mb-1">Zona (ixtiyoriy)</label>
            <input
              id="table-zone"
              aria-invalid={!!fieldErrors.zone}
              type="text"
              value={form.zone}
              onChange={(e) => setForm((p) => ({ ...p, zone: e.target.value }))}
              placeholder="Veranda, Ichki zal..."
              className={inputClass}
            />
              {fieldErrors.zone && <p className="mt-1 text-sm text-red-600">{fieldErrors.zone}</p>}
          </div>

          <div>
            <label htmlFor="table-template" className="block text-sm font-medium text-gray-700 mb-1">
              Stolga oldindan qo'yiladigan narsalar
            </label>
            <select
              id="table-template"
              value={form.table_template_id}
              onChange={(e) => setForm((p) => ({ ...p, table_template_id: e.target.value }))}
              className={`${inputClass} min-h-11`}
            >
              <option value="">Yo'q — bo'sh stol</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {fieldErrors.table_template_id && <p className="mt-1 text-sm text-red-600">{fieldErrors.table_template_id}</p>}
            <p className="mt-1 text-xs text-gray-500">
              Shablonlar "Stol shablonlari" bo'limida tuziladi. Hisobga faqat ochilgani qo'shiladi.
            </p>
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
              className="flex-1 px-4 py-2.5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────

function DeleteConfirmModal({
  title,
  message,
  onConfirm,
  onClose,
  isPending,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div role="dialog" aria-modal="true" className="bg-white rounded-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Bekor qilish
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isPending ? "O'chirilmoqda..." : "O'chirish"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function TablesPage() {
  const queryClient = useQueryClient();
  const [filterBranch, setFilterBranch] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editTable, setEditTable] = useState<Table | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; number: string } | null>(null);
  const [tab, setTab] = useState<'tables' | 'templates'>('tables');

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.data ?? [];
    },
  });

  const { data: tables = [], isLoading } = useQuery<Table[]>({
    queryKey: ['tables', filterBranch],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filterBranch) params.branch_id = filterBranch;
      const res = await api.get('/tables', { params });
      return res.data.data ?? [];
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return (await api.patch(`/tables/${id}/status`, { status })).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return (await api.delete(`/tables/${id}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setDeleteTarget(null);
    },
  });

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stollar</h1>
          <p className="text-gray-500 text-sm mt-1">Filial stollari va ularni boshqarish</p>
        </div>
        {tab === 'tables' && (
          <button
            onClick={() => {
              setEditTable(undefined);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 min-h-11 bg-amber-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors"
          >
            <Plus size={18} />
            Yangi stol
          </button>
        )}
      </div>

      <PageGuide
        id="tables"
        title="Stollar bo'limi nima uchun?"
        intro="Bu yerda zaldagi stollaringiz turadi. Ofitsiant bo'sh stolni tanlab buyurtma qabul qiladi."
        steps={[
          '"Yangi stol" tugmasini bosing va stol raqamini yozing (masalan 1, 2 yoki A1).',
          "Nechta odam sig'ishini (o'rindiq) kiriting.",
          'Stolga har doim bir xil narsalar qo\'yilsa (masalan 3 sharbat, 4 mohito) — "Stol shablonlari" bo\'limida shablon tuzing va stolga tanlang.',
          "Mehmon ketayotganda ofitsiant nechtasi ochilganini belgilaydi — faqat o'shalar hisobga qo'shiladi.",
        ]}
      />

      <div role="tablist" className="mb-6 flex gap-1 border-b border-gray-200">
        {([['tables', 'Stollar'], ['templates', 'Stol shablonlari']] as const).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`min-h-11 px-4 -mb-px border-b-2 text-sm font-medium transition-colors ${
              tab === key ? 'border-amber-700 text-amber-800' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'templates' ? (
        <TableTemplatesPanel />
      ) : (
      <>
      {/* Filters */}
      <div className="mb-4 flex items-center gap-4">
        {branches.length > 1 && (
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          >
            <option value="">Barcha filiallar</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}

        {/* Status legend */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
          {Object.entries(STATUS_MAP).filter(([k]) => k !== 'merged').map(([key, val]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-full ${val.bg}`} />
              {val.label}
            </span>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : tables.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Grid3X3 size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Stollar topilmadi</p>
          <button
            onClick={() => {
              setEditTable(undefined);
              setShowModal(true);
            }}
            className="mt-3 text-sm text-amber-700 hover:text-amber-800 font-medium"
          >
            Yangi stol qo'shish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables.map((table) => {
            const st = STATUS_MAP[table.status] || STATUS_MAP.free;
            const borderClass = STATUS_BORDER[table.status] || 'border-gray-200';
            return (
              <div
                key={table.id}
                className={`bg-white rounded-xl border-2 ${borderClass} p-4 transition-all hover:shadow-md`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-gray-900">#{table.number}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                    {st.label}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users size={12} />
                    <span>{table.seats} o'rindiq</span>
                  </div>
                  {table.zone && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin size={12} />
                      <span>{table.zone}</span>
                    </div>
                  )}
                  {table.template && (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-700">
                      <LayoutTemplate size={12} aria-hidden="true" />
                      <span>{table.template.name}</span>
                    </div>
                  )}
                </div>

                {/* Status buttons */}
                <div className="grid grid-cols-2 gap-1.5 mb-3" role="group" aria-label="Stol holati">
                  {['free', 'occupied', 'reserved', 'cleaning'].map((s) => (
                    <button
                      key={s}
                      onClick={() => statusMutation.mutate({ id: table.id, status: s })}
                      disabled={table.status === s}
                      aria-pressed={table.status === s}
                      className={`min-h-11 px-2 rounded-lg text-sm font-medium transition-colors ${
                        table.status === s
                          ? `${STATUS_MAP[s].bg} ${STATUS_MAP[s].text}`
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {STATUS_MAP[s].label}
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setEditTable(table);
                      setShowModal(true);
                    }}
                    className="min-h-11 min-w-0 flex items-center justify-center gap-1 rounded-lg text-sm text-gray-700 hover:text-amber-800 hover:bg-amber-50 transition-colors"
                  >
                    <Pencil size={16} aria-hidden="true" />
                    Tahrirlash
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ id: table.id, number: table.number })}
                    className="min-h-11 min-w-0 flex items-center justify-center gap-1 rounded-lg text-sm text-gray-700 hover:text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    O'chirish
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      </>
      )}

      {showModal && (
        <TableModal
          table={editTable}
          branches={branches}
          onClose={() => {
            setShowModal(false);
            setEditTable(undefined);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title="Stolni o'chirish"
          message={`Stol #${deleteTarget.number} ni o'chirishni tasdiqlaysizmi?`}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </Layout>
  );
}
