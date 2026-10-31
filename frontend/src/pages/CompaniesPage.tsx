import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { Company } from '../types';
import Layout from '../components/Layout';
import { LoadingState, ErrorState } from '../components/QueryState';
import { Building2, Plus, X, ExternalLink, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiErrorMessage, apiFieldErrors } from '../lib/apiError';

interface CreateCompanyForm {
  name: string;
  slug: string;
  phone: string;
  owner_phone: string;
  owner_password: string;
  owner_full_name: string;
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

function CreateCompanyModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateCompanyForm>({
    name: '',
    slug: '',
    phone: '',
    owner_phone: '',
    owner_password: '',
    owner_full_name: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateCompanyForm, string>>>({});

  const mutation = useMutation({
    mutationFn: async (data: CreateCompanyForm) => {
      const payload = {
        ...data,
        phone: unformatPhone(data.phone),
        owner_phone: unformatPhone(data.owner_phone),
      };
      const res = await api.post('/super/companies', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      onClose();
    },
    onError: (err: unknown) => {
      const byField = apiFieldErrors(err) as Partial<Record<keyof CreateCompanyForm, string>>;
      setFieldErrors(byField);
      // Maydonga bog'langan xato maydon ostida; umumiy blok faqat bog'lanmagan xato uchun
      setError(Object.keys(byField).length ? '' : apiErrorMessage(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    mutation.mutate(form);
  };

  const updateField = (field: keyof CreateCompanyForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'name') {
      setForm((prev) => ({
        ...prev,
        [field]: value,
        slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Yangi kompaniya</h2>
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
            <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-1">Kompaniya nomi <span className="text-red-600" aria-hidden="true">*</span></label>
            <input
              id="company-name"
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? 'company-name-error' : undefined}
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Milliy taomlar"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
            {fieldErrors.name && (
              <p id="company-name-error" className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="company-slug" className="block text-sm font-medium text-gray-700 mb-1">Slug <span className="text-red-600" aria-hidden="true">*</span></label>
            <input
              id="company-slug"
              aria-invalid={!!fieldErrors.slug}
              aria-describedby={fieldErrors.slug ? 'company-slug-error' : undefined}
              type="text"
              required
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="milliy-taomlar"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
            {fieldErrors.slug && (
              <p id="company-slug-error" className="mt-1 text-sm text-red-600">{fieldErrors.slug}</p>
            )}
          </div>

          <div>
            <label htmlFor="company-phone" className="block text-sm font-medium text-gray-700 mb-1">Telefon <span className="text-red-600" aria-hidden="true">*</span></label>
            <input
              id="company-phone"
              aria-invalid={!!fieldErrors.phone}
              aria-describedby={fieldErrors.phone ? 'company-phone-error' : undefined}
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: formatPhone(e.target.value) }))}
              placeholder="+998 (90) 123-45-67"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
            {fieldErrors.phone && (
              <p id="company-phone-error" className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
            )}
          </div>

          <hr className="border-gray-200" />
          <p className="text-sm font-medium text-gray-700">Egasi (Owner)</p>

          <div>
            <label htmlFor="company-owner_full_name" className="block text-sm font-medium text-gray-700 mb-1">To'liq ism <span className="text-red-600" aria-hidden="true">*</span></label>
            <input
              id="company-owner_full_name"
              aria-invalid={!!fieldErrors.owner_full_name}
              aria-describedby={fieldErrors.owner_full_name ? 'company-owner_full_name-error' : undefined}
              type="text"
              required
              value={form.owner_full_name}
              onChange={(e) => setForm((prev) => ({ ...prev, owner_full_name: e.target.value }))}
              placeholder="Ism Familiya"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
            {fieldErrors.owner_full_name && (
              <p id="company-owner_full_name-error" className="mt-1 text-sm text-red-600">{fieldErrors.owner_full_name}</p>
            )}
          </div>

          <div>
            <label htmlFor="company-owner_phone" className="block text-sm font-medium text-gray-700 mb-1">Telefon raqam <span className="text-red-600" aria-hidden="true">*</span></label>
            <input
              id="company-owner_phone"
              aria-invalid={!!fieldErrors.owner_phone}
              aria-describedby={fieldErrors.owner_phone ? 'company-owner_phone-error' : undefined}
              type="tel"
              required
              value={form.owner_phone}
              onChange={(e) => setForm((prev) => ({ ...prev, owner_phone: formatPhone(e.target.value) }))}
              placeholder="+998 (90) 123-45-67"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
            {fieldErrors.owner_phone && (
              <p id="company-owner_phone-error" className="mt-1 text-sm text-red-600">{fieldErrors.owner_phone}</p>
            )}
          </div>

          <div>
            <label htmlFor="company-owner_password" className="block text-sm font-medium text-gray-700 mb-1">Parol <span className="text-red-600" aria-hidden="true">*</span></label>
            <input
              id="company-owner_password"
              aria-invalid={!!fieldErrors.owner_password}
              aria-describedby={fieldErrors.owner_password ? 'company-owner_password-error' : undefined}
              type="password"
              required
              minLength={8}
              value={form.owner_password}
              onChange={(e) => setForm((prev) => ({ ...prev, owner_password: e.target.value }))}
              placeholder="Kamida 8 ta belgi"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
            {fieldErrors.owner_password && (
              <p id="company-owner_password-error" className="mt-1 text-sm text-red-600">{fieldErrors.owner_password}</p>
            )}
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
              {mutation.isPending ? 'Yaratilmoqda...' : 'Yaratish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CompaniesPage() {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  // Qidiruv serverda (#8): avval faqat 1-sahifa (15 ta) olinib, brauzerda filtrlanardi
  // Faqat qidiruv matni haqiqatan o'zgarganda: mountda setPage(1) chaqirilib, tez bosilgan
  // "Keyingi" ni 1-sahifaga qaytarib yuborardi (e2e'da topilgan race)
  useEffect(() => {
    const q = search.trim();
    if (q === debouncedSearch) return;
    const t = setTimeout(() => {
      setDebouncedSearch(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);

  const { data, isLoading, isError, error, refetch } = useQuery<{
    data: Company[];
    current_page: number;
    last_page: number;
    total: number;
  }>({
    queryKey: ['companies', page, debouncedSearch],
    queryFn: async () => {
      const res = await api.get('/super/companies', {
        params: { page, search: debouncedSearch || undefined },
      });
      return res.data.data;
    },
    placeholderData: keepPreviousData,
  });

  const companies = data?.data ?? [];
  const lastPage = data?.last_page ?? 1;
  const currentPage = data?.current_page ?? page;

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kompaniyalar</h1>
          <p className="text-gray-500 text-sm mt-1">
            Barcha ro'yxatdan o'tgan kompaniyalar
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-amber-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors"
        >
          <Plus size={18} />
          Yangi kompaniya
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidirish..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <LoadingState label="Kompaniyalar yuklanmoqda..." />
        ) : isError ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={() => refetch()} title="Kompaniyalarni yuklab bo'lmadi" />
          </div>
        ) : companies.length === 0 && debouncedSearch ? (
          <div className="p-8 text-center">
            <Search size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 text-sm font-medium">"{debouncedSearch}" bo'yicha kompaniya topilmadi</p>
            <button
              type="button"
              onClick={() => setSearch('')}
              className="mt-3 text-sm font-medium text-amber-700 hover:text-amber-800 underline"
            >
              Qidiruvni tozalash
            </button>
          </div>
        ) : companies.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 text-sm font-medium">Hali kompaniya qo'shilmagan</p>
            <p className="text-gray-500 text-sm mt-1">"Yangi kompaniya" tugmasi orqali birinchi restoranni qo'shing</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Nomi</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Slug</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Telefon</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Holati</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map((company) => (
                  <tr
                    key={company.id}
                    onClick={() => navigate(`/companies/${company.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{company.name}</td>
                    <td className="px-6 py-4 text-gray-500">{company.slug}</td>
                    <td className="px-6 py-4 text-gray-500">{company.phone}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          company.is_active
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {company.is_active ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={`/companies/${company.id}`}
                        className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-medium text-sm"
                      >
                        <ExternalLink size={14} />
                        Batafsil
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {lastPage > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Sahifa {currentPage} / {lastPage} (jami {data?.total ?? 0} ta)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
              Oldingi
            </button>
            <button
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={currentPage >= lastPage}
              className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Keyingi
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {showModal && <CreateCompanyModal onClose={() => setShowModal(false)} />}
    </Layout>
  );
}
