import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Category, MenuItem } from '../types';
import Layout from '../components/Layout';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Eye,
  EyeOff,
  ChevronRight,
  UtensilsCrossed,
  FolderOpen,
} from 'lucide-react';

// ─── Category Modal ───────────────────────────────────────────────

function CategoryModal({
  category,
  onClose,
}: {
  category?: Category;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!category;
  const [form, setForm] = useState({
    name_uz: category?.name_uz || '',
    name_ru: category?.name_ru || '',
    icon: category?.icon || '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        return (await api.put(`/categories/${category.id}`, form)).data;
      }
      return (await api.post('/categories', form)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      onClose();
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(axiosErr.response?.data?.detail || axiosErr.response?.data?.message || 'Xatolik yuz berdi');
    },
  });

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
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
              placeholder="Salatlar"
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
              placeholder="Салаты"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ikonka (ixtiyoriy)</label>
            <input
              type="text"
              value={form.icon}
              onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
              placeholder="🥗"
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
              {mutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MenuItem Modal ───────────────────────────────────────────────

function MenuItemModal({
  item,
  categories,
  defaultCategoryId,
  onClose,
}: {
  item?: MenuItem;
  categories: Category[];
  defaultCategoryId?: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!item;
  const [form, setForm] = useState({
    category_id: item?.category_id || defaultCategoryId || (categories[0]?.id ?? 0),
    name_uz: item?.name_uz || '',
    name_ru: item?.name_ru || '',
    description_uz: item?.description_uz || '',
    description_ru: item?.description_ru || '',
    price: item?.price?.toString() || '',
    cooking_time: item?.cooking_time?.toString() || '',
    is_available: item?.is_available ?? true,
    is_popular: item?.is_popular ?? false,
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        price: parseFloat(form.price) || 0,
        cooking_time: form.cooking_time ? parseInt(form.cooking_time) : null,
      };
      if (isEdit) {
        return (await api.put(`/menu-items/${item.id}`, payload)).data;
      }
      return (await api.post('/menu-items', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      onClose();
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(axiosErr.response?.data?.detail || axiosErr.response?.data?.message || 'Xatolik yuz berdi');
    },
  });

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Taomni tahrirlash' : 'Yangi taom'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategoriya</label>
            <select
              required
              value={form.category_id}
              onChange={(e) => setForm((p) => ({ ...p, category_id: parseInt(e.target.value) }))}
              className={inputClass}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ''}{c.name_uz}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomi (UZ)</label>
              <input
                type="text"
                required
                value={form.name_uz}
                onChange={(e) => setForm((p) => ({ ...p, name_uz: e.target.value }))}
                placeholder="Osh"
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
                placeholder="Плов"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif (UZ)</label>
            <textarea
              value={form.description_uz}
              onChange={(e) => setForm((p) => ({ ...p, description_uz: e.target.value }))}
              placeholder="Taom haqida qisqacha..."
              rows={2}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif (RU)</label>
            <textarea
              value={form.description_ru}
              onChange={(e) => setForm((p) => ({ ...p, description_ru: e.target.value }))}
              placeholder="Краткое описание..."
              rows={2}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Narxi (so'm)</label>
              <input
                type="number"
                required
                min="0"
                step="100"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="25000"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tayyorlanish vaqti (min)
              </label>
              <input
                type="number"
                min="0"
                value={form.cooking_time}
                onChange={(e) => setForm((p) => ({ ...p, cooking_time: e.target.value }))}
                placeholder="15"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(e) => setForm((p) => ({ ...p, is_available: e.target.checked }))}
                className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
              />
              <span className="text-sm text-gray-700">Mavjud</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_popular}
                onChange={(e) => setForm((p) => ({ ...p, is_popular: e.target.checked }))}
                className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
              />
              <span className="text-sm text-gray-700">Mashhur</span>
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

// ─── Delete Confirm Modal ─────────────────────────────────────────

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

// ─── Main Menu Page ───────────────────────────────────────────────

export default function MenuPage() {
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | undefined>();
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'item';
    id: number;
    name: string;
  } | null>(null);

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.data ?? [];
    },
  });

  // Fetch menu items
  const { data: menuItemsData, isLoading: itemsLoading } = useQuery<{
    data: MenuItem[];
    total: number;
  }>({
    queryKey: ['menu-items', selectedCategoryId, search],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (selectedCategoryId) params.category_id = selectedCategoryId;
      if (search) params.search = search;
      const res = await api.get('/menu-items', { params });
      const d = res.data.data;
      return { data: d?.data ?? d ?? [], total: d?.total ?? 0 };
    },
  });

  const menuItems = menuItemsData?.data ?? [];

  // Toggle availability
  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      return (await api.patch(`/menu-items/${id}/availability`)).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu-items'] }),
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: number }) => {
      const endpoint = type === 'category' ? `/categories/${id}` : `/menu-items/${id}`;
      return (await api.delete(endpoint)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      setDeleteTarget(null);
      if (deleteTarget?.type === 'category' && deleteTarget.id === selectedCategoryId) {
        setSelectedCategoryId(null);
      }
    },
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('uz-UZ').format(price) + " so'm";

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menyu</h1>
          <p className="text-gray-500 text-sm mt-1">Kategoriyalar va taomlarni boshqarish</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditCategory(undefined);
              setShowCategoryModal(true);
            }}
            className="inline-flex items-center gap-2 border border-amber-500 text-amber-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors"
          >
            <Plus size={18} />
            Kategoriya
          </button>
          <button
            onClick={() => {
              setEditItem(undefined);
              setShowItemModal(true);
            }}
            className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            <Plus size={18} />
            Taom
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Categories sidebar */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Kategoriyalar
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between ${
                  selectedCategoryId === null
                    ? 'bg-amber-50 text-amber-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>Barchasi</span>
                <ChevronRight size={14} className="text-gray-400" />
              </button>
              {categories.map((cat) => (
                <div key={cat.id} className="group flex items-center">
                  <button
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`flex-1 text-left px-4 py-3 text-sm transition-colors flex items-center gap-2 ${
                      selectedCategoryId === cat.id
                        ? 'bg-amber-50 text-amber-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {cat.icon && <span>{cat.icon}</span>}
                    <span className="truncate">{cat.name_uz}</span>
                  </button>
                  <div className="hidden group-hover:flex items-center gap-1 pr-2">
                    <button
                      onClick={() => {
                        setEditCategory(cat);
                        setShowCategoryModal(true);
                      }}
                      className="p-1 text-gray-400 hover:text-amber-600"
                      title="Tahrirlash"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setDeleteTarget({ type: 'category', id: cat.id, name: cat.name_uz })
                      }
                      className="p-1 text-gray-400 hover:text-red-500"
                      title="O'chirish"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <FolderOpen size={24} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Kategoriya yo'q</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="flex-1">
          {/* Search */}
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Taom qidirish..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Items grid */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {itemsLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : menuItems.length === 0 ? (
              <div className="p-8 text-center">
                <UtensilsCrossed size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Taomlar topilmadi</p>
                <button
                  onClick={() => {
                    setEditItem(undefined);
                    setShowItemModal(true);
                  }}
                  className="mt-3 text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  Yangi taom qo'shish
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-6 py-3 font-medium text-gray-500">Taom</th>
                      <th className="text-left px-6 py-3 font-medium text-gray-500">Kategoriya</th>
                      <th className="text-left px-6 py-3 font-medium text-gray-500">Narxi</th>
                      <th className="text-left px-6 py-3 font-medium text-gray-500">Vaqt</th>
                      <th className="text-left px-6 py-3 font-medium text-gray-500">Holati</th>
                      <th className="text-left px-6 py-3 font-medium text-gray-500">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {menuItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{item.name_uz}</p>
                            {item.name_ru && (
                              <p className="text-xs text-gray-400">{item.name_ru}</p>
                            )}
                            {item.is_popular && (
                              <span className="inline-block mt-1 text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium">
                                Mashhur
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {item.category?.icon && <span className="mr-1">{item.category.icon}</span>}
                          {item.category?.name_uz || '—'}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {formatPrice(item.price)}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {item.cooking_time ? `${item.cooking_time} min` : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleMutation.mutate(item.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                              item.is_available
                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                : 'bg-red-50 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            {item.is_available ? (
                              <>
                                <Eye size={12} /> Mavjud
                              </>
                            ) : (
                              <>
                                <EyeOff size={12} /> Mavjud emas
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditItem(item);
                                setShowItemModal(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors"
                              title="Tahrirlash"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'item',
                                  id: item.id,
                                  name: item.name_uz,
                                })
                              }
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                              title="O'chirish"
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
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCategoryModal && (
        <CategoryModal
          category={editCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditCategory(undefined);
          }}
        />
      )}

      {showItemModal && (
        <MenuItemModal
          item={editItem}
          categories={categories}
          defaultCategoryId={selectedCategoryId ?? undefined}
          onClose={() => {
            setShowItemModal(false);
            setEditItem(undefined);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title={deleteTarget.type === 'category' ? "Kategoriyani o'chirish" : "Taomni o'chirish"}
          message={`"${deleteTarget.name}" ni o'chirishni tasdiqlaysizmi?`}
          onConfirm={() =>
            deleteMutation.mutate({ type: deleteTarget.type, id: deleteTarget.id })
          }
          onClose={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </Layout>
  );
}
