import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { User, Branch, Role } from '../types';
import Layout from '../components/Layout';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none';

const STAFF_ROLES: { value: Role; label: string }[] = [
  { value: 'manager', label: 'Menejer' },
  { value: 'waiter', label: 'Ofitsiant' },
  { value: 'chef', label: 'Oshpaz' },
  { value: 'cashier', label: 'Kassir' },
];

function roleLabel(role: string) {
  return STAFF_ROLES.find((r) => r.value === role)?.label ?? role;
}

function getError(err: unknown): string {
  const axiosErr = err as {
    response?: { data?: { error?: { message?: string }; message?: string; errors?: Record<string, string[]> } };
  };
  const data = axiosErr.response?.data;
  if (data?.errors) {
    const first = Object.values(data.errors)[0];
    if (first?.[0]) return first[0];
  }
  return data?.error?.message || data?.message || 'Xatolik yuz berdi';
}

// ─── Delete Confirm ──────────────────────────────────────────────

function DeleteConfirmModal({
  message,
  onConfirm,
  onClose,
  isPending,
}: {
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Xodimni o'chirish</h3>
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
            className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {isPending ? "O'chirilmoqda..." : "O'chirish"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Staff Modal ─────────────────────────────────────────────────

function StaffModal({
  staff,
  branches,
  onClose,
}: {
  staff?: User;
  branches: Branch[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!staff;
  const [form, setForm] = useState({
    name: staff?.name || staff?.full_name || '',
    phone: staff?.phone || '',
    email: staff?.email || '',
    role: (staff?.role as Role) || 'waiter',
    branch_id: staff?.branch_id ? String(staff.branch_id) : '',
    password: '',
    is_active: staff?.is_active ?? true,
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        role: form.role,
        branch_id: form.branch_id ? Number(form.branch_id) : null,
        is_active: form.is_active,
      };
      if (form.password) payload.password = form.password;

      if (isEdit) {
        return (await api.put(`/users/${staff.id}`, payload)).data;
      }
      return (await api.post('/users', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      onClose();
    },
    onError: (err: unknown) => setError(getError(err)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isEdit && form.password.length < 8) {
      setError('Parol kamida 8 ta belgidan iborat bo\'lishi kerak');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Xodimni tahrirlash' : 'Yangi xodim'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">F.I.O.</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Xodim ismi"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input
              type="text"
              required
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+998 90 123-45-67"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-gray-400">(ixtiyoriy)</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="email@example.com"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}
                className={inputClass}
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filial</label>
              <select
                value={form.branch_id}
                onChange={(e) => setForm((p) => ({ ...p, branch_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">— Tanlanmagan —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parol {isEdit && <span className="text-gray-400">(o'zgartirish uchun)</span>}
            </label>
            <input
              type="password"
              required={!isEdit}
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder={isEdit ? "Bo'sh qoldirsangiz o'zgarmaydi" : 'Kamida 8 ta belgi'}
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="staff-active"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
            />
            <label htmlFor="staff-active" className="text-sm font-medium text-gray-700">
              Faol
            </label>
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
              {mutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function StaffPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editStaff, setEditStaff] = useState<User | undefined>();
  const [deleteStaff, setDeleteStaff] = useState<User | null>(null);

  const { data: staff = [], isLoading } = useQuery<User[]>({
    queryKey: ['staff'],
    queryFn: async () => {
      const res = await api.get('/users', { params: { per_page: 100 } });
      const payload = res.data.data;
      return payload?.data ?? payload ?? [];
    },
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      const payload = res.data.data;
      return payload?.data ?? payload ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setDeleteStaff(null);
    },
  });

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Xodimlar</h1>
        <button
          onClick={() => {
            setEditStaff(undefined);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
        >
          <Plus size={18} />
          Yangi xodim
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">Xodimlar topilmadi</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">F.I.O.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Telefon</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Filial</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Holat</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{u.name || u.full_name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.phone}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.branch?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {u.is_active ? 'Faol' : 'Nofaol'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditStaff(u);
                          setShowModal(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteStaff(u)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <StaffModal
          staff={editStaff}
          branches={branches}
          onClose={() => {
            setShowModal(false);
            setEditStaff(undefined);
          }}
        />
      )}

      {deleteStaff && (
        <DeleteConfirmModal
          message={`"${deleteStaff.name || deleteStaff.full_name}" xodimini o'chirishni tasdiqlaysizmi?`}
          onConfirm={() => deleteMutation.mutate(deleteStaff.id)}
          onClose={() => setDeleteStaff(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </Layout>
  );
}
