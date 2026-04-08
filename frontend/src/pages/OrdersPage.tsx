import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Order, OrderItem, Table, MenuItem, Branch, Payment } from '../types';
import Layout from '../components/Layout';
import {
  Plus,
  X,
  Eye,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Percent,
  Ban,
  ArrowRight,
  Trash2,
  ShoppingBag,
  Filter,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  preparing: { label: 'Tayyorlanmoqda', bg: 'bg-amber-100', text: 'text-amber-700' },
  ready: { label: 'Tayyor', bg: 'bg-blue-100', text: 'text-blue-700' },
  served: { label: 'Berildi', bg: 'bg-purple-100', text: 'text-purple-700' },
  paid: { label: "To'langan", bg: 'bg-green-100', text: 'text-green-700' },
  closed: { label: 'Yopilgan', bg: 'bg-gray-100', text: 'text-gray-600' },
  cancelled: { label: 'Bekor qilingan', bg: 'bg-red-100', text: 'text-red-700' },
};

const TYPE_LABELS: Record<string, string> = {
  dine_in: 'Zalda',
  takeaway: 'Olib ketish',
  delivery: 'Yetkazib berish',
};

const NEXT_STATUS: Record<string, Record<string, string>> = {
  dine_in: { preparing: 'ready', ready: 'served', served: 'paid', paid: 'closed' },
  takeaway: { preparing: 'ready', ready: 'paid', paid: 'closed' },
  delivery: { preparing: 'ready', ready: 'paid', paid: 'closed' },
};

const PAYMENT_METHODS: { value: Payment['method']; label: string }[] = [
  { value: 'cash', label: 'Naqd' },
  { value: 'card', label: 'Karta' },
  { value: 'click', label: 'Click' },
  { value: 'payme', label: 'Payme' },
];

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none';

function formatPrice(price: number) {
  return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
}

// ─── Create Order Modal ──────────────────────────────────────────

interface CartItem {
  menu_item_id: number;
  menu_item?: MenuItem;
  quantity: number;
  note?: string;
}

