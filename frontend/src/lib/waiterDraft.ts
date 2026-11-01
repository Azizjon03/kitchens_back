import type { MenuItem } from '../types';

/** #43: ofitsiant qoralamasi — stol bo'yicha localStorage'da */
export interface DraftLine {
  key: string;
  item: MenuItem;
  quantity: number;
  weight_kg?: number;
  modifier_ids: number[];
  addons: Record<number, number>;
  note?: string;
}

export const draftKey = (tableId: number) => `waiter-draft:${tableId}`;

export function hasDraft(tableId: number): boolean {
  try {
    const raw = localStorage.getItem(draftKey(tableId));
    return !!raw && (JSON.parse(raw) as unknown[]).length > 0;
  } catch {
    return false;
  }
}

export function loadDraft(tableId: number): DraftLine[] {
  try {
    const raw = localStorage.getItem(draftKey(tableId));
    return raw ? (JSON.parse(raw) as DraftLine[]) : [];
  } catch {
    return [];
  }
}

