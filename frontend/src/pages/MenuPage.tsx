import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Category, MenuItem } from '../types';
import Layout from '../components/Layout';
import PageGuide from '../components/PageGuide';
import { LoadingState, ErrorState } from '../components/QueryState';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  UtensilsCrossed,
  FolderOpen,
  FolderPlus,
} from 'lucide-react';
import { apiErrorMessage, apiFieldErrors } from '../lib/apiError';
import { formatMoney } from '../lib/format';

// ─── Menyu daraxti (#23) ──────────────────────────────────────────
// API barcha kategoriyalarni tekis qaytaradi (parent_id bilan). Menyu ikki darajali:
// asosiy kategoriya → sub-menyu → taom. Eski kompaniyalarda sub-menyusiz kategoriya
// (taomlari o'zida) ham bo'ladi — u ham ishlaydi.

interface CategoryNode {
  top: Category;
  subs: Category[];
}

const bySort = (a: Category, b: Category) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const ids = new Set(categories.map((c) => c.id));
  // Otasi ro'yxatda yo'q sub-menyu (masalan, ota o'chirilgan) yo'qolib qolmasin — asosiy deb ko'rsatiladi
  const isTop = (c: Category) => !c.parent_id || !ids.has(c.parent_id);
  return categories
    .filter(isTop)
    .sort(bySort)
    .map((top) => ({ top, subs: categories.filter((c) => c.parent_id === top.id).sort(bySort) }));
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none';

// ─── Category Modal ───────────────────────────────────────────────