function CreateOrderModal({
  branches,
  onClose,
}: {
  branches: Branch[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    branch_id: branches[0]?.id ?? 0,
    table_id: '' as string | number,
    type: 'dine_in' as 'dine_in' | 'takeaway' | 'delivery',
    note: '',
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<number | ''>('');
  const [itemQty, setItemQty] = useState(1);
  const [itemNote, setItemNote] = useState('');
  const [error, setError] = useState('');

  const { data: tablesData } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => (await api.get('/tables')).data,
  });
  const tables: Table[] = tablesData?.data ?? tablesData ?? [];
  const branchTables = tables.filter((t) => t.branch_id === form.branch_id);

  const { data: menuData } = useQuery({
    queryKey: ['menu-items'],
    queryFn: async () => (await api.get('/menu-items')).data,
  });
  const menuItems: MenuItem[] = menuData?.data ?? menuData ?? [];
  const availableItems = menuItems.filter((m) => m.is_available);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        branch_id: form.branch_id,
        table_id: form.table_id || undefined,
        type: form.type,
        note: form.note || undefined,
        items: cart.map((c) => ({
          menu_item_id: c.menu_item_id,
          quantity: c.quantity,
          note: c.note || undefined,
        })),
      };
      return (await api.post('/orders', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(axiosErr.response?.data?.detail || axiosErr.response?.data?.message || 'Xatolik yuz berdi');
    },
  });

  const addToCart = () => {
    if (!selectedMenuItemId) return;
    const mi = availableItems.find((m) => m.id === selectedMenuItemId);
    if (!mi) return;
    const existing = cart.findIndex((c) => c.menu_item_id === mi.id);
    if (existing >= 0) {
      setCart((prev) =>
        prev.map((c, i) => (i === existing ? { ...c, quantity: c.quantity + itemQty } : c)),
      );
    } else {
      setCart((prev) => [...prev, { menu_item_id: mi.id, menu_item: mi, quantity: itemQty, note: itemNote || undefined }]);
    }
    setSelectedMenuItemId('');
    setItemQty(1);
    setItemNote('');
  };

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const cartTotal = cart.reduce((sum, c) => {
    const mi = availableItems.find((m) => m.id === c.menu_item_id);
    return sum + (mi?.price ?? 0) * c.quantity;
  }, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Yangi buyurtma</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (cart.length === 0) {
              setError('Kamida bitta taom qo\'shing');
              return;
            }
            mutation.mutate();
          }}
          className="p-6 space-y-4 overflow-y-auto flex-1"
        >
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filial</label>
              <select
                value={form.branch_id}
                onChange={(e) => setForm((p) => ({ ...p, branch_id: Number(e.target.value), table_id: '' }))}
                className={inputClass}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turi</label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as typeof form.type }))}
                className={inputClass}
              >
                <option value="dine_in">Zalda</option>
                <option value="takeaway">Olib ketish</option>
                <option value="delivery">Yetkazib berish</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stol (ixtiyoriy)</label>
              <select
                value={form.table_id}
                onChange={(e) => setForm((p) => ({ ...p, table_id: e.target.value ? Number(e.target.value) : '' }))}
                className={inputClass}
              >
                <option value="">Tanlanmagan</option>
                {branchTables.map((t) => (
                  <option key={t.id} value={t.id}>Stol #{t.number} ({t.seats} o'rin)</option>
                ))}
              </select>
            </div>
          </div>

          {/* Add item to cart */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-900">Taom qo'shish</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <select
                  value={selectedMenuItemId}
                  onChange={(e) => setSelectedMenuItemId(e.target.value ? Number(e.target.value) : '')}
                  className={inputClass}
                >
                  <option value="">Taom tanlang...</option>
                  {availableItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name_uz} — {formatPrice(m.price)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  type="number"
                  min={1}
                  value={itemQty}
                  onChange={(e) => setItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="Soni"
                  className={inputClass}
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={addToCart}
                  disabled={!selectedMenuItemId}
                  className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  Qo'shish
                </button>
              </div>
            </div>
            <input
              type="text"
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              placeholder="Izoh (ixtiyoriy)"
              className={inputClass}
            />
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Taom</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-600">Soni</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Summa</th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((c, idx) => {
                    const mi = availableItems.find((m) => m.id === c.menu_item_id);
                    return (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="px-4 py-2 text-gray-900">
                          {mi?.name_uz ?? `#${c.menu_item_id}`}
                          {c.note && <span className="text-gray-400 text-xs ml-1">({c.note})</span>}
                        </td>
                        <td className="px-4 py-2 text-center text-gray-700">{c.quantity}</td>
                        <td className="px-4 py-2 text-right text-gray-900">{formatPrice((mi?.price ?? 0) * c.quantity)}</td>
                        <td className="px-4 py-2">
                          <button type="button" onClick={() => removeFromCart(idx)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-2 bg-gray-50 text-right font-semibold text-gray-900">
                Jami: {formatPrice(cartTotal)}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Izoh (ixtiyoriy)</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              className={inputClass}
              rows={2}
              placeholder="Buyurtma uchun izoh..."
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
              disabled={mutation.isPending || cart.length === 0}
              className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Yaratilmoqda...' : 'Buyurtma yaratish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Payment Modal ───────────────────────────────────────────────

function PaymentModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<Payment['method']>('cash');
  const [amount, setAmount] = useState(order.total.toString());
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      return (await api.post('/payments', {
        order_id: order.id,
        method,
        amount: parseFloat(amount) || 0,
      })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
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
          <h2 className="text-lg font-semibold text-gray-900">To'lov qilish</h2>
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

          <div className="bg-amber-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600">Buyurtma summasi</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{formatPrice(order.total)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To'lov usuli</label>
            <select value={method} onChange={(e) => setMethod(e.target.value as Payment['method'])} className={inputClass}>
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm.value} value={pm.value}>{pm.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summa</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
              {mutation.isPending ? 'Saqlanmoqda...' : "To'lash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Discount Modal ──────────────────────────────────────────────

function DiscountModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(order.discount_type || 'percentage');
  const [discountValue, setDiscountValue] = useState(order.discount_value?.toString() || '');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      return (await api.post(`/orders/${order.id}/discount`, {
        discount_type: discountType,
        discount_value: parseFloat(discountValue) || 0,
      })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
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
          <h2 className="text-lg font-semibold text-gray-900">Chegirma berish</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Chegirma turi</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
              className={inputClass}
            >
              <option value="percentage">Foizda (%)</option>
              <option value="fixed">Qat'iy summa</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {discountType === 'percentage' ? 'Foiz (%)' : "Summa (so'm)"}
            </label>
            <input
              type="number"
              min={0}
              max={discountType === 'percentage' ? 100 : undefined}
              step="0.01"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className={inputClass}
              placeholder={discountType === 'percentage' ? '10' : '50000'}
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

// ─── Cancel Modal ────────────────────────────────────────────────

function CancelModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      return (await api.post(`/orders/${order.id}/cancel`, { reason })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
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
          <h2 className="text-lg font-semibold text-gray-900">Buyurtmani bekor qilish</h2>
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

          <div className="bg-red-50 rounded-lg p-4 text-sm text-red-700">
            Buyurtma #{order.id} bekor qilinadi. Bu amalni qaytarib bo'lmaydi.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sabab</label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={inputClass}
              rows={3}
              placeholder="Bekor qilish sababini kiriting..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Orqaga
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Bekor qilinmoqda...' : 'Bekor qilish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Order Detail Modal ──────────────────────────────────────────

function OrderDetailModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [error, setError] = useState('');

  const statusInfo = STATUS_MAP[order.status] ?? STATUS_MAP.preparing;
  const nextStatus = NEXT_STATUS[order.type]?.[order.status];
  const nextStatusLabel = nextStatus ? STATUS_MAP[nextStatus]?.label : null;

  const statusMutation = useMutation({
    mutationFn: async () => {
      return (await api.patch(`/orders/${order.id}/status`, { status: nextStatus })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(axiosErr.response?.data?.detail || axiosErr.response?.data?.message || 'Xatolik yuz berdi');
    },
  });

  if (showPayment) {
    return <PaymentModal order={order} onClose={() => setShowPayment(false)} />;
  }
  if (showDiscount) {
    return <DiscountModal order={order} onClose={() => setShowDiscount(false)} />;
  }
  if (showCancel) {
    return <CancelModal order={order} onClose={() => setShowCancel(false)} />;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Buyurtma #{order.id}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date(order.created_at).toLocaleString('uz-UZ')}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {/* Info row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Holat</p>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                {statusInfo.label}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Turi</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{TYPE_LABELS[order.type] ?? order.type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Stol</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {order.table ? `#${order.table.number}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Ofitsiant</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{order.user?.full_name ?? '—'}</p>
            </div>
          </div>

          {/* Note */}
          {order.note && (
            <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-800">
              <span className="font-medium">Izoh:</span> {order.note}
            </div>
          )}

          {/* Items */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Buyurtma tarkibi</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Taom</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-600">Soni</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Narxi</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.order_items ?? []).map((item: OrderItem) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="px-4 py-2 text-gray-900">
                        {item.menu_item?.name_uz ?? `#${item.menu_item_id}`}
                        {item.note && <span className="text-gray-400 text-xs ml-1">({item.note})</span>}
                      </td>
                      <td className="px-4 py-2 text-center text-gray-700">{item.quantity}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{formatPrice(item.unit_price)}</td>
                      <td className="px-4 py-2 text-right text-gray-900 font-medium">{formatPrice(item.total_price)}</td>
                    </tr>
                  ))}
                  {(!order.order_items || order.order_items.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-gray-400 text-sm">
                        Taomlar topilmadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Oraliq summa</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.service_charge_pct > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Xizmat haqi ({order.service_charge_pct}%)</span>
                <span>{formatPrice(order.service_charge_amount)}</span>
              </div>
            )}
            {order.discount_amount && order.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>
                  Chegirma
                  {order.discount_type === 'percentage' && order.discount_value
                    ? ` (${order.discount_value}%)`
                    : ''}
                </span>
                <span>-{formatPrice(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-2">
              <span>Jami</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Payments */}
          {order.payments && order.payments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">To'lovlar</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Usul</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Summa</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Qaytim</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Sana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.payments.map((p: Payment) => (
                      <tr key={p.id} className="border-b border-gray-100">
                        <td className="px-4 py-2 text-gray-900">
                          {PAYMENT_METHODS.find((pm) => pm.value === p.method)?.label ?? p.method}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-900">{formatPrice(p.amount)}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{formatPrice(p.change_amount)}</td>
                        <td className="px-4 py-2 text-gray-500 text-xs">
                          {new Date(p.paid_at).toLocaleString('uz-UZ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {order.status !== 'closed' && order.status !== 'cancelled' && (
          <div className="p-6 border-t border-gray-200 flex flex-wrap gap-2">
            {nextStatus && nextStatusLabel && (
              <button
                onClick={() => statusMutation.mutate()}
                disabled={statusMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                <ArrowRight size={16} />
                {statusMutation.isPending ? 'Saqlanmoqda...' : nextStatusLabel}
              </button>
            )}
            <button
              onClick={() => setShowPayment(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
            >
              <CreditCard size={16} />
              To'lov
            </button>
            <button
              onClick={() => setShowDiscount(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              <Percent size={16} />
              Chegirma
            </button>
            <button
              onClick={() => setShowCancel(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              <Ban size={16} />
              Bekor qilish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => (await api.get('/branches')).data,
  });
  const branches: Branch[] = branchesData?.data ?? branchesData ?? [];

  const { data, isLoading, isError } = useQuery({
    queryKey: ['orders', page, statusFilter, typeFilter, branchFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string | number> = { page };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (branchFilter) params.branch_id = branchFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      return (await api.get('/orders', { params })).data;
    },
  });

  const orders: Order[] = data?.data?.data ?? data?.data ?? [];
  const currentPage: number = data?.data?.current_page ?? 1;
  const lastPage: number = data?.data?.last_page ?? 1;
  const total: number = data?.data?.total ?? 0;

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buyurtmalar</h1>
          <p className="text-gray-500 text-sm mt-1">
            Barcha buyurtmalarni ko'rish va boshqarish
            {total > 0 && <span className="text-gray-400"> ({total} ta)</span>}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
        >
          <Plus size={18} />
          Yangi buyurtma
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filtrlar</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className={inputClass}
          >
            <option value="">Barcha holatlar</option>
            <option value="preparing">Tayyorlanmoqda</option>
            <option value="ready">Tayyor</option>
            <option value="served">Berildi</option>
            <option value="paid">To'langan</option>
            <option value="closed">Yopilgan</option>
            <option value="cancelled">Bekor qilingan</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className={inputClass}
          >
            <option value="">Barcha turlar</option>
            <option value="dine_in">Zalda</option>
            <option value="takeaway">Olib ketish</option>
            <option value="delivery">Yetkazib berish</option>
          </select>

          <select
            value={branchFilter}
            onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
            className={inputClass}
          >
            <option value="">Barcha filiallar</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            placeholder="Boshlanish sanasi"
            className={inputClass}
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            placeholder="Tugash sanasi"
            className={inputClass}
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 flex justify-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
          Buyurtmalarni yuklashda xatolik yuz berdi
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={32} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Buyurtmalar topilmadi</h2>
          <p className="text-gray-500 text-sm">
            Hozircha buyurtmalar mavjud emas yoki filtrlar bo'yicha natija topilmadi.
          </p>
        </div>
      ) : (
        <>
          {/* Orders Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">#ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Stol</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Turi</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Holat</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Jami summa</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Sana</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const st = STATUS_MAP[order.status] ?? STATUS_MAP.preparing;
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">#{order.id}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {order.table ? `#${order.table.number}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{TYPE_LABELS[order.type] ?? order.type}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {formatPrice(order.total)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(order.created_at).toLocaleString('uz-UZ')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-amber-600 hover:bg-amber-50 rounded-lg text-xs font-medium transition-colors"
                          >
                            <Eye size={14} />
                            Ko'rish
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Sahifa {currentPage} / {lastPage} (jami {total} ta)
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
        </>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateOrderModal
          branches={branches}
          onClose={() => setShowCreate(false)}
        />
      )}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </Layout>
  );
}
