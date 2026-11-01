import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Building2, ChefHat } from 'lucide-react';
import { useAuth, homePathFor, type LoginAccount, type LoginResult, type TelegramChallenge } from '../lib/auth';
import { apiErrorMessage } from '../lib/apiError';
import { tgInit, tgInitData } from '../lib/tgApi';
import TelegramCodeStep from '../components/TelegramCodeStep';
import PhoneInput from '../components/PhoneInput';

const ROLE_LABELS: Record<string, string> = {
  company_admin: 'Rahbar', manager: 'Menejer', waiter: 'Ofitsiant', chef: 'Oshpaz', cashier: 'Kassir',
};

type Step =
  | { kind: 'loading' }
  | { kind: 'outside' }
  | { kind: 'error'; message: string }
  | { kind: 'password' }
  | { kind: 'code'; challenge: TelegramChallenge }
  | { kind: 'select'; accounts: LoginAccount[]; token: string };

/**
 * #37: xodimlar boti Mini App'iga kirish (kitchens.uz/tg/staff).
 * Telegram akkaunti ulangan bo'lsa — darhol rolning ish ekrani; bo'lmasa
 * bir marta telefon + parol, keyin bot shu chatga yuborgan kod.
 */
export default function StaffTgEntryPage() {
  const { loginWithTelegram, linkTelegram, selectCompany } = useAuth();
  const navigate = useNavigate();
  const initData = tgInitData();
  const [step, setStep] = useState<Step>(initData ? { kind: 'loading' } : { kind: 'outside' });
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const proceed = (r: LoginResult) => {
    if (r.status === 'ok') navigate(homePathFor(r.user.role), { replace: true });
    else if (r.status === 'select') setStep({ kind: 'select', accounts: r.accounts, token: r.selectionToken });
    else setStep({ kind: 'code', challenge: r.challenge });
  };

  useEffect(() => {
    tgInit();
    if (!initData) return;
    loginWithTelegram(initData)
      .then(proceed)
      .catch((err) => {
        const code = axios.isAxiosError(err) ? err.response?.data?.error?.code : undefined;
        if (code === 'TELEGRAM_NOT_LINKED') setStep({ kind: 'password' });
        else setStep({ kind: 'error', message: apiErrorMessage(err, "Kirib bo'lmadi. Botni yopib qayta oching.") });
      });
    // Faqat bir marta, ochilganda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setBusy(true);
    try {
      proceed(await linkTelegram(initData, phone, password));
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Kirishda xatolik'));
    } finally {
      setBusy(false);
    }
  };

  const choose = async (userId: number) => {
    if (step.kind !== 'select') return;
    setBusy(true);
    try {
      proceed(await selectCompany(step.token, userId));
    } catch (err) {
      setStep({ kind: 'error', message: apiErrorMessage(err, 'Kirishda xatolik') });
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full min-h-12 px-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-amber-500 outline-none';

  return (
    <main className="min-h-screen bg-amber-50/60 px-4 py-8">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-11 h-11 rounded-xl bg-amber-600 flex items-center justify-center" aria-hidden="true">
            <ChefHat size={24} className="text-white" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Kitchens — xodimlar</h1>
            <p className="text-sm text-gray-600">Buyurtmalar, oshxona va hisobotlar</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          {step.kind === 'loading' && (
            <p role="status" className="flex items-center gap-3 text-sm text-gray-700">
              <span className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              Kirilmoqda...
            </p>
          )}

          {step.kind === 'outside' && (
            <div className="text-sm text-gray-700 space-y-3">
              <p>Bu sahifa xodimlar boti ichida ochiladi. Telegram'da botni oching va «Ochish» ni bosing.</p>
              <a href="/login" className="inline-flex min-h-11 items-center text-amber-800 font-medium hover:underline">Brauzerda kirish</a>
            </div>
          )}

          {step.kind === 'error' && <p role="alert" className="text-sm text-red-700">{step.message}</p>}

          {step.kind === 'password' && (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Birinchi kirish</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Panelga kiradigan telefon raqam va parolingizni yozing. Bir marta kirasiz — keyingi safar bot sizni avtomatik taniydi.
                </p>
              </div>
              {formError && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>}
              <div>
                <label htmlFor="st-phone" className="block text-sm font-medium text-gray-700 mb-1">Telefon raqam</label>
                <PhoneInput id="st-phone" value={phone} onChange={setPhone} required autoComplete="tel" wrapperClassName="flex items-center w-full min-h-12 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-amber-500" className="flex-1 min-w-0 py-2 pr-4 bg-transparent text-base outline-none placeholder:text-gray-400" />
              </div>
              <div>
                <label htmlFor="st-pass" className="block text-sm font-medium text-gray-700 mb-1">Parol</label>
                <input id="st-pass" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
              </div>
              <button type="submit" disabled={busy} className="w-full min-h-12 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-lg disabled:opacity-50">
                {busy ? 'Tekshirilmoqda...' : 'Kirish'}
              </button>
              <p className="text-xs text-gray-600">Parolni bilmasangiz, restoran rahbaridan so'rang.</p>
            </form>
          )}

          {step.kind === 'code' && (
            <TelegramCodeStep challenge={step.challenge} onDone={proceed} onBack={() => setStep({ kind: 'password' })} />
          )}

          {step.kind === 'select' && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Qaysi restoranga kirasiz?</h2>
              <ul className="space-y-2">
                {step.accounts.map((a) => (
                  <li key={a.user_id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => choose(a.user_id)}
                      className="w-full min-h-14 flex items-center gap-3 px-4 rounded-xl border border-gray-200 hover:border-amber-400 text-left disabled:opacity-60"
                    >
                      <Building2 size={20} className="text-gray-500 shrink-0" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block font-medium text-gray-900 truncate">{a.company?.name ?? 'Kitchens'}</span>
                        <span className="block text-sm text-gray-600">{ROLE_LABELS[a.role] ?? a.role}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
