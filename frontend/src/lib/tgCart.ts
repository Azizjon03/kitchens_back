import { useCallback, useEffect, useState } from 'react';
import type { MenuItem } from '../types';
import { tgCompanySlug } from './tgApi';

export interface TgCartLine {
  key: string;
  item: MenuItem;
  quantity: number;
  weight_kg?: number;
  modifier_ids: number[];
  /** #35: qo'shimcha id → son (oshga 2× go'sht) */
  addons: Record<number, number>;
}

/** Eski savat (addon_ids) — yangi formatga: har biri 1 ta */
function migrate(l: TgCartLine & { addon_ids?: number[] }): TgCartLine {
  if (l.addons) return l;
  const addons: Record<number, number> = {};
  (l.addon_ids ?? []).forEach((id) => (addons[id] = 1));
  return { ...l, addons };
}

/** Bir xil taom + bir xil tanlov → bitta qator (soni oshadi) */
function sameConfig(a: TgCartLine, b: Omit<TgCartLine, 'key'>): boolean {
  if (a.item.id !== b.item.id || a.item.sell_type === 'weight') return false;
  const norm = (r: Record<number, number>) => JSON.stringify(Object.entries(r).filter(([, q]) => q > 0).sort());
  return norm(a.addons) === norm(b.addons) && [...a.modifier_ids].sort().join() === [...b.modifier_ids].sort().join();
}

/** Qatordagi qo'shimchalar matni: "Go'sht ×2, Limon" */
export function addonSummary(l: TgCartLine): string {
  const list = l.item.addons ?? [];
  return Object.entries(l.addons)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => {
      const a = list.find((x) => x.id === Number(id));
      return a ? (q > 1 ? `${a.name_uz} ×${q}` : a.name_uz) : null;
    })
    .filter(Boolean)
    .join(', ');
}

const STORAGE_PREFIX = 'tg_cart';
// Pre-fix storage key, shared by every company's Mini App (same origin: FRONTEND_URL/tg).
// Kept only so we can wipe it once below — a cart under this key could belong to any company.
const LEGACY_STORAGE_KEY = 'tg_cart';
const EVENT = 'tg-cart-changed';

/** Company-scoped storage key so carts never leak between companies sharing this origin. */
function storageKey(): string {
  const slug = tgCompanySlug();
  return `${STORAGE_PREFIX}:${slug || '_unknown'}`;
}

// One-time cleanup: drop the old company-agnostic cart so nobody keeps seeing
// a stale cart that may belong to a different company (wrong items, wrong prices).
try {
  if (localStorage.getItem(LEGACY_STORAGE_KEY) !== null) {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
} catch {
  /* localStorage unavailable (private mode / blocked storage) — nothing to clean up */
}

export function loadCart(): TgCartLine[] {
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? (JSON.parse(raw) as TgCartLine[]).map(migrate) : [];
  } catch {
    return [];
  }
}

function persist(cart: TgCartLine[]) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(cart));
  } catch {
    /* storage blocked (private mode / quota) — page keeps working, just won't persist */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function clearCart() {
  try {
    localStorage.removeItem(storageKey());
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function lineTotal(l: TgCartLine): number {
  const base =
    l.item.sell_type === 'weight'
      ? Number(l.item.price) * (l.weight_kg || 0)
      : Number(l.item.price) * l.quantity;
  return base + addonUnitTotal(l.item, l.addons) * (l.item.sell_type === 'weight' ? 1 : l.quantity);
}

/** Bir porsiyaga qo'shimchalar narxi */
export function addonUnitTotal(item: MenuItem, addons: Record<number, number>): number {
  const list = item.addons ?? [];
  return Object.entries(addons).reduce((s, [id, q]) => s + Number(list.find((a) => a.id === Number(id))?.price ?? 0) * q, 0);
}

export function cartTotal(cart: TgCartLine[]): number {
  return cart.reduce((s, l) => s + lineTotal(l), 0);
}

export function cartCount(cart: TgCartLine[]): number {
  return cart.reduce((s, l) => s + (l.item.sell_type === 'weight' ? 1 : l.quantity), 0);
}

/** Taom savatda nechta (kartochkadagi belgi uchun) */
export function itemCount(cart: TgCartLine[], itemId: number): number {
  return cart.filter((l) => l.item.id === itemId).reduce((s, l) => s + (l.item.sell_type === 'weight' ? 1 : l.quantity), 0);
}

/** Reactive cart state backed by localStorage and synced across components. */
/** Vaznli taomning minimal (va savatga qo'shilgandagi boshlang'ich) vazni — yagona manba. */
export function minWeightKg(item: Pick<MenuItem, 'min_weight'>): number {
  return Number(item.min_weight) || 0.1;
}

export function useTgCart() {
  const [cart, setCart] = useState<TgCartLine[]>(() => loadCart());

  useEffect(() => {
    const sync = () => setCart(loadCart());
    window.addEventListener('tg-cart-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('tg-cart-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  /** Taom oynasidan — tanlangan qo'shimchalar bilan; bir xil tanlov bo'lsa soni qo'shiladi */
  const addLine = useCallback((line: Omit<TgCartLine, 'key'>) => {
    const next = loadCart();
    const same = next.find((l) => sameConfig(l, line));
    if (same) same.quantity = Math.round((same.quantity + line.quantity) * 100) / 100;
    else next.push({ ...line, key: `${line.item.id}-${Date.now()}-${next.length}` });
    persist(next);
  }, []);

  /** Tez qo'shish (kartochkadagi "+") — qo'shimchasiz */
  const add = useCallback((item: MenuItem) => {
    addLine({ item, quantity: 1, weight_kg: item.sell_type === 'weight' ? minWeightKg(item) : undefined, modifier_ids: [], addons: {} });
  }, [addLine]);

  const update = useCallback((key: string, patch: Partial<TgCartLine>) => {
    persist(loadCart().map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);

  const remove = useCallback((key: string) => {
    persist(loadCart().filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => clearCart(), []);

  return { cart, add, addLine, update, remove, clear };
}
