import axios from 'axios';

// Minimal typing for the Telegram WebApp global injected inside Telegram.
interface TelegramWebApp {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
  themeParams?: Record<string, string>;
}

function webApp(): TelegramWebApp | undefined {
  return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
}

/** Company slug from the launch URL: /tg?company=slug */
export function tgCompanySlug(): string {
  return new URLSearchParams(window.location.search).get('company') ?? '';
}

/** Optional table id from a QR deep link: /tg?company=slug&table=ID */
export function tgTableId(): number | null {
  const raw = new URLSearchParams(window.location.search).get('table');
  return raw ? Number(raw) : null;
}

/** Initialise the Telegram WebApp viewport (safe outside Telegram). */
export function tgInit() {
  try {
    const wa = webApp();
    wa?.ready?.();
    wa?.expand?.();
  } catch {
    /* not running inside Telegram */
  }
}

const tgApi = axios.create({
  baseURL: '/api/v1/tg',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

tgApi.interceptors.request.use((config) => {
  // Company slug travels as a query param on every request.
  config.params = { ...(config.params ?? {}), company: tgCompanySlug() };

  const initData = webApp()?.initData;
  if (initData) {
    config.headers['X-Telegram-Init-Data'] = initData;
  } else if (import.meta.env.DEV) {
    // Dev-only: lets the Mini App be tested in a normal browser.
    const devId = new URLSearchParams(window.location.search).get('dev_id') ?? '999000999';
    config.headers['X-Telegram-Dev-Id'] = devId;
  }

  return config;
});

export default tgApi;

interface TgApiErrorShape {
  response?: {
    status?: number;
    data?: { success?: boolean; error?: { code?: string; message?: string }; message?: string };
  };
}

// Human-readable messages for the error codes returned by ValidateTelegramInitData
// and other `v1/tg/*` endpoints ({success: false, error: {code, message}}).
const TG_ERROR_MESSAGES: Record<string, string> = {
  COMPANY_REQUIRED: "Kompaniya ko'rsatilmagan. Iltimos, restoran botidagi havola orqali qayta kiring.",
  COMPANY_NOT_FOUND: 'Bunday restoran topilmadi yoki u hozircha faol emas.',
  BOT_NOT_CONFIGURED: "Bu restoran uchun Telegram bot hali sozlanmagan. Administratorga murojaat qiling.",
  INIT_DATA_REQUIRED: 'Iltimos, ilovani Telegram orqali oching.',
  INVALID_INIT_DATA: "Telegram orqali tasdiqlashda xatolik yuz berdi. Ilovani qaytadan oching.",
};

/**
 * Turn an axios error from a `v1/tg/*` request into a user-facing Uzbek
 * message. Recognises the backend's known error codes; falls back to the
 * server-provided message, then to `opts.notFound` for a bare 404, then to
 * `opts.fallback`.
 */
export function tgErrorMessage(
  err: unknown,
  opts?: { fallback?: string; notFound?: string },
): string {
  const axiosErr = err as TgApiErrorShape | undefined;
  const code = axiosErr?.response?.data?.error?.code;
  if (code && TG_ERROR_MESSAGES[code]) return TG_ERROR_MESSAGES[code];

  if (axiosErr?.response?.status === 404 && opts?.notFound) return opts.notFound;

  return (
    axiosErr?.response?.data?.error?.message ||
    axiosErr?.response?.data?.message ||
    opts?.fallback ||
    "Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring."
  );
}
