/**
 * Ikki darajali menyu daraxti (#23): kategoriya → sub-menyu → taom.
 * API (pos/menu, tg/menu) kategoriyalarni tekis ro'yxat sifatida `parent_id` bilan qaytaradi;
 * daraxt shu yerda quriladi. Sub-menyusiz eski kategoriyalar (taomlari o'zida) ham ishlaydi:
 * ular o'zining yagona "sub-menyusi" sifatida ko'rsatiladi.
 */
export interface TreeCategory<I> {
  id: number;
  parent_id?: number | null;
  name_uz: string;
  name_ru?: string;
  icon?: string | null;
  sort_order?: number;
  menu_items?: I[];
}

export interface MenuNode<I> {
  category: TreeCategory<I>;
  /** Bo'sh bo'lmagan sub-menyular (taomi yo'qlari chiqarilgan) */
  children: TreeCategory<I>[];
}

const bySort = (a: { sort_order?: number }, b: { sort_order?: number }) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

export function buildMenuTree<I>(categories: TreeCategory<I>[]): MenuNode<I>[] {
  const tops = categories.filter((c) => !c.parent_id).sort(bySort);
  return tops
    .map((top) => {
      const subs = categories.filter((c) => c.parent_id === top.id).sort(bySort);
      const children = subs.length > 0 ? subs : [top];
      return { category: top, children: children.filter((c) => (c.menu_items?.length ?? 0) > 0) };
    })
    .filter((node) => node.children.length > 0);
}
