import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import Layout from '../components/Layout';
import {
  ArrowLeft,
  Building2,
  Users,
  GitBranch,
  ClipboardList,
  CreditCard,
  Calendar,
  Pencil,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';

interface Plan {
  id: number;
  name: string;
  display_name: string;
  price_monthly: string;
  is_active: boolean;
}

interface Subscription {
  id: number;
  plan_id: number;
  status: string;
  current_period_start: string;
  current_period_end: string;
  plan?: Plan;
}

interface Company {
  id: number;
  name: string;
  slug: string;
  phone: string;
  email?: string;
  address?: string;
  inn?: string;
  logo?: string;
  primary_color?: string;
  is_active: boolean;
  created_at: string;
  subscription?: Subscription | null;
}

interface CompanyShowResponse {
  company: Company;
  stats: {
    users_count: number;
    branches_count: number;
    orders_count: number;
  };
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `+${digits}`;
  if (digits.length <= 5) return `+${digits.slice(0, 3)} (${digits.slice(3)}`;
  if (digits.length <= 8) return `+${digits.slice(0, 3)} (${digits.slice(3, 5)}) ${digits.slice(5)}`;
  if (digits.length <= 10) return `+${digits.slice(0, 3)} (${digits.slice(3, 5)}) ${digits.slice(5, 8)}-${digits.slice(8)}`;
  return `+${digits.slice(0, 3)} (${digits.slice(3, 5)}) ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10, 12)}`;
}

function unformatPhone(value: string): string {
  return '+' + value.replace(/\D/g, '');
}

interface EditCompanyForm {
  name: string;
  slug: string;
  phone: string;
  email: string;
  address: string;
  inn: string;
  primary_color: string;
  admin_password: string;
}

function EditCompanyModal({
  company,
  onClose,
}: {
  company: Company;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EditCompanyForm>({
    name: company.name,
    slug: company.slug,
    phone: formatPhone(company.phone || ''),
    email: company.email || '',
    address: company.address || '',
    inn: company.inn || '',
    primary_color: company.primary_color || '#f59e0b',
    admin_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async (data: EditCompanyForm) => {
      const payload: Record<string, unknown> = {
        ...data,
        phone: unformatPhone(data.phone),
        email: data.email || null,
      };
      if (!data.admin_password) delete payload.admin_password;
      const res = await api.put(`/super/companies/${company.id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', String(company.id)] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      onClose();
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(axiosErr.response?.data?.detail || axiosErr.response?.data?.message || 'Xatolik yuz berdi');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Kompaniyani tahrirlash</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Kompaniya nomi</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              type="text"
              required
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: formatPhone(e.target.value) }))}
              placeholder="+998 (90) 123-45-67"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (ixtiyoriy)</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="info@company.uz"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Toshkent sh., Yunusobod t."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">INN</label>
            <input
              type="text"
              value={form.inn}
              onChange={(e) => setForm((prev) => ({ ...prev, inn: e.target.value }))}
              placeholder="123456789"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asosiy rang</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => setForm((prev) => ({ ...prev, primary_color: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={form.primary_color}
                onChange={(e) => setForm((prev) => ({ ...prev, primary_color: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <hr className="border-gray-200" />
          <p className="text-sm font-medium text-gray-700">Admin paroli</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yangi parol (bo'sh qoldirsa o'zgarmaydi)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.admin_password}
                onChange={(e) => setForm((prev) => ({ ...prev, admin_password: e.target.value }))}
                placeholder="Kamida 8 ta belgi"
                minLength={8}
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
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

function ChangePlanModal({
  companyId,
  currentPlanId,
  onClose,
}: {
  companyId: number;
  currentPlanId?: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(currentPlanId ?? null);

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await api.get('/super/plans');
      return res.data.data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (planId: number) => {
      const res = await api.patch(`/super/companies/${companyId}/plan`, { plan_id: planId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', String(companyId)] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tarifni o'zgartirish</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {plans.filter((p) => p.is_active).map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                selectedPlanId === plan.id
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{plan.display_name}</p>
                  <p className="text-xs text-gray-500">{plan.name}</p>
                </div>
                <p className="text-sm font-semibold text-gray-700">
                  {Number(plan.price_monthly) === 0
                    ? 'Bepul'
                    : `${Number(plan.price_monthly).toLocaleString()} so'm/oy`}
                </p>
              </div>
              {currentPlanId === plan.id && (
                <span className="inline-block mt-1 text-xs text-amber-600 font-medium">
                  Hozirgi tarif
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Bekor qilish
          </button>
          <button
            onClick={() => selectedPlanId && mutation.mutate(selectedPlanId)}
            disabled={!selectedPlanId || selectedPlanId === currentPlanId || mutation.isPending}
            className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data, isLoading } = useQuery<CompanyShowResponse>({
    queryKey: ['company', id],
    queryFn: async () => {
      const res = await api.get(`/super/companies/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const company = data?.company;
  const stats = data?.stats;

  return (
    <Layout>
      <div className="mb-6">
        <Link
          to="/companies"
          className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-4"
        >
          <ArrowLeft size={16} />
          Kompaniyalarga qaytish
        </Link>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
        ) : company ? (
          <div className="space-y-6">
            {/* Company Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center">
                  <Building2 size={28} className="text-amber-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                  <p className="text-gray-500 text-sm">{company.slug}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-600 hover:text-amber-700 border border-amber-200 hover:border-amber-300 rounded-lg transition-colors"
                  >
                    <Pencil size={14} />
                    Tahrirlash
                  </button>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      company.is_active
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {company.is_active ? 'Faol' : 'Nofaol'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Telefon</p>
                  <p className="text-sm font-medium text-gray-900">{company.phone || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-sm font-medium text-gray-900">{company.email || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Manzil</p>
                  <p className="text-sm font-medium text-gray-900">{company.address || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">INN</p>
                  <p className="text-sm font-medium text-gray-900">{company.inn || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Asosiy rang</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded-full border border-gray-200"
                      style={{ backgroundColor: company.primary_color || '#f59e0b' }}
                    />
                    <p className="text-sm font-medium text-gray-900">{company.primary_color || '—'}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Yaratilgan sana</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(company.created_at).toLocaleDateString('uz-UZ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Users size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Foydalanuvchilar</p>
                    <p className="text-xl font-bold text-gray-900">{stats.users_count}</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <GitBranch size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Filiallar</p>
                    <p className="text-xl font-bold text-gray-900">{stats.branches_count}</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                    <ClipboardList size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Buyurtmalar</p>
                    <p className="text-xl font-bold text-gray-900">{stats.orders_count}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Subscription / Plan */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard size={20} className="text-amber-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Tarif rejasi</h2>
                </div>
                <button
                  onClick={() => setShowPlanModal(true)}
                  className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  O'zgartirish
                </button>
              </div>

              {company.subscription?.plan ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Tarif</p>
                    <p className="text-sm font-bold text-gray-900">
                      {company.subscription.plan.display_name}
                    </p>
                    <p className="text-xs text-gray-400">{company.subscription.plan.name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Narxi</p>
                    <p className="text-sm font-medium text-gray-900">
                      {Number(company.subscription.plan.price_monthly) === 0
                        ? 'Bepul'
                        : `${Number(company.subscription.plan.price_monthly).toLocaleString()} so'm/oy`}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Muddati</p>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-gray-400" />
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(company.subscription.current_period_end).toLocaleDateString('uz-UZ')}
                      </p>
                    </div>
                    <p className={`text-xs mt-0.5 ${
                      company.subscription.status === 'active' ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {company.subscription.status === 'active' ? 'Faol' : company.subscription.status}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <p className="text-gray-500 text-sm">Tarif biriktirilmagan</p>
                  <button
                    onClick={() => setShowPlanModal(true)}
                    className="mt-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Tarif biriktirish
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Kompaniya topilmadi</p>
          </div>
        )}
      </div>

      {showEditModal && company && (
        <EditCompanyModal
          company={company}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showPlanModal && company && (
        <ChangePlanModal
          companyId={company.id}
          currentPlanId={company.subscription?.plan_id}
          onClose={() => setShowPlanModal(false)}
        />
      )}
    </Layout>
  );
}
