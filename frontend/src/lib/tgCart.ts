import { useCallback, useEffect, useState } from 'react';
import type { MenuItem } from '../types';

export interface TgCartLine {
  key: string;
  item: MenuItem;
  quantity: number;
  weight_kg?: number;
  modifier_ids: number[];
  addon_ids: number[];
}

const STORAGE_KEY = 'tg_cart';
const EVENT = 'tg-cart-changed';

export function loadCart(): TgCartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TgCartLine[]) : [];
  } catch {
    return [];
  }
}

function persist(cart: TgCartLine[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event(EVENT));
}

export function clearCart() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function lineTotal(l: TgCartLine): number {
  const base =
    l.item.sell_type === 'weight'
      ? Number(l.item.price) * (l.weight_kg || 0)
      : Number(l.item.price) * l.quantity;
  const addonsList = l.item.addons ?? [];
  const addonSum = l.addon_ids.reduce(
    (s, id) => s + Number(addonsList.find((a) => a.id === id)?.price ?? 0),
    0,
  );
  return base + addonSum * l.quantity;
}

export function cartTotal(cart: TgCartLine[]): number {
  return cart.reduce((s, l) => s + lineTotal(l), 0);
}

export function cartCount(cart: TgCartLine[]): number {
  return cart.reduce((s, l) => s + l.quantity, 0);
}

/** Reactive cart state backed by localStorage and synced across components. */
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

  const add = useCallback((item: MenuItem) => {
    const next = loadCart();
    next.push({
      key: `${item.id}-${Date.now()}-${next.length}`,
      item,
      quantity: 1,
      weight_kg: item.sell_type === 'weight' ? Number(item.min_weight) || 0.3 : undefined,
      modifier_ids: [],
      addon_ids: [],
    });
    persist(next);
  }, []);

  const update = useCallback((key: string, patch: Partial<TgCartLine>) => {
    persist(loadCart().map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);

  const remove = useCallback((key: string) => {
    persist(loadCart().filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => clearCart(), []);

  return { cart, add, update, remove, clear };
}
