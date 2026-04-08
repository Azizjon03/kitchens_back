import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import Layout from '../components/Layout';
import { CreditCard, Plus, X, Check, Minus } from 'lucide-react';

interface Plan {
  id: number;
  name: string;
  display_name: string;
  price_monthly: string;
  max_branches: number;
  max_staff: number;
  has_inventory: boolean;
  has_full_reports: boolean;
  has_branding: boolean;
  has_subdomain: boolean;
  is_active: boolean;
}

interface PlanForm {
  name: string;
  display_name: string;
  price_monthly: string;
  max_branches: string;
  max_staff: string;
  has_inventory: boolean;
  has_full_reports: boolean;
  has_branding: boolean;
  has_subdomain: boolean;
  is_active: boolean;
}

const emptyForm: PlanForm = {
  name: '',
  display_name: '',
  price_monthly: '0',
  max_branches: '1',
  max_staff: '5',
  has_inventory: false,
  has_full_reports: false,
  has_branding: false,
  has_subdomain: false,
  is_active: true,
};

function PlanModal({
  onClose,
  editPlan,
}: {
  onClose: () => void;
  editPlan?: Plan | null;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PlanForm>(
    editPlan
      ? {
          name: editPlan.name,
          display_name: editPlan.display_name,
          price_monthly: editPlan.price_monthly,
          max_branches: String(editPlan.max_branches),
          max_staff: String(editPlan.max_staff),
          has_inventory: editPlan.has_inventory,
          has_full_reports: editPlan.has_full_reports,
          has_branding: editPlan.has_branding,
          has_subdomain: editPlan.has_subdomain,
          is_active: editPlan.is_active,
        }
      : emptyForm
  );
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async (data: PlanForm) => {
      const payload = {
        ...data,
        price_monthly: parseFloat(data.price_monthly),
        max_branches: parseInt(data.max_branches),
        max_staff: parseInt(data.max_staff),
      };
      if (editPlan) {
        const res = await api.put(`/super/plans/${editPlan.id}`, payload);
        return res.data;
      }
      const res = await api.post('/super/plans', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      onClose();
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Xatolik yuz berdi');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const updateField = (field: keyof PlanForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {editPlan ? 'Tarifni tahrirlash' : 'Yangi tarif'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomi (slug)</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="starter"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ko'rsatiladigan nomi</label>
            <input
              type="text"
              required
              value={form.display_name}
              onChange={(e) => updateField('display_name', e.target.value)}
              placeholder="Starter"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Oylik narx (so'm)</label>
            <input
              type="number"
              required
              min="0"
              step="1000"
              value={form.price_monthly}
              onChange={(e) => updateField('price_monthly', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max filiallar (-1 = cheksiz)</label>
              <input
                type="number"
                required
                min="-1"
                value={form.max_branches}
                onChange={(e) => updateField('max_branches', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max xodimlar (-1 = cheksiz)</label>
              <input
                type="number"
                required
                min="-1"
                value={form.max_staff}
                onChange={(e) => updateField('max_staff', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <hr className="border-gray-200" />
          <p className="text-sm font-medium text-gray-700">Imkoniyatlar</p>

          <div className="space-y-3">
            {([
              ['has_inventory', 'Inventarizatsiya'],
              ['has_full_reports', "To'liq hisobotlar"],
              ['has_branding', 'Branding'],
              ['has_subdomain', 'Subdomain'],
              ['is_active', 'Faol'],
            ] as [keyof PlanForm, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[key] as boolean}
                  onChange={(e) => updateField(key, e.target.checked)}
                  className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
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
              {mutation.isPending ? 'Saqlanmoqda...' : editPlan ? 'Saqlash' : 'Yaratish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FeatureBadge({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <Check size={16} className="text-green-600" />
  ) : (
    <Minus size={16} className="text-gray-300" />
  );
}

export default function PlansPage() {
  const [showModal, setShowModal] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);

  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await api.get('/super/plans');
      return res.data.data ?? [];
    },
  });

  const openEdit = (plan: Plan) => {
    setEditPlan(plan);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditPlan(null);
    setShowModal(true);
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tariflar</h1>
          <p className="text-gray-500 text-sm mt-1">Barcha tarif rejalari</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
        >
          <Plus size={18} />
          Yangi tarif
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : plans.length === 0 ? (
          <div className="p-8 text-center">
            <CreditCard size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Tariflar topilmadi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Nomi</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Narx</th>
                  <th className="text-center px-6 py-3 font-medium text-gray-500">Filiallar</th>
                  <th className="text-center px-6 py-3 font-medium text-gray-500">Xodimlar</th>
                  <th className="text-center px-6 py-3 font-medium text-gray-500">Inventar</th>
                  <th className="text-center px-6 py-3 font-medium text-gray-500">Hisobotlar</th>
                  <th className="text-center px-6 py-3 font-medium text-gray-500">Holati</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{plan.display_name}</p>
                      <p className="text-xs text-gray-400">{plan.name}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">
                      {Number(plan.price_monthly) === 0
                        ? 'Bepul'
                        : `${Number(plan.price_monthly).toLocaleString()} so'm`}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">
                      {plan.max_branches === -1 ? 'Cheksiz' : plan.max_branches}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">
                      {plan.max_staff === -1 ? 'Cheksiz' : plan.max_staff}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <FeatureBadge enabled={plan.has_inventory} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <FeatureBadge enabled={plan.has_full_reports} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          plan.is_active
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {plan.is_active ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEdit(plan)}
                        className="text-amber-600 hover:text-amber-700 font-medium text-sm"
                      >
                        Tahrirlash
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <PlanModal onClose={() => setShowModal(false)} editPlan={editPlan} />
      )}
    </Layout>
  );
}
