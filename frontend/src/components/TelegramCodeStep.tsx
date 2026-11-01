import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { useAuth, type LoginResult, type TelegramChallenge } from '../lib/auth';
import { apiErrorMessage } from '../lib/apiError';

/**
 * #37: birinchi kirishda Telegram orqali tasdiqlash.
 * Veb: «Telegram'da kod olish» rasmiy botni ochadi, bot kod yuboradi.
 * Mini App: kod allaqachon shu chatga yuborilgan (codeSent).
 */
export default function TelegramCodeStep({
  challenge,
  onDone,
  onBack,
}: {
  challenge: TelegramChallenge;
  onDone: (result: LoginResult) => void;
  onBack: () => void;
}) {
  const { verifyTelegram } = useAuth();
  const [code, setCode] = useState('');
  const [opened, setOpened] = useState(challenge.codeSent);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      onDone(await verifyTelegram(challenge.nonce, code));
    } catch (err) {
      setError(apiErrorMessage(err, 'Tasdiqlashda xatolik'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Telegram orqali tasdiqlang</h2>
      <p className="text-sm text-gray-600 mt-1 mb-5">
        {challenge.codeSent
          ? 'Bu birinchi kirishingiz. Tasdiqlash kodi shu Telegram chatiga yuborildi.'
          : "Bu birinchi kirishingiz. Rasmiy Kitchens botini oching — u sizga 6 raqamli kod yuboradi. Keyingi safar kod so'ralmaydi."}
      </p>

      {!challenge.codeSent && challenge.botUrl && (
        <a
          href={challenge.botUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => setOpened(true)}
          className="w-full min-h-12 mb-4 inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm"
        >
          <Send size={18} aria-hidden="true" /> Telegram'da kod olish
        </a>
      )}

      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">{error}</div>
        )}
        <div>
          <label htmlFor="tg-code" className="block text-sm font-medium text-gray-700 mb-1.5">Kod</label>
          <input
            id="tg-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            // "123 456" kabi nusxalangan kod ham qabul qilinadi
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            autoFocus={opened}
            className="w-full min-h-12 px-4 border border-gray-300 rounded-lg text-xl tracking-[0.4em] text-center font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full min-h-11 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-lg text-sm disabled:opacity-50"
        >
          {loading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
        </button>
      </form>
      <button type="button" onClick={onBack} className="mt-4 w-full min-h-11 text-sm text-gray-600 hover:text-gray-900">
        Orqaga
      </button>
    </div>
  );
}
