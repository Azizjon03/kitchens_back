import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { apiErrorMessage } from '../lib/apiError';

/**
 * Ro'yxat/ekran uchun uch holat: yuklanish, xato, bo'sh (#7).
 * Xato hech qachon bo'sh holat matni bilan ko'rsatilmaydi — "buyurtma yo'q"
 * bilan "server ishlamayapti" foydalanuvchi uchun butunlay boshqa narsa.
 */

export function LoadingState({ label = 'Yuklanmoqda...', large = false }: { label?: string; large?: boolean }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-3 text-gray-500 ${large ? 'py-24 text-xl' : 'py-12 text-sm'}`}>
      <Loader2 className={`${large ? 'w-8 h-8' : 'w-5 h-5'} animate-spin text-amber-500`} />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = "Ma'lumotni yuklab bo'lmadi",
  large = false,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  large?: boolean;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center text-center rounded-xl border border-red-200 bg-red-50 ${large ? 'py-16 px-6 gap-4' : 'py-10 px-4 gap-3'}`}
    >
      <AlertTriangle className={`${large ? 'w-12 h-12' : 'w-8 h-8'} text-red-500`} />
      <div>
        <p className={`font-semibold text-red-800 ${large ? 'text-2xl' : 'text-base'}`}>{title}</p>
        <p className={`text-red-700 mt-1 ${large ? 'text-lg' : 'text-sm'}`}>{apiErrorMessage(error)}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`inline-flex items-center gap-2 rounded-lg bg-red-600 font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${large ? 'px-6 py-3 text-lg' : 'px-4 py-2 text-sm'}`}
        >
          <RefreshCw className={large ? 'w-5 h-5' : 'w-4 h-4'} />
          Qayta urinish
        </button>
      )}
    </div>
  );
}
