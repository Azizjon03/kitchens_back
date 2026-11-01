import { useId, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookMarked,
  ChevronDown,
  ChevronRight,
  Info,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import api from '../lib/api';
import Layout from '../components/Layout';
import ImagePicker from '../components/ImagePicker';
import PageGuide from '../components/PageGuide';
import { LoadingState, ErrorState } from '../components/QueryState';
import { apiErrorMessage, apiFieldErrors } from '../lib/apiError';
import { formatMoney, formatNumber } from '../lib/format';
import { useEscape } from '../lib/useEscape';
import NumberInput from '../components/NumberInput';

/**
 * Standart menyu katalogi (#23) — faqat super admin.
 * Kategoriya → sub-menyu → taom. Yangi korxona ochilganda tanlangan restoran turiga
 * mos qismi nusxa qilinadi; bu yerdagi o'zgarish mavjud korxonalarga ta'sir qilmaydi.
 */

// ─── Turlar ──────────────────────────────────────────────────────

type RestaurantType = 'oshxona' | 'fast_food' | 'kafe' | 'hammasi';

interface CatalogItem {
  id: number;
  catalog_category_id: number;
  name_uz: string;
  name_ru: string;
  sell_type: 'portion' | 'weight';
  price: string | number;
  min_weight: string | number | null;
  weight_step: string | number | null;
  is_active: boolean;
  /** #35: restoran katalogdan qo'shganda rasm ham nusxalanadi */
  image?: string | null;
}

interface CatalogSub {
  id: number;
  parent_id: number;
  name_uz: string;
  name_ru: string;
  types: RestaurantType[] | null;
  is_active: boolean;
  items: CatalogItem[];
}

interface CatalogTop {
  id: number;
  name_uz: string;
  name_ru: string;
  icon: string | null;
  types: RestaurantType[] | null;
  sort_order: number;
  is_active: boolean;
  children: CatalogSub[];
}

interface CatalogAddon {
  id: number;
  name_uz: string;
  name_ru: string;
  price: string | number;
  is_active: boolean;
  category_ids: number[];
}

interface CatalogData {
  categories: CatalogTop[];
  addons: CatalogAddon[];
}

const QUERY_KEY = ['super-catalog'];

const TYPE_OPTIONS: { value: RestaurantType; label: string }[] = [
  { value: 'oshxona', label: 'Oshxona' },
  { value: 'fast_food', label: 'Fast food' },
  { value: 'kafe', label: 'Kafe' },
  { value: 'hammasi', label: "To'liq menyu" },
];

const TYPE_BADGE: Record<RestaurantType, string> = {
  oshxona: 'bg-amber-50 text-amber-700',
  fast_food: 'bg-red-50 text-red-700',
  kafe: 'bg-purple-50 text-purple-700',
  hammasi: 'bg-blue-50 text-blue-700',
};

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none';
const iconBtn =
  'inline-flex items-center justify-center min-w-11 min-h-11 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors';
const linkBtn =
  'inline-flex items-center gap-1 min-h-11 px-2 text-sm font-medium text-amber-700 hover:text-amber-800';

function TypeBadges({ types, inherited }: { types: RestaurantType[] | null; inherited?: boolean }) {
  if (types === null && inherited) {
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        Kategoriya turlarida
      </span>
    );
  }
  if (!types || types.length === 0) {
    // Asosiy kategoriyada tur bo'lmasa, har sub-menyu o'z turini belgilaydi
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        {inherited ? 'Hech qaysi turga berilmaydi' : 'Turi har sub-menyuda'}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap gap-1">
      {TYPE_OPTIONS.filter((t) => types.includes(t.value)).map((t) => (
        <span key={t.value} className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[t.value]}`}>
          {t.label}
        </span>
      ))}
    </span>
  );
}

function InactiveBadge() {
  return (
    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">Nofaol</span>
  );
}

function weightText(item: CatalogItem): string {
  if (item.sell_type !== 'weight') return 'Porsiya';
  const parts = ['Vazn'];
  if (item.min_weight) parts.push(`kamida ${formatNumber(item.min_weight)} kg`);
  if (item.weight_step) parts.push(`qadam ${formatNumber(item.weight_step)} kg`);
  return parts.join(' · ');
}

// ─── Umumiy modal qobig'i ────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  wide,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  useEscape(onClose);
  const titleId = useId();
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={`bg-white rounded-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Yopish" className={iconBtn}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormActions({ onClose, isPending, isEdit }: { onClose: () => void; isPending: boolean; isEdit: boolean }) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 min-h-11 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        Bekor qilish
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="flex-1 min-h-11 px-4 py-2.5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Saqlanmoqda...' : isEdit ? 'Saqlash' : "Qo'shish"}
      </button>
    </div>
  );
}

function FormError({ error }: { error: string }) {
  if (!error) return null;
  return <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">{error}</div>;
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p id={id} className="mt-1 text-sm text-red-600">
      {msg}
    </p>
  );
}

/** Mutatsiya xatosi: maydonga bog'langani maydon ostida, qolgani tepada */
function useFormErrors() {
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const reset = () => {
    setError('');
    setFieldErrors({});
  };
  const handle = (err: unknown, knownFields: string[]) => {
    const byField = apiFieldErrors(err);
    const known = Object.fromEntries(
      Object.entries(byField).filter(([k]) => knownFields.some((f) => k === f || k.startsWith(`${f}.`))),
    );
    // "types.0" → "types" kabi massiv xatolari asosiy maydonga
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(known)) normalized[k.split('.')[0]] ??= v;
    setFieldErrors(normalized);
    setError(Object.keys(normalized).length ? '' : apiErrorMessage(err));
  };
  return { error, fieldErrors, reset, handle };
}

