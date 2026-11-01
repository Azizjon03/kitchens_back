import type { Table } from '../types';

/** #49: stollarni zallar bo'yicha guruhlash (zal tartibida, oxirida zalsizlar) */
export interface TableSection {
  key: string;
  name: string;
  groupId: number | null;
  allowWhole: boolean;
  whole: Table | null;
  tables: Table[];
}

const byNumber = (a: Table, b: Table) => String(a.number).localeCompare(String(b.number), 'uz', { numeric: true });

export function groupTables(tables: Table[]): TableSection[] {
  const map = new Map<string, TableSection & { sort: number }>();
  for (const t of tables) {
    const g = t.group ?? null;
    const key = g ? `g${g.id}` : 'none';
    if (!map.has(key)) {
      map.set(key, {
        key, name: g?.name ?? 'Zalsiz stollar', groupId: g?.id ?? null, allowWhole: !!g?.allow_whole,
        whole: null, tables: [], sort: g ? g.sort_order : Number.MAX_SAFE_INTEGER,
      });
    }
    const sec = map.get(key)!;
    if (t.is_whole_group) sec.whole = t;
    else sec.tables.push(t);
  }
  return [...map.values()]
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
    .map((sec) => ({ key: sec.key, name: sec.name, groupId: sec.groupId, allowWhole: sec.allowWhole, whole: sec.whole, tables: sec.tables.sort(byNumber) }));
}
