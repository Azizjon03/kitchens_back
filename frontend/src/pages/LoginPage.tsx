import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type LoginAccount } from '../lib/auth';
import { Building2, ChefHat, Eye, EyeOff } from 'lucide-react';
import { apiErrorMessage } from '../lib/apiError';

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

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Tizim administratori',
  company_admin: 'Administrator',
  manager: 'Menejer',
  waiter: 'Ofitsiant',
  chef: 'Oshpaz',
  cashier: 'Kassir',
};

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, selectCompany } = useAuth();
  const navigate = useNavigate();
  const [selection, setSelection] = useState<{ accounts: LoginAccount[]; token: string } | null>(null);
  const [selectingId, setSelectingId] = useState<number | null>(null);

  const handleSelect = async (userId: number) => {
    if (!selection) return;
    setError('');
    setSelectingId(userId);
    try {
      await selectCompany(selection.token, userId);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Kirishda xatolik yuz berdi'));
      // Token muddati o'tgan bo'lsa — qaytadan parol bilan kirish kerak
      setSelection(null);
    } finally {
      setSelectingId(null);
    }
  };

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(unformatPhone(phone), password);
      if (result.status === 'select') {
        setSelection({ accounts: result.accounts, token: result.selectionToken });
        return;
      }
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Kirishda xatolik yuz berdi'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/25">
            <ChefHat size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Kitchens.uz</h1>
          <p className="text-gray-500 mt-1">Admin paneliga kirish</p>
        </div>

        {/* Restoran tanlash (#10) */}
        {selection ? (
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
            <h2 className="text-lg font-semibold text-gray-900">Qaysi restoranga kirasiz?</h2>
            <p className="text-sm text-gray-500 mt-1 mb-5">
              Bu telefon raqam bir nechta restoranda ro'yxatdan o'tgan.
            </p>
            {error && (
              <div role="alert" className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}
            <ul className="space-y-2">
              {selection.accounts.map((a) => (
                <li key={a.user_id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(a.user_id)}
                    disabled={selectingId !== null}
                    className="w-full min-h-14 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50 text-left transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Building2 size={20} className="text-gray-400 shrink-0" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block font-medium text-gray-900 truncate">{a.company?.name ?? 'Tizim'}</span>
                        <span className="block text-sm text-gray-500">{ROLE_LABELS[a.role] ?? a.role}</span>
                      </span>
                    </span>
                    <span className="text-sm text-amber-700 font-medium shrink-0">
                      {selectingId === a.user_id ? 'Kirilmoqda...' : 'Kirish'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => { setSelection(null); setError(''); }}
              className="mt-5 w-full min-h-11 text-sm text-gray-600 hover:text-gray-900"
            >
              Orqaga
            </button>
          </div>
        ) : (
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Telefon raqam
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                required
                placeholder="+998 (90) 123-45-67"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Parol
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Parolni kiriting"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all placeholder:text-gray-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Kirish...
                </span>
              ) : (
                'Kirish'
              )}
            </button>
          </form>
        </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Kitchens.uz - Oshxona boshqaruv tizimi
        </p>
      </div>
    </div>
  );
}