// ─── Kategoriya / sub-menyu modali ───────────────────────────────

function CategoryModal({
  parent,
  edit,
  onClose,
}: {
  /** Sub-menyu uchun ota kategoriya; bo'lmasa — asosiy kategoriya */
  parent?: CatalogTop;
  edit?: CatalogTop | CatalogSub;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isSub = !!parent;
  const [form, setForm] = useState({
    name_uz: edit?.name_uz ?? '',
    name_ru: edit?.name_ru ?? '',
    icon: (edit && 'icon' in edit ? edit.icon : '') ?? '',
    inherit: isSub ? (edit ? edit.types === null : true) : false,
    types: (edit?.types ?? (isSub ? parent?.types ?? [] : [])) as RestaurantType[],
    is_active: edit?.is_active ?? true,
  });
  const { error, fieldErrors, reset, handle } = useFormErrors();

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name_uz: form.name_uz.trim(),
        name_ru: form.name_ru.trim(),
        types: isSub && form.inherit ? null : form.types,
        is_active: form.is_active,
      };
      if (!isSub) payload.icon = form.icon.trim() || null;
      if (edit) return (await api.put(`/super/catalog/categories/${edit.id}`, payload)).data;
      if (isSub) payload.parent_id = parent.id;
      return (await api.post('/super/catalog/categories', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      onClose();
    },
    onError: (err) => handle(err, ['name_uz', 'name_ru', 'icon', 'types', 'parent_id']),
  });

  const toggleType = (t: RestaurantType) =>
    setForm((p) => ({ ...p, types: p.types.includes(t) ? p.types.filter((x) => x !== t) : [...p.types, t] }));

  const title = isSub
    ? edit
      ? "Sub-menyuni tahrirlash"
      : `"${parent.name_uz}" ga sub-menyu qo'shish`
    : edit
      ? 'Kategoriyani tahrirlash'
      : 'Yangi kategoriya';

  return (
    <ModalShell title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          reset();
          mutation.mutate();
        }}
        className="p-6 space-y-4 overflow-y-auto"
      >
        <FormError error={error || (fieldErrors.parent_id ?? '')} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="cat-name_uz" className="block text-sm font-medium text-gray-700 mb-1">
              Nomi (UZ) <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="cat-name_uz"
              required
              value={form.name_uz}
              onChange={(e) => setForm((p) => ({ ...p, name_uz: e.target.value }))}
              placeholder={isSub ? 'Gazli suvlar' : 'Ichimliklar'}
              aria-invalid={!!fieldErrors.name_uz}
              aria-describedby={fieldErrors.name_uz ? 'cat-name_uz-error' : undefined}
              className={inputClass}
            />
            <FieldError id="cat-name_uz-error" msg={fieldErrors.name_uz} />
          </div>
          <div>
            <label htmlFor="cat-name_ru" className="block text-sm font-medium text-gray-700 mb-1">
              Nomi (RU) <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="cat-name_ru"
              required
              value={form.name_ru}
              onChange={(e) => setForm((p) => ({ ...p, name_ru: e.target.value }))}
              placeholder={isSub ? 'Газированные напитки' : 'Напитки'}
              aria-invalid={!!fieldErrors.name_ru}
              aria-describedby={fieldErrors.name_ru ? 'cat-name_ru-error' : undefined}
              className={inputClass}
            />
            <FieldError id="cat-name_ru-error" msg={fieldErrors.name_ru} />
          </div>
        </div>

        {!isSub && (
          <div>
            <label htmlFor="cat-icon" className="block text-sm font-medium text-gray-700 mb-1">
              Belgi (ixtiyoriy)
            </label>
            <input
              id="cat-icon"
              value={form.icon}
              maxLength={16}
              onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
              aria-invalid={!!fieldErrors.icon}
              aria-describedby={fieldErrors.icon ? 'cat-icon-error' : undefined}
              className={inputClass}
            />
            <FieldError id="cat-icon-error" msg={fieldErrors.icon} />
          </div>
        )}

        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-1">Qaysi restoranlarga beriladi</legend>
          <p className="text-xs text-gray-500 mb-2">
            Yangi korxona ochilganda shu turdagi restoranga bu {isSub ? 'sub-menyu' : 'kategoriya'} taomlari bilan
            birga qo'shiladi.
          </p>
          {isSub && (
            <label className="flex items-center gap-3 min-h-11 cursor-pointer">
              <input
                type="checkbox"
                checked={form.inherit}
                onChange={(e) => setForm((p) => ({ ...p, inherit: e.target.checked }))}
                className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
              />
              <span className="text-sm text-gray-700">
                Kategoriyadagidek ({parent.types?.length ? TYPE_OPTIONS.filter((t) => parent.types?.includes(t.value)).map((t) => t.label).join(', ') : "kategoriyada tur yo'q — hech qayerga berilmaydi"})
              </span>
            </label>
          )}
          {!(isSub && form.inherit) && (
            <div className="grid grid-cols-2 gap-x-4">
              {TYPE_OPTIONS.map((t) => (
                <label key={t.value} className="flex items-center gap-3 min-h-11 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.types.includes(t.value)}
                    onChange={() => toggleType(t.value)}
                    className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-700">{t.label}</span>
                </label>
              ))}
            </div>
          )}
          <FieldError id="cat-types-error" msg={fieldErrors.types} />
        </fieldset>

        <label className="flex items-center gap-3 min-h-11 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
          />
          <span className="text-sm text-gray-700">Faol (o'chirilsa, yangi korxonalarga berilmaydi)</span>
        </label>

        <FormActions onClose={onClose} isPending={mutation.isPending} isEdit={!!edit} />
      </form>
    </ModalShell>
  );
}