function CategoryModal({
  category,
  tops,
  hasChildren,
  defaultParentId,
  nextSortOrder,
  onClose,
}: {
  category?: Category;
  /** Ota sifatida tanlash mumkin bo'lgan asosiy kategoriyalar */
  tops: Category[];
  /** Tahrirlanayotgan kategoriyaning sub-menyulari bormi (bo'lsa, uni boshqasiga ko'chirib bo'lmaydi) */
  hasChildren: boolean;
  defaultParentId?: number;
  /** Yangi kategoriya/sub-menyu ro'yxat oxiriga tushishi uchun: ota → keyingi sort_order */
  nextSortOrder: (parentId: number | null) => number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!category;
  const parentOptions = tops.filter((t) => t.id !== category?.id);
  const initialParent = category ? category.parent_id ?? '' : defaultParentId ?? '';
  const [form, setForm] = useState<{ name_uz: string; name_ru: string; icon: string; parent_id: number | '' }>({
    name_uz: category?.name_uz || '',
    name_ru: category?.name_ru || '',
    icon: category?.icon || '',
    parent_id: initialParent,
  });
  const [level, setLevel] = useState<'top' | 'sub'>(initialParent ? 'sub' : 'top');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isSub = level === 'sub';

  const mutation = useMutation({
    mutationFn: async () => {
      const parentId = isSub && form.parent_id ? form.parent_id : null;
      const payload = { ...form, parent_id: parentId };
      if (isEdit) {
        return (await api.put(`/categories/${category.id}`, payload)).data;
      }
      return (await api.post('/categories', { ...payload, sort_order: nextSortOrder(parentId) })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      onClose();
    },
    onError: (err: unknown) => {
      setFieldErrors(apiFieldErrors(err));
      setError(apiErrorMessage(err));
    },
  });

  const chooseLevel = (next: 'top' | 'sub') => {
    setLevel(next);
    if (next === 'sub' && !form.parent_id && parentOptions[0]) {
      setForm((p) => ({ ...p, parent_id: parentOptions[0].id }));
    }
  };

  const subDisabled = parentOptions.length === 0 || hasChildren;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit
              ? isSub ? 'Sub-menyuni tahrirlash' : 'Kategoriyani tahrirlash'
              : isSub ? 'Yangi sub-menyu' : 'Yangi kategoriya'}
          </h2>
          <button onClick={onClose} aria-label="Oynani yopish" className="text-gray-400 hover:text-gray-600">
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

          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">Qayerda turadi?</legend>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${!isSub ? 'border-amber-600 bg-amber-50' : 'border-gray-200'}`}>
                <input
                  type="radio"
                  name="category-level"
                  checked={!isSub}
                  onChange={() => chooseLevel('top')}
                  className="mt-0.5 w-4 h-4 text-amber-500 focus:ring-amber-500"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900">Asosiy kategoriya</span>
                  <span className="block text-xs text-gray-500">Masalan: Milliy taomlar, Ichimliklar, Suvlar</span>
                </span>
              </label>
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  subDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                } ${isSub ? 'border-amber-600 bg-amber-50' : 'border-gray-200'}`}
              >
                <input
                  type="radio"
                  name="category-level"
                  checked={isSub}
                  disabled={subDisabled}
                  onChange={() => chooseLevel('sub')}
                  className="mt-0.5 w-4 h-4 text-amber-500 focus:ring-amber-500"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900">Kategoriya ichida sub-menyu</span>
                  <span className="block text-xs text-gray-500">
                    {hasChildren
                      ? "Bu kategoriyaning o'z sub-menyulari bor — uni boshqa kategoriya ichiga qo'yib bo'lmaydi"
                      : parentOptions.length === 0
                        ? "Avval asosiy kategoriya qo'shing"
                        : 'Masalan: Palov, Gazli suv, Kaboblar — taomlar shu yerga qo\'shiladi'}
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          {isSub && (
            <div>
              <label htmlFor="category-parent" className="block text-sm font-medium text-gray-700 mb-1">
                Qaysi kategoriya ichida <span className="text-red-500">*</span>
              </label>
              <select
                id="category-parent"
                required
                value={form.parent_id}
                onChange={(e) => setForm((p) => ({ ...p, parent_id: e.target.value ? Number(e.target.value) : '' }))}
                aria-invalid={!!fieldErrors.parent_id}
                className={inputClass}
              >
                {parentOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon ? `${t.icon} ` : ''}{t.name_uz}
                  </option>
                ))}
              </select>
              {fieldErrors.parent_id && <p className="mt-1 text-xs text-red-600">{fieldErrors.parent_id}</p>}
            </div>
          )}

          <div>
            <label htmlFor="category-name-uz" className="block text-sm font-medium text-gray-700 mb-1">
              Nomi (UZ) <span className="text-red-500">*</span>
            </label>
            <input
              id="category-name-uz"
              type="text"
              required
              value={form.name_uz}
              onChange={(e) => setForm((p) => ({ ...p, name_uz: e.target.value }))}
              placeholder={isSub ? 'Gazli suv' : 'Suvlar'}
              aria-invalid={!!fieldErrors.name_uz}
              className={inputClass}
            />
            {fieldErrors.name_uz && <p className="mt-1 text-xs text-red-600">{fieldErrors.name_uz}</p>}
          </div>

          <div>
            <label htmlFor="category-name-ru" className="block text-sm font-medium text-gray-700 mb-1">
              Nomi (RU) <span className="text-red-500">*</span>
            </label>
            <input
              id="category-name-ru"
              type="text"
              required
              value={form.name_ru}
              onChange={(e) => setForm((p) => ({ ...p, name_ru: e.target.value }))}
              placeholder={isSub ? 'Газированная вода' : 'Вода'}
              aria-invalid={!!fieldErrors.name_ru}
              className={inputClass}
            />
            {fieldErrors.name_ru && <p className="mt-1 text-xs text-red-600">{fieldErrors.name_ru}</p>}
          </div>

          <div>
            <label htmlFor="category-icon" className="block text-sm font-medium text-gray-700 mb-1">Ikonka (ixtiyoriy)</label>
            <input
              id="category-icon"
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

// ─── MenuItem Modal ───────────────────────────────────────────────

function MenuItemModal({
  item,
  tree,
  defaultCategoryId,
  onClose,
}: {
  item?: MenuItem;
  tree: CategoryNode[];
  defaultCategoryId?: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!item;
  // Taom sub-menyuga qo'shiladi; sub-menyusi yo'q (eski) asosiy kategoriyaga ham mumkin
  const selectable = tree.flatMap((n) => (n.subs.length > 0 ? n.subs : [n.top]));
  const defaultNode = tree.find((n) => n.top.id === defaultCategoryId);
  const initialCategory =
    item?.category_id ||
    (defaultNode && defaultNode.subs.length > 0 ? defaultNode.subs[0].id : defaultCategoryId) ||
    (selectable[0]?.id ?? 0);
  const [form, setForm] = useState({
    category_id: initialCategory,
    sell_type: (item?.sell_type ?? 'portion') as 'portion' | 'weight',
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const noCategories = selectable.length === 0;

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
      setFieldErrors(apiFieldErrors(err));
      setError(apiErrorMessage(err));
    },
  });

  const fieldError = (name: string) =>
    fieldErrors[name] ? <p className="mt-1 text-xs text-red-600">{fieldErrors[name]}</p> : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Taomni tahrirlash' : 'Yangi taom'}
          </h2>
          <button onClick={onClose} aria-label="Oynani yopish" className="text-gray-400 hover:text-gray-600">
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

          {noCategories && (
            <div className="bg-amber-50 text-amber-800 text-sm px-4 py-3 rounded-lg border border-amber-200">
              Taom qo'shishdan oldin kategoriya va uning ichida sub-menyu qo'shing (yuqoridagi «Kategoriya» tugmasi).
            </div>
          )}

          <div>
            <label htmlFor="item-category" className="block text-sm font-medium text-gray-700 mb-1">
              Sub-menyu <span className="text-red-500">*</span>
            </label>
            <select
              id="item-category"
              required
              value={form.category_id || ''}
              onChange={(e) => setForm((p) => ({ ...p, category_id: parseInt(e.target.value) }))}
              aria-invalid={!!fieldErrors.category_id}
              className={inputClass}
            >
              {noCategories && <option value="">Sub-menyu yo'q</option>}
              {tree.map(({ top, subs }) =>
                subs.length > 0 ? (
                  <optgroup key={top.id} label={`${top.icon ? `${top.icon} ` : ''}${top.name_uz}`}>
                    {subs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon ? `${c.icon} ` : ''}{c.name_uz}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={top.id} value={top.id}>
                    {top.icon ? `${top.icon} ` : ''}{top.name_uz}
                  </option>
                ),
              )}
            </select>
            {fieldError('category_id')}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="item-name-uz" className="block text-sm font-medium text-gray-700 mb-1">
                Nomi (UZ) <span className="text-red-500">*</span>
              </label>
              <input
                id="item-name-uz"
                type="text"
                required
                value={form.name_uz}
                onChange={(e) => setForm((p) => ({ ...p, name_uz: e.target.value }))}
                placeholder="Osh"
                aria-invalid={!!fieldErrors.name_uz}
                className={inputClass}
              />
              {fieldError('name_uz')}
            </div>
            <div>
              <label htmlFor="item-name-ru" className="block text-sm font-medium text-gray-700 mb-1">
                Nomi (RU) <span className="text-red-500">*</span>
              </label>
              <input
                id="item-name-ru"
                type="text"
                required
                value={form.name_ru}
                onChange={(e) => setForm((p) => ({ ...p, name_ru: e.target.value }))}
                placeholder="Плов"
                aria-invalid={!!fieldErrors.name_ru}
                className={inputClass}
              />
              {fieldError('name_ru')}
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

          <div>
            <label htmlFor="item-sell-type" className="block text-sm font-medium text-gray-700 mb-1">Qanday sotiladi</label>
            <select
              id="item-sell-type"
              value={form.sell_type}
              onChange={(e) => setForm((p) => ({ ...p, sell_type: e.target.value as 'portion' | 'weight' }))}
              className={inputClass}
            >
              <option value="portion">Porsiya (dona)</option>
              <option value="weight">Vazn bilan (kg) — masalan, osh, kabob</option>
            </select>
            {fieldError('sell_type')}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="item-price" className="block text-sm font-medium text-gray-700 mb-1">
                {form.sell_type === 'weight' ? "1 kg narxi (so'm)" : "Narxi (so'm)"} <span className="text-red-500">*</span>
              </label>
              <input
                id="item-price"
                type="number"
                required
                min="0"
                step="100"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="25000"
                aria-invalid={!!fieldErrors.price}
                className={inputClass}
              />
              {fieldError('price')}
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
              disabled={mutation.isPending || noCategories}
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

// ─── Delete Confirm Modal ─────────────────────────────────────────

function DeleteConfirmModal({
  title,
  message,
  onConfirm,
  onClose,
  isPending,
  error,
  blocked = false,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
  error?: string;
  /** O'chirib bo'lmaydi (masalan, ichida sub-menyular bor) — faqat tushuntirish */
  blocked?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        {error && (
          <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">{error}</div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {blocked ? 'Tushunarli' : 'Bekor qilish'}
          </button>
          {!blocked && (
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "O'chirilmoqda..." : "O'chirish"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Menu Page ───────────────────────────────────────────────

const GUIDE_STEPS = [
  "«Kategoriya» tugmasini bosib asosiy kategoriya qo'shing — masalan, «Milliy taomlar» yoki «Suvlar».",
  "Kategoriya yonidagi papka belgisini bosib, uning ichida sub-menyu qo'shing — masalan, «Palov» yoki «Gazli suv».",
  "«Taom» tugmasini bosing va taomni kerakli sub-menyuga qo'shing.",
  "Narxini yozing. Vazn bilan sotilsa (osh, kabob) — «Vazn bilan» ni tanlab, 1 kg narxini yozing.",
  "Osh uchun qo'shimchalar (qazi, bedana tuxumi, limon) — chap menyudagi «Qo'shimchalar» bo'limida qo'shiladi va taomga biriktiriladi.",
];

type DeleteTarget = {
  type: 'category' | 'item';
  id: number;
  name: string;
  /** Kategoriya ichidagi sub-menyular soni — bor bo'lsa o'chirishga ruxsat yo'q */
  subCount?: number;
  isSub?: boolean;
};

export default function MenuPage() {
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  // Modals
  const [categoryModal, setCategoryModal] = useState<{ category?: Category; parentId?: number } | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [actionError, setActionError] = useState('');

  // Fetch categories (asosiy + sub-menyular, tekis ro'yxat)
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesFailed,
    error: categoriesError,
    refetch: refetchCategories,
  } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.data ?? [];
    },
  });

  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);


  // Fetch menu items
  const {
    data: menuItems = [],
    isLoading: itemsLoading,
    isError: itemsFailed,
    error: itemsError,
    refetch: refetchItems,
  } = useQuery<MenuItem[]>({
    queryKey: ['menu-items', selectedCategoryId, search],
    queryFn: async () => {
      // Backend asosiy kategoriya bo'yicha sub-menyular taomlarini ham qaytaradi; per_page — 20 cheklovisiz
      const params: Record<string, string | number> = { per_page: 500 };
      if (selectedCategoryId !== null) params.category_id = selectedCategoryId;
      if (search) params.search = search;
      const d = (await api.get('/menu-items', { params })).data.data;
      return (d?.data ?? d ?? []) as MenuItem[];
    },
  });

  // Toggle availability
  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      return (await api.patch(`/menu-items/${id}/availability`)).data;
    },
    onSuccess: () => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    },
    onError: (err: unknown) => setActionError(apiErrorMessage(err)),
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

  const toggleExpanded = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectTop = (id: number) => {
    setSelectedCategoryId(id);
    setExpanded((prev) => new Set(prev).add(id));
  };

  const openNewItem = () => {
    setEditItem(undefined);
    setShowItemModal(true);
  };

  /** "Milliy taomlar › Palov" — sub-menyu bo'lsa ota nomi bilan */
  const categoryLabel = (id: number) => {
    const c = categoryById.get(id);
    if (!c) return '—';
    const parent = c.parent_id ? categoryById.get(c.parent_id) : undefined;
    return parent ? `${parent.name_uz} › ${c.name_uz}` : c.name_uz;
  };

  const selectedNode = tree.find((n) => n.top.id === selectedCategoryId);
  const selectedCategory = selectedCategoryId !== null ? categoryById.get(selectedCategoryId) : undefined;
  const editHasChildren = !!categoryModal?.category && categories.some((c) => c.parent_id === categoryModal.category?.id);

  const rowActions = (cat: Category, isSub: boolean, subCount: number) => (
    <div className="flex items-center pr-1 shrink-0">
      {!isSub && (
        <button
          onClick={() => setCategoryModal({ parentId: cat.id })}
          className="p-2 text-gray-400 hover:text-amber-700 rounded-lg"
          title="Ichiga sub-menyu qo'shish"
          aria-label={`${cat.name_uz} ichiga sub-menyu qo'shish`}
        >
          <FolderPlus size={16} />
        </button>
      )}
      <button
        onClick={() => setCategoryModal({ category: cat })}
        className="p-2 text-gray-400 hover:text-amber-700 rounded-lg"
        title="Tahrirlash"
        aria-label={`${cat.name_uz} — tahrirlash`}
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={() => {
          deleteMutation.reset();
          setDeleteTarget({ type: 'category', id: cat.id, name: cat.name_uz, subCount, isSub });
        }}
        className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
        title="O'chirish"
        aria-label={`${cat.name_uz} — o'chirish`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  const renderItemsEmpty = () => {
    if (categories.length === 0) {
      return (
        <>
          <FolderOpen size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 text-sm font-medium">Menyu hali bo'sh</p>
          <p className="text-gray-500 text-sm mt-1">
            Avval kategoriya qo'shing (masalan, «Milliy taomlar»), keyin uning ichida sub-menyu («Palov»).
          </p>
          <button
            onClick={() => setCategoryModal({})}
            className="mt-3 text-sm text-amber-700 hover:text-amber-800 font-medium"
          >
            + Kategoriya qo'shish
          </button>
        </>
      );
    }
    if (search) {
      return (
        <>
          <Search size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Hech narsa topilmadi</p>
          <button onClick={() => setSearch('')} className="mt-3 text-sm text-amber-700 hover:text-amber-800 font-medium">
            Qidiruvni tozalash
          </button>
        </>
      );
    }
    if (selectedNode && selectedNode.subs.length === 0) {
      return (
        <>
          <FolderPlus size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 text-sm font-medium">«{selectedNode.top.name_uz}» ichida hali sub-menyu yo'q</p>
          <p className="text-gray-500 text-sm mt-1">
            Sub-menyu qo'shing (masalan, «Palov» yoki «Gazli suv»), keyin unga taom qo'shing.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setCategoryModal({ parentId: selectedNode.top.id })}
              className="text-sm text-amber-700 hover:text-amber-800 font-medium"
            >
              + Sub-menyu qo'shish
            </button>
            <button onClick={openNewItem} className="text-sm text-amber-700 hover:text-amber-800 font-medium">
              yoki taomni shu yerga qo'shish
            </button>
          </div>
        </>
      );
    }
    return (
      <>
        <UtensilsCrossed size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">
          {selectedCategory ? `«${selectedCategory.name_uz}» da hali taom yo'q` : "Hali taom qo'shilmagan"}
        </p>
        <button onClick={openNewItem} className="mt-3 text-sm text-amber-700 hover:text-amber-800 font-medium">
          + Taom qo'shish
        </button>
      </>
    );
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menyu</h1>
          <p className="text-gray-500 text-sm mt-1">Kategoriya → sub-menyu → taom</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCategoryModal({})}
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Plus size={18} />
            Kategoriya
          </button>
          <button
            onClick={openNewItem}
            className="inline-flex items-center gap-2 bg-amber-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors"
          >
            <Plus size={18} />
            Taom
          </button>
        </div>
      </div>

      <PageGuide
        id="menu"
        title="Menyu bo'limi nima uchun?"
        intro="Bu yerda restoraningiz menyusini tuzasiz. Ofitsiant, kassa va Telegram mijozlari aynan shu menyuni ko'radi. Menyu ikki qavatli: kategoriya (masalan, «Suvlar») → uning ichida sub-menyu («Gazli suv») → taomlar."
        steps={GUIDE_STEPS}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Categories tree */}
        <div className="lg:w-80 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Kategoriyalar va sub-menyular
              </p>
            </div>
            {categoriesLoading ? (
              <LoadingState />
            ) : categoriesFailed ? (
              <div className="p-3">
                <ErrorState error={categoriesError} onRetry={() => refetchCategories()} title="Kategoriyalarni yuklab bo'lmadi" />
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  className={`w-full min-h-11 text-left px-4 py-3 text-sm transition-colors flex items-center justify-between ${
                    selectedCategoryId === null
                      ? 'bg-amber-50 text-amber-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>Barcha taomlar</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
                {tree.map(({ top, subs }) => {
                  const isOpen = expanded.has(top.id);
                  return (
                    <div key={top.id}>
                      <div
                        className={`flex items-center ${
                          selectedCategoryId === top.id ? 'bg-amber-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        {subs.length > 0 ? (
                          <button
                            onClick={() => toggleExpanded(top.id)}
                            aria-expanded={isOpen}
                            aria-label={isOpen ? `${top.name_uz} — yopish` : `${top.name_uz} — sub-menyularni ko'rsatish`}
                            className="ml-1 p-2 text-gray-400 hover:text-gray-700 rounded-lg shrink-0"
                          >
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        ) : (
                          <span className="ml-1 w-8 shrink-0" aria-hidden="true" />
                        )}
                        <button
                          onClick={() => selectTop(top.id)}
                          className={`flex-1 min-w-0 min-h-11 text-left py-3 pr-1 text-sm flex items-center gap-2 ${
                            selectedCategoryId === top.id ? 'text-amber-700 font-medium' : 'text-gray-800 font-medium'
                          }`}
                        >
                          {top.icon && <span>{top.icon}</span>}
                          <span className="truncate">{top.name_uz}</span>
                          {subs.length > 0 && (
                            <span className="text-xs font-normal text-gray-500 tabular-nums shrink-0">{subs.length}</span>
                          )}
                        </button>
                        {rowActions(top, false, subs.length)}
                      </div>
                      {isOpen &&
                        subs.map((sub) => (
                          <div
                            key={sub.id}
                            className={`flex items-center border-t border-gray-50 ${
                              selectedCategoryId === sub.id ? 'bg-amber-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <button
                              onClick={() => setSelectedCategoryId(sub.id)}
                              className={`flex-1 min-w-0 min-h-11 text-left pl-10 py-2.5 pr-1 text-sm flex items-center gap-2 ${
                                selectedCategoryId === sub.id ? 'text-amber-700 font-medium' : 'text-gray-700'
                              }`}
                            >
                              {sub.icon && <span>{sub.icon}</span>}
                              <span className="truncate">{sub.name_uz}</span>
                            </button>
                            {rowActions(sub, true, 0)}
                          </div>
                        ))}
                      {isOpen && (
                        <button
                          onClick={() => setCategoryModal({ parentId: top.id })}
                          className="w-full min-h-11 text-left pl-10 pr-4 py-2 text-sm text-amber-700 hover:text-amber-800 hover:bg-gray-50 font-medium border-t border-gray-50"
                        >
                          + Sub-menyu qo'shish
                        </button>
                      )}
                    </div>
                  );
                })}
                {tree.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <FolderOpen size={24} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Kategoriya yo'q</p>
                    <button
                      onClick={() => setCategoryModal({})}
                      className="mt-2 text-sm text-amber-700 hover:text-amber-800 font-medium"
                    >
                      + Birinchi kategoriyani qo'shish
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Menu items */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Taom qidirish..."
                aria-label="Taom qidirish"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {actionError && (
            <div role="alert" className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
              {actionError}
            </div>
          )}

          {/* Items table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {itemsLoading ? (
              <LoadingState label="Taomlar yuklanmoqda..." />
            ) : itemsFailed ? (
              <div className="p-4">
                <ErrorState error={itemsError} onRetry={() => refetchItems()} title="Taomlarni yuklab bo'lmadi" />
              </div>
            ) : menuItems.length === 0 ? (
              <div className="p-8 text-center">{renderItemsEmpty()}</div>
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
                              <span className="inline-block mt-1 text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                Mashhur
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {categoryLabel(item.category_id)}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {formatMoney(item.price)}
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
                              className="p-1.5 text-gray-400 hover:text-amber-700 transition-colors"
                              title="Tahrirlash"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => {
                                deleteMutation.reset();
                                setDeleteTarget({
                                  type: 'item',
                                  id: item.id,
                                  name: item.name_uz,
                                });
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
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
      {categoryModal && (
        <CategoryModal
          category={categoryModal.category}
          tops={tree.map((n) => n.top)}
          hasChildren={editHasChildren}
          defaultParentId={categoryModal.parentId}
          nextSortOrder={(parentId) =>
            Math.max(0, ...categories.filter((c) => (c.parent_id ?? null) === parentId).map((c) => c.sort_order ?? 0)) + 1
          }
          onClose={() => setCategoryModal(null)}
        />
      )}

      {showItemModal && (
        <MenuItemModal
          item={editItem}
          tree={tree}
          defaultCategoryId={selectedCategoryId ?? undefined}
          onClose={() => {
            setShowItemModal(false);
            setEditItem(undefined);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title={
            deleteTarget.type === 'item'
              ? "Taomni o'chirish"
              : deleteTarget.isSub ? "Sub-menyuni o'chirish" : "Kategoriyani o'chirish"
          }
          message={
            deleteTarget.subCount
              ? `«${deleteTarget.name}» ichida ${deleteTarget.subCount} ta sub-menyu bor. Avval ularni o'chiring yoki boshqa kategoriyaga o'tkazing (sub-menyuni tahrirlab).`
              : deleteTarget.type === 'category'
                ? `«${deleteTarget.name}» o'chirilsa, ichidagi taomlar ham menyudan chiqadi. Tasdiqlaysizmi?`
                : `«${deleteTarget.name}» ni o'chirishni tasdiqlaysizmi?`
          }
          blocked={!!deleteTarget.subCount}
          error={deleteMutation.isError ? apiErrorMessage(deleteMutation.error) : undefined}
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
