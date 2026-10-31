import { useEffect } from 'react';
import type { CSSProperties } from 'react';

/**
 * #35: Mini App Telegram mavzusiga moslashadi (yorug'/qorong'i) va restoran
 * rangidan foydalanadi. Telegram'dan tashqarida (brauzerda) — yorug' zaxira.
 */
interface TgWebApp {
  colorScheme?: 'light' | 'dark';
  themeParams?: Record<string, string | undefined>;
  HapticFeedback?: { impactOccurred?: (s: 'light' | 'medium') => void; notificationOccurred?: (s: 'success' | 'error') => void };
  BackButton?: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void };
}

function wa(): TgWebApp | undefined {
  return (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
}

/** Rang ustidagi matn: yorqin rangda qora, to'q rangda oq (WCAG nisbiy yorqinlik) */
export function readableOn(hex: string): string {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return '#ffffff';
  const lin = (v: string) => {
    const c = parseInt(v, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin(m[1]) + 0.7152 * lin(m[2]) + 0.0722 * lin(m[3]);
  // Oq matn kontrasti (1.05/(L+0.05)) 4.5 dan past bo'lsa — qora
  return 1.05 / (L + 0.05) >= 4.5 ? '#ffffff' : '#1c1917';
}

/** CSS o'zgaruvchilari: --tg-bg, --tg-text, --tg-hint, --tg-card, --tg-accent, --tg-on-accent */
export function tgThemeStyle(accent?: string | null): CSSProperties {
  const p = wa()?.themeParams ?? {};
  const dark = wa()?.colorScheme === 'dark';
  const brand = accent && /^#[0-9a-f]{6}$/i.test(accent) ? accent : '#b45309';
  return {
    '--tg-bg': p.secondary_bg_color ?? (dark ? '#17181c' : '#f4f4f2'),
    '--tg-card': p.bg_color ?? (dark ? '#212227' : '#ffffff'),
    '--tg-text': p.text_color ?? (dark ? '#f5f5f4' : '#1c1917'),
    '--tg-hint': p.hint_color ?? (dark ? '#a8a29e' : '#6b6560'),
    '--tg-accent': brand,
    '--tg-on-accent': readableOn(brand),
  } as CSSProperties;
}

export function haptic(kind: 'add' | 'success' | 'error' = 'add') {
  try {
    const h = wa()?.HapticFeedback;
    if (kind === 'add') h?.impactOccurred?.('light');
    else h?.notificationOccurred?.(kind);
  } catch {
    /* Telegram'dan tashqarida */
  }
}

/** Telegram'ning tizim "Orqaga" tugmasi (oyna ochiq bo'lganda yopadi) */
export function useTgBackButton(active: boolean, onBack: () => void) {
  useEffect(() => {
    const bb = wa()?.BackButton;
    if (!bb || !active) return;
    bb.show();
    bb.onClick(onBack);
    return () => {
      bb.offClick(onBack);
      bb.hide();
    };
  }, [active, onBack]);
}