// ─── Taom modali ─────────────────────────────────────────────────

function ItemModal({
  categories,
  subId,
  edit,
  onSaved,
  onClose,
}: {
  categories: CatalogTop[];
  subId: number;
  edit?: CatalogItem;
  onSaved?: (subId: number) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    catalog_category_id: String(edit?.catalog_category_id ?? subId),
    name_uz: edit?.name_uz ?? '',
    name_ru: edit?.name_ru ?? '',
    sell_type: edit?.sell_type ?? 'portion',
    price: edit ? String(Number(edit.price)) : '',
    min_weight: edit?.min_weight != null ? String(Math.max(0.5, Number(edit.min_weight))) : '0.5',
    weight_step: edit?.weight_step != null ? String(Number(edit.weight_step)) : '0.1',
    is_active: edit?.is_active ?? true,
  });
  const { error, fieldErrors, reset, handle } = useFormErrors();
  const isWeight = form.sell_type === 'weight';
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        catalog_category_id: Number(form.catalog_category_id),
        name_uz: form.name_uz.trim(),
        name_ru: form.name_ru.trim(),
        sell_type: form.sell_type,
        price: Number(form.price),
        is_active: form.is_active,
      };
      if (isWeight) {
        payload.min_weight = form.min_weight ? Number(form.min_weight) : undefined;
        payload.weight_step = form.weight_step ? Number(form.weight_step) : undefined;
      }
      const saved = edit
        ? (await api.put(`/super/catalog/items/${edit.id}`, payload)).data
        : (await api.post('/super/catalog/items', payload)).data;
      const id = saved.data.id as number;
      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        await api.post(`/super/catalog/items/${id}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else if (imageRemoved && edit?.image) {
        await api.delete(`/super/catalog/items/${id}/image`);
      }
      return saved;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      // Yangi/tahrirlangan taom ko'rinsin — uning sub-menyusi ochiladi (UI review)
      const savedSubId = res?.data?.catalog_category_id;
      if (savedSubId) onSaved?.(Number(savedSubId));
      onClose();
    },
    onError: (err) =>
      handle(err, ['catalog_category_id', 'name_uz', 'name_ru', 'sell_type', 'price', 'min_weight', 'weight_step']),
  });

  return (
    <ModalShell title={edit ? 'Taomni tahrirlash' : "Taom qo'shish"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          reset();
          mutation.mutate();
        }}
        className="p-6 space-y-4 overflow-y-auto"
      >
        <FormError error={error} />

        <ImagePicker
          current={edit?.image}
          file={imageFile}
          removed={imageRemoved}
          onFile={(f) => { setImageFile(f); if (f) setImageRemoved(false); }}
          onRemove={() => setImageRemoved(true)}
        />

        <div>
          <label htmlFor="item-category" className="block text-sm font-medium text-gray-700 mb-1">
            Sub-menyu <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <select
            id="item-category"
            required
            value={form.catalog_category_id}
            onChange={(e) => setForm((p) => ({ ...p, catalog_category_id: e.target.value }))}
            aria-invalid={!!fieldErrors.catalog_category_id}
            aria-describedby={fieldErrors.catalog_category_id ? 'item-category-error' : undefined}
            className={inputClass}
          >
            {categories.map((top) => (
              <optgroup key={top.id} label={top.name_uz}>
                {top.children.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name_uz}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <FieldError id="item-category-error" msg={fieldErrors.catalog_category_id} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="item-name_uz" className="block text-sm font-medium text-gray-700 mb-1">
              Nomi (UZ) <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="item-name_uz"
              required
              value={form.name_uz}
              onChange={(e) => setForm((p) => ({ ...p, name_uz: e.target.value }))}
              placeholder="Coca-Cola 1 l"
              aria-invalid={!!fieldErrors.name_uz}
              aria-describedby={fieldErrors.name_uz ? 'item-name_uz-error' : undefined}
              className={inputClass}
            />
            <FieldError id="item-name_uz-error" msg={fieldErrors.name_uz} />
          </div>
          <div>
            <label htmlFor="item-name_ru" className="block text-sm font-medium text-gray-700 mb-1">
              Nomi (RU) <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="item-name_ru"
              required
              value={form.name_ru}
              onChange={(e) => setForm((p) => ({ ...p, name_ru: e.target.value }))}
              placeholder="Кока-Кола 1 л"
              aria-invalid={!!fieldErrors.name_ru}
              aria-describedby={fieldErrors.name_ru ? 'item-name_ru-error' : undefined}
              className={inputClass}
            />
            <FieldError id="item-name_ru-error" msg={fieldErrors.name_ru} />
          </div>
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-1">Qanday sotiladi</legend>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ['portion', 'Porsiya', 'Dona yoki porsiya bilan'],
                ['weight', 'Vazn', "Kilogramm bilan tortib"],
              ] as const
            ).map(([value, label, hint]) => (
              <label
                key={value}
                className={`flex items-start gap-3 min-h-11 p-3 rounded-lg border cursor-pointer ${
                  form.sell_type === value ? 'border-amber-500 bg-amber-50' : 'border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="item-sell_type"
                  value={value}
                  checked={form.sell_type === value}
                  onChange={() => setForm((p) => ({ ...p, sell_type: value }))}
                  className="mt-0.5 w-4 h-4 text-amber-500 focus:ring-amber-500"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900">{label}</span>
                  <span className="block text-xs text-gray-500">{hint}</span>
                </span>
              </label>
            ))}
          </div>
          <FieldError id="item-sell_type-error" msg={fieldErrors.sell_type} />
        </fieldset>

        <div>
          <label htmlFor="item-price" className="block text-sm font-medium text-gray-700 mb-1">
            {isWeight ? "1 kg narxi (so'm)" : "Narx (so'm)"} <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <NumberInput
            id="item-price"
            required
            min="0"
            step="100"
            value={form.price}
            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
            placeholder="25000"
            aria-invalid={!!fieldErrors.price}
            aria-describedby={fieldErrors.price ? 'item-price-error' : undefined}
            className={inputClass}
          />
          <FieldError id="item-price-error" msg={fieldErrors.price} />
        </div>

        {isWeight && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="item-min_weight" className="block text-sm font-medium text-gray-700 mb-1">
                Eng kam vazn (kg)
              </label>
              <NumberInput
                id="item-min_weight"
                min="0.5"
                step="0.001"
                value={form.min_weight}
                onChange={(e) => setForm((p) => ({ ...p, min_weight: e.target.value }))}
                aria-invalid={!!fieldErrors.min_weight}
                aria-describedby={fieldErrors.min_weight ? 'item-min_weight-error' : undefined}
                className={inputClass}
              />
              <FieldError id="item-min_weight-error" msg={fieldErrors.min_weight} />
            </div>
            <div>
              <label htmlFor="item-weight_step" className="block text-sm font-medium text-gray-700 mb-1">
                Qadam (kg)
              </label>
              <NumberInput
                id="item-weight_step"
                min="0.001"
                step="0.001"
                value={form.weight_step}
                onChange={(e) => setForm((p) => ({ ...p, weight_step: e.target.value }))}
                aria-invalid={!!fieldErrors.weight_step}
                aria-describedby={fieldErrors.weight_step ? 'item-weight_step-error' : undefined}
                className={inputClass}
              />
              <FieldError id="item-weight_step-error" msg={fieldErrors.weight_step} />
            </div>
          </div>
        )}

        <label className="flex items-center gap-3 min-h-11 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
          />
          <span className="text-sm text-gray-700">Faol (o'chirilsa, yangi korxonalarga berilmaydi)</span>
        </label>

        <FormActions onClose={onClose} isPending={mutation.isPending} isEdit={!!edit} />
      </form>
    </ModalShell>
  );
}

