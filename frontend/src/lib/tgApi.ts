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
