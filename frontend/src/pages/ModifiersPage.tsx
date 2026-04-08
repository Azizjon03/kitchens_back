import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Modifier, Addon } from '../types';
import Layout from '../components/Layout';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none';

function formatPrice(price: number) {
  return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
}

// ─── Delete Confirm Modal ────────────────────────────────────────

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
      <div className="bg-white rounded-2xl w-full max-w-sm p-6">
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
            className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {isPending ? "O'chirilmoqda..." : "O'chirish"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modifier Modal ──────────────────────────────────────────────

function ModifierModal({
  modifier,
  onClose,
}: {
  modifier?: Modifier;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!modifier;
  const [form, setForm] = useState({
    name_uz: modifier?.name_uz || '',
    name_ru: modifier?.name_ru || '',
    is_active: modifier?.is_active ?? true,
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form };
      if (isEdit) {
        return (await api.put(`/modifiers/${modifier.id}`, payload)).data;
      }
      return (await api.post('/modifiers', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modifiers'] });
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
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Modifikatorni tahrirlash' : 'Yangi modifikator'}
          </h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomi (UZ)</label>
            <input
              type="text"
              required
              value={form.name_uz}
              onChange={(e) => setForm((p) => ({ ...p, name_uz: e.target.value }))}
              placeholder="Modifikator nomi (UZ)"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomi (RU)</label>
            <input
              type="text"
              required
              value={form.name_ru}
              onChange={(e) => setForm((p) => ({ ...p, name_ru: e.target.value }))}
              placeholder="Название модификатора (RU)"
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="modifier-active"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
            />
            <label htmlFor="modifier-active" className="text-sm font-medium text-gray-700">
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

// ─── Addon Modal ─────────────────────────────────────────────────

function AddonModal({
  addon,
  onClose,
}: {
  addon?: Addon;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!addon;
  const [form, setForm] = useState({
    name_uz: addon?.name_uz || '',
    name_ru: addon?.name_ru || '',
    price: addon?.price?.toString() || '',
    is_active: addon?.is_active ?? true,
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name_uz: form.name_uz,
        name_ru: form.name_ru,
        price: parseFloat(form.price),
        is_active: form.is_active,
      };
      if (isEdit) {
        return (await api.put(`/addons/${addon.id}`, payload)).data;
      }
      return (await api.post('/addons', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addons'] });
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
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Qo'shimchani tahrirlash" : "Yangi qo'shimcha"}
          </h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomi (UZ)</label>
            <input
              type="text"
              required
              value={form.name_uz}
              onChange={(e) => setForm((p) => ({ ...p, name_uz: e.target.value }))}
              placeholder="Qo'shimcha nomi (UZ)"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomi (RU)</label>
            <input
              type="text"
              required
              value={form.name_ru}
              onChange={(e) => setForm((p) => ({ ...p, name_ru: e.target.value }))}
              placeholder="Название добавки (RU)"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Narx</label>
            <input
              type="number"
              required
              min="0"
              step="any"
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              placeholder="0"
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="addon-active"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
            />
            <label htmlFor="addon-active" className="text-sm font-medium text-gray-700">
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

export default function ModifiersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'modifiers' | 'addons'>('modifiers');

  // Modifier state
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [editModifier, setEditModifier] = useState<Modifier | undefined>();
  const [deleteModifier, setDeleteModifier] = useState<Modifier | null>(null);

  // Addon state
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [editAddon, setEditAddon] = useState<Addon | undefined>();
  const [deleteAddon, setDeleteAddon] = useState<Addon | null>(null);

  // Queries
  const { data: modifiers = [], isLoading: loadingModifiers } = useQuery<Modifier[]>({
    queryKey: ['modifiers'],
    queryFn: async () => {
      const res = await api.get('/modifiers');
      return res.data.data ?? [];
    },
  });

  const { data: addons = [], isLoading: loadingAddons } = useQuery<Addon[]>({
    queryKey: ['addons'],
    queryFn: async () => {
      const res = await api.get('/addons');
      return res.data.data ?? [];
    },
  });

  // Delete mutations
  const deleteModifierMutation = useMutation({
    mutationFn: async (id: number) => {
      return (await api.delete(`/modifiers/${id}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modifiers'] });
      setDeleteModifier(null);
    },
  });

  const deleteAddonMutation = useMutation({
    mutationFn: async (id: number) => {
      return (await api.delete(`/addons/${id}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addons'] });
      setDeleteAddon(null);
    },
  });

  const tabs = [
    { key: 'modifiers' as const, label: 'Modifikatorlar' },
    { key: 'addons' as const, label: "Qo'shimchalar" },
  ];

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Modifikatorlar va Qo'shimchalar
        </h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-amber-500 text-amber-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modifiers Tab */}
      {activeTab === 'modifiers' && (
        <>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                setEditModifier(undefined);
                setShowModifierModal(true);
              }}
              className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              <Plus size={18} />
              Yangi modifikator
            </button>
          </div>

          {loadingModifiers ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : modifiers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-500 text-sm">Modifikatorlar topilmadi</p>
              <button
                onClick={() => {
                  setEditModifier(undefined);
                  setShowModifierModal(true);
                }}
                className="mt-3 text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                Yangi modifikator qo'shish
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nomi (UZ)</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nomi (RU)</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Holat</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {modifiers.map((mod) => (
                    <tr key={mod.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{mod.name_uz}</td>
                      <td className="px-4 py-3 text-gray-500">{mod.name_ru || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            mod.is_active
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {mod.is_active ? 'Faol' : 'Nofaol'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditModifier(mod);
                              setShowModifierModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteModifier(mod)}
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
        </>
      )}

      {/* Addons Tab */}
      {activeTab === 'addons' && (
        <>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                setEditAddon(undefined);
                setShowAddonModal(true);
              }}
              className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              <Plus size={18} />
              Yangi qo'shimcha
            </button>
          </div>

          {loadingAddons ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : addons.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-500 text-sm">Qo'shimchalar topilmadi</p>
              <button
                onClick={() => {
                  setEditAddon(undefined);
                  setShowAddonModal(true);
                }}
                className="mt-3 text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                Yangi qo'shimcha qo'shish
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nomi (UZ)</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nomi (RU)</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Narx</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Holat</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {addons.map((addon) => (
                    <tr key={addon.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{addon.name_uz}</td>
                      <td className="px-4 py-3 text-gray-500">{addon.name_ru || '—'}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{formatPrice(addon.price)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            addon.is_active
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {addon.is_active ? 'Faol' : 'Nofaol'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditAddon(addon);
                              setShowAddonModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteAddon(addon)}
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
        </>
      )}

      {/* Modifier Modals */}
      {showModifierModal && (
        <ModifierModal
          modifier={editModifier}
          onClose={() => {
            setShowModifierModal(false);
            setEditModifier(undefined);
          }}
        />
      )}

      {deleteModifier && (
        <DeleteConfirmModal
          title="Modifikatorni o'chirish"
          message={`"${deleteModifier.name_uz}" modifikatorini o'chirishni tasdiqlaysizmi?`}
          onConfirm={() => deleteModifierMutation.mutate(deleteModifier.id)}
          onClose={() => setDeleteModifier(null)}
          isPending={deleteModifierMutation.isPending}
        />
      )}

      {/* Addon Modals */}
      {showAddonModal && (
        <AddonModal
          addon={editAddon}
          onClose={() => {
            setShowAddonModal(false);
            setEditAddon(undefined);
          }}
        />
      )}

      {deleteAddon && (
        <DeleteConfirmModal
          title="Qo'shimchani o'chirish"
          message={`"${deleteAddon.name_uz}" qo'shimchasini o'chirishni tasdiqlaysizmi?`}
          onConfirm={() => deleteAddonMutation.mutate(deleteAddon.id)}
          onClose={() => setDeleteAddon(null)}
          isPending={deleteAddonMutation.isPending}
        />
      )}
    </Layout>
  );
}