// ─── Qo'shimcha modali ───────────────────────────────────────────

function AddonModal({
  categories,
  edit,
  onClose,
}: {
  categories: CatalogTop[];
  edit?: CatalogAddon;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name_uz: edit?.name_uz ?? '',
    name_ru: edit?.name_ru ?? '',
    price: edit ? String(Number(edit.price)) : '',
    category_ids: edit?.category_ids ?? [],
    is_active: edit?.is_active ?? true,
  });
  const { error, fieldErrors, reset, handle } = useFormErrors();

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name_uz: form.name_uz.trim(),
        name_ru: form.name_ru.trim(),
        price: Number(form.price),
        category_ids: form.category_ids,
        is_active: form.is_active,
      };
      if (edit) return (await api.put(`/super/catalog/addons/${edit.id}`, payload)).data;
      return (await api.post('/super/catalog/addons', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      onClose();
    },
    onError: (err) => handle(err, ['name_uz', 'name_ru', 'price', 'category_ids']),
  });

  const toggleSub = (id: number) =>
    setForm((p) => ({
      ...p,
      category_ids: p.category_ids.includes(id) ? p.category_ids.filter((x) => x !== id) : [...p.category_ids, id],
    }));

  return (
    <ModalShell title={edit ? "Qo'shimchani tahrirlash" : "Yangi qo'shimcha"} onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          reset();
          mutation.mutate();
        }}
        className="p-6 space-y-4 overflow-y-auto"
      >
        <FormError error={error} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="addon-name_uz" className="block text-sm font-medium text-gray-700 mb-1">
              Nomi (UZ) <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="addon-name_uz"
              required
              value={form.name_uz}
              onChange={(e) => setForm((p) => ({ ...p, name_uz: e.target.value }))}
              placeholder="Qo'shimcha go'sht"
              aria-invalid={!!fieldErrors.name_uz}
              aria-describedby={fieldErrors.name_uz ? 'addon-name_uz-error' : undefined}
              className={inputClass}
            />
            <FieldError id="addon-name_uz-error" msg={fieldErrors.name_uz} />
          </div>
          <div>
            <label htmlFor="addon-name_ru" className="block text-sm font-medium text-gray-700 mb-1">
              Nomi (RU) <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="addon-name_ru"
              required
              value={form.name_ru}
              onChange={(e) => setForm((p) => ({ ...p, name_ru: e.target.value }))}
              placeholder="Дополнительное мясо"
              aria-invalid={!!fieldErrors.name_ru}
              aria-describedby={fieldErrors.name_ru ? 'addon-name_ru-error' : undefined}
              className={inputClass}
            />
            <FieldError id="addon-name_ru-error" msg={fieldErrors.name_ru} />
          </div>
        </div>

        <div>
          <label htmlFor="addon-price" className="block text-sm font-medium text-gray-700 mb-1">
            Narx (so'm) <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <NumberInput
            id="addon-price"
            required
            min="0"
            step="100"
            value={form.price}
            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
            placeholder="5000"
            aria-invalid={!!fieldErrors.price}
            aria-describedby={fieldErrors.price ? 'addon-price-error' : undefined}
            className={inputClass}
          />
          <FieldError id="addon-price-error" msg={fieldErrors.price} />
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-1">
            Qaysi sub-menyu taomlariga qo'shiladi ({form.category_ids.length} ta tanlangan)
          </legend>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 p-3 space-y-3">
            {categories.map((top) => (
              <div key={top.id}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{top.name_uz}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  {top.children.map((sub) => (
                    <label key={sub.id} className="flex items-center gap-3 min-h-11 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.category_ids.includes(sub.id)}
                        onChange={() => toggleSub(sub.id)}
                        className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                      />
                      <span className="text-sm text-gray-700">{sub.name_uz}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <FieldError id="addon-category_ids-error" msg={fieldErrors.category_ids} />
        </fieldset>

        <label className="flex items-center gap-3 min-h-11 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
          />
          <span className="text-sm text-gray-700">Faol (o'chirilsa, yangi korxonalarga berilmaydi)</span>
        </label>

        <FormActions onClose={onClose} isPending={mutation.isPending} isEdit={!!edit} />
      </form>
    </ModalShell>
  );
}

// ─── O'chirish tasdig'i ──────────────────────────────────────────

interface DeleteTarget {
  url: string;
  title: string;
  message: string;
}

function DeleteConfirmModal({ target, onClose }: { target: DeleteTarget; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  useEscape(onClose);
  const mutation = useMutation({
    mutationFn: async () => (await api.delete(target.url)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div role="alertdialog" aria-labelledby="delete-title" className="bg-white rounded-2xl w-full max-w-sm p-6">
        <h3 id="delete-title" className="text-lg font-semibold text-gray-900 mb-2">
          {target.title}
        </h3>
        <p className="text-sm text-gray-600 mb-4">{target.message}</p>
        {error && (
          <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">{error}</div>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-11 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={() => {
              setError('');
              mutation.mutate();
            }}
            disabled={mutation.isPending}
            className="flex-1 min-h-11 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sahifa ──────────────────────────────────────────────────────

type ModalState =
  | { kind: 'category'; parent?: CatalogTop; edit?: CatalogTop | CatalogSub }
  | { kind: 'item'; subId: number; edit?: CatalogItem }
  | { kind: 'addon'; edit?: CatalogAddon }
  | null;

export default function CatalogPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery<CatalogData>({
    queryKey: QUERY_KEY,
    queryFn: async () => (await api.get('/super/catalog')).data.data,
  });

  const categories = useMemo(() => data?.categories ?? [], [data]);
  const addons = data?.addons ?? [];

  const q = search.trim().toLowerCase();

  // Qidiruvda faqat mos taomli kategoriya/sub-menyular qoladi va ular ochiq ko'rsatiladi
  const visible = useMemo(() => {
    if (!q) return categories;
    const matches = (item: CatalogItem) =>
      item.name_uz.toLowerCase().includes(q) || (item.name_ru ?? '').toLowerCase().includes(q);
    return categories
      .map((top) => ({
        ...top,
        children: top.children
          .map((sub) => ({ ...sub, items: sub.items.filter(matches) }))
          .filter((sub) => sub.items.length > 0),
      }))
      .filter((top) => top.children.length > 0);
  }, [categories, q]);

  const totals = useMemo(() => {
    const subs = categories.flatMap((c) => c.children);
    return { tops: categories.length, subs: subs.length, items: subs.reduce((n, s) => n + s.items.length, 0) };
  }, [categories]);

  const subName = useMemo(() => {
    const m = new Map<number, string>();
    categories.forEach((top) => top.children.forEach((s) => m.set(s.id, s.name_uz)));
    return m;
  }, [categories]);

  const isOpen = (key: string) => !!q || open.has(key);
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Standart menyu</h1>
          <p className="text-gray-500 text-sm mt-1">
            Yangi ochilgan korxonaga beriladigan tayyor menyu: kategoriyalar, taomlar, ichimliklar
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ kind: 'category' })}
          className="inline-flex items-center justify-center gap-2 min-h-11 bg-amber-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors"
        >
          <Plus size={18} />
          Yangi kategoriya
        </button>
      </div>

      <PageGuide id="catalog" />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-medium">Diqqat:</span> o'zgarishlar faqat <span className="font-medium">bundan keyin</span>{' '}
          ochiladigan korxonalarga beriladi. Hozir ishlayotgan korxonalarning menyusi o'zgarmaydi.
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200">
          <LoadingState label="Standart menyu yuklanmoqda..." />
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} title="Standart menyuni yuklab bo'lmadi" />
      ) : (
        <>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative w-full sm:max-w-sm">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <label htmlFor="catalog-search" className="sr-only">
                Taom qidirish
              </label>
              <input
                id="catalog-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Taom nomi bo'yicha qidirish..."
                className="w-full min-h-11 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>
            <p className="text-sm text-gray-500 tabular-nums" data-testid="catalog-totals">
              {totals.tops} kategoriya · {totals.subs} sub-menyu · {totals.items} taom
            </p>
          </div>

          {categories.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <BookMarked size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 text-sm font-medium">Standart menyu hali bo'sh</p>
              <p className="text-gray-500 text-sm mt-1">"Yangi kategoriya" tugmasi bilan birinchi kategoriyani qo'shing</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Search size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 text-sm font-medium">"{search.trim()}" nomli taom topilmadi</p>
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mt-3 min-h-11 text-sm font-medium text-amber-700 hover:text-amber-800 underline"
              >
                Qidiruvni tozalash
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((top) => {
                const topKey = `c-${top.id}`;
                const itemCount = top.children.reduce((n, s) => n + s.items.length, 0);
                return (
                  <section key={top.id} data-testid="catalog-category" className="bg-white rounded-xl border border-gray-200">
                    <div className="flex flex-wrap items-center gap-2 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => toggle(topKey)}
                        aria-expanded={isOpen(topKey)}
                        className="flex-1 min-w-0 min-h-11 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 text-left"
                      >
                        {isOpen(topKey) ? (
                          <ChevronDown size={18} className="text-gray-500 shrink-0" aria-hidden="true" />
                        ) : (
                          <ChevronRight size={18} className="text-gray-500 shrink-0" aria-hidden="true" />
                        )}
                        <span className="font-semibold text-gray-900">
                          {top.icon ? `${top.icon} ` : ''}
                          {top.name_uz}
                        </span>
                        <span className="text-sm text-gray-500">{top.name_ru}</span>
                        <TypeBadges types={top.types} />
                        {!top.is_active && <InactiveBadge />}
                        <span className="text-xs text-gray-500 tabular-nums">
                          {top.children.length} sub-menyu · {itemCount} taom
                        </span>
                      </button>
                      <div className="flex items-center">
                        <button type="button" onClick={() => setModal({ kind: 'category', parent: top })} className={linkBtn}>
                          <Plus size={16} />
                          Sub-menyu qo'shish
                        </button>
                        <button
                          type="button"
                          onClick={() => setModal({ kind: 'category', edit: top })}
                          aria-label={`${top.name_uz} kategoriyasini tahrirlash`}
                          className={iconBtn}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              url: `/super/catalog/categories/${top.id}`,
                              title: "Kategoriyani o'chirish",
                              message: `"${top.name_uz}" kategoriyasi o'chiriladi. Uning ichidagi ${top.children.length} ta sub-menyu va ${itemCount} ta taom ham birga o'chadi. Bu amalni qaytarib bo'lmaydi.`,
                            })
                          }
                          aria-label={`${top.name_uz} kategoriyasini o'chirish`}
                          className={`${iconBtn} hover:text-red-600`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {isOpen(topKey) && (
                      <div className="border-t border-gray-100 px-3 pb-3 pt-2 space-y-2">
                        {top.children.length === 0 && (
                          <p className="px-2 py-3 text-sm text-gray-500">
                            Bu kategoriyada sub-menyu yo'q. Taom qo'shish uchun avval "Sub-menyu" tugmasini bosing.
                          </p>
                        )}
                        {top.children.map((sub) => {
                          const subKey = `s-${sub.id}`;
                          const subAddons = addons.filter((a) => a.category_ids.includes(sub.id));
                          return (
                            <div key={sub.id} data-testid="catalog-sub" className="rounded-lg border border-gray-200">
                              <div className="flex flex-wrap items-center gap-2 px-1 bg-gray-50 rounded-t-lg">
                                <button
                                  type="button"
                                  onClick={() => toggle(subKey)}
                                  aria-expanded={isOpen(subKey)}
                                  className="flex-1 min-w-0 min-h-11 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 text-left"
                                >
                                  {isOpen(subKey) ? (
                                    <ChevronDown size={16} className="text-gray-500 shrink-0" aria-hidden="true" />
                                  ) : (
                                    <ChevronRight size={16} className="text-gray-500 shrink-0" aria-hidden="true" />
                                  )}
                                  <span className="font-medium text-gray-900">{sub.name_uz}</span>
                                  <span className="text-sm text-gray-500">{sub.name_ru}</span>
                                  <TypeBadges types={sub.types} inherited />
                                  {!sub.is_active && <InactiveBadge />}
                                  <span className="text-xs text-gray-500 tabular-nums">{sub.items.length} taom</span>
                                </button>
                                <div className="flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => setModal({ kind: 'item', subId: sub.id })}
                                    className={linkBtn}
                                  >
                                    <Plus size={16} />
                                    Taom qo'shish
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setModal({ kind: 'category', parent: top, edit: sub })}
                                    aria-label={`${sub.name_uz} sub-menyusini tahrirlash`}
                                    className={iconBtn}
                                  >
                                    <Pencil size={18} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteTarget({
                                        url: `/super/catalog/categories/${sub.id}`,
                                        title: "Sub-menyuni o'chirish",
                                        message: `"${sub.name_uz}" sub-menyusi o'chiriladi. Uning ichidagi ${sub.items.length} ta taom ham birga o'chadi. Bu amalni qaytarib bo'lmaydi.`,
                                      })
                                    }
                                    aria-label={`${sub.name_uz} sub-menyusini o'chirish`}
                                    className={`${iconBtn} hover:text-red-600`}
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>

                              {isOpen(subKey) && (
                                <div className="border-t border-gray-200">
                                  {subAddons.length > 0 && (
                                    <p className="px-4 py-2 text-xs text-gray-600 border-b border-gray-100">
                                      Qo'shimchalar: {subAddons.map((a) => a.name_uz).join(', ')}
                                    </p>
                                  )}
                                  {sub.items.length === 0 ? (
                                    <p className="px-4 py-3 text-sm text-gray-500">Hali taom yo'q</p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="border-b border-gray-200">
                                            <th className="text-left px-4 py-2 font-medium text-gray-600">Nomi (UZ)</th>
                                            <th className="text-left px-4 py-2 font-medium text-gray-600">Nomi (RU)</th>
                                            <th className="text-left px-4 py-2 font-medium text-gray-600">Sotilishi</th>
                                            <th className="text-right px-4 py-2 font-medium text-gray-600">Narx</th>
                                            <th className="text-right px-4 py-2 font-medium text-gray-600">
                                              <span className="sr-only">Amallar</span>
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {sub.items.map((item) => (
                                            <tr key={item.id} data-testid="catalog-item" className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                              <td className="px-4 py-1.5 font-medium text-gray-900">
                                                {item.name_uz}
                                                {!item.is_active && (
                                                  <span className="ml-2">
                                                    <InactiveBadge />
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-4 py-1.5 text-gray-600">{item.name_ru}</td>
                                              <td className="px-4 py-1.5 text-gray-600">{weightText(item)}</td>
                                              <td className="px-4 py-1.5 text-right font-medium text-gray-900 tabular-nums whitespace-nowrap">
                                                {formatMoney(item.price)}
                                                {item.sell_type === 'weight' ? '/kg' : ''}
                                              </td>
                                              <td className="px-2 py-0.5">
                                                <div className="flex justify-end">
                                                  <button
                                                    type="button"
                                                    onClick={() => setModal({ kind: 'item', subId: sub.id, edit: item })}
                                                    aria-label={`${item.name_uz} taomini tahrirlash`}
                                                    className={iconBtn}
                                                  >
                                                    <Pencil size={16} />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setDeleteTarget({
                                                        url: `/super/catalog/items/${item.id}`,
                                                        title: "Taomni o'chirish",
                                                        message: `"${item.name_uz}" standart menyudan o'chiriladi. Mavjud korxonalar menyusida u qoladi.`,
                                                      })
                                                    }
                                                    aria-label={`${item.name_uz} taomini o'chirish`}
                                                    className={`${iconBtn} hover:text-red-600`}
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
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}

          {/* Qo'shimchalar */}
          <section className="mt-8">
            <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Qo'shimchalar</h2>
                <p className="text-sm text-gray-500">
                  Taomga qo'shib sotiladigan narsalar (masalan, palovga qo'shimcha go'sht). Tanlangan sub-menyudagi
                  barcha taomlarga biriktiriladi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModal({ kind: 'addon' })}
                className="shrink-0 whitespace-nowrap inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Plus size={18} />
                Yangi qo'shimcha
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {addons.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-500">Hali qo'shimcha yo'q</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Nomi</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Narx</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Qaysi sub-menyularga</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Holati</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">
                          <span className="sr-only">Amallar</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {addons.map((addon) => (
                        <tr key={addon.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <p className="font-medium text-gray-900">{addon.name_uz}</p>
                            <p className="text-xs text-gray-500">{addon.name_ru}</p>
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-gray-900 tabular-nums whitespace-nowrap">
                            {formatMoney(addon.price)}
                          </td>
                          <td className="px-4 py-2 text-gray-600">
                            {addon.category_ids.length
                              ? addon.category_ids.map((id) => subName.get(id) ?? `#${id}`).join(', ')
                              : '—'}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                addon.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {addon.is_active ? 'Faol' : 'Nofaol'}
                            </span>
                          </td>
                          <td className="px-2 py-1">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => setModal({ kind: 'addon', edit: addon })}
                                aria-label={`${addon.name_uz} qo'shimchasini tahrirlash`}
                                className={iconBtn}
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    url: `/super/catalog/addons/${addon.id}`,
                                    title: "Qo'shimchani o'chirish",
                                    message: `"${addon.name_uz}" standart menyudan o'chiriladi. Mavjud korxonalarda u qoladi.`,
                                  })
                                }
                                aria-label={`${addon.name_uz} qo'shimchasini o'chirish`}
                                className={`${iconBtn} hover:text-red-600`}
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
          </section>
        </>
      )}

      {modal?.kind === 'category' && (
        <CategoryModal parent={modal.parent} edit={modal.edit} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'item' && (
        <ItemModal
          categories={categories}
          subId={modal.subId}
          edit={modal.edit}
          onClose={() => setModal(null)}
          onSaved={(savedSubId) => {
            const top = categories.find((t) => t.children.some((sc) => sc.id === savedSubId));
            setOpen((prev) => new Set([...prev, `c-${top?.id}`, `s-${savedSubId}`]));
          }}
        />
      )}
      {modal?.kind === 'addon' && (
        <AddonModal categories={categories} edit={modal.edit} onClose={() => setModal(null)} />
      )}
      {deleteTarget && <DeleteConfirmModal target={deleteTarget} onClose={() => setDeleteTarget(null)} />}
    </Layout>
  );
}
