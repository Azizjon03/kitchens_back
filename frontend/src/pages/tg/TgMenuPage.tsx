import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import tgApi, { tgErrorMessage, tgInit } from '../../lib/tgApi';
import { useTgCart, cartTotal, cartCount, itemCount } from '../../lib/tgCart';
import { haptic, tgThemeStyle } from '../../lib/tgTheme';
import DishImage from './DishImage';
import TgItemSheet from './TgItemSheet';
import type { Category, MenuItem } from '../../types';
import { AlertTriangle, Plus, Search, ShoppingBag, UtensilsCrossed, X } from 'lucide-react';
import { formatMoney } from '../../lib/format';
import TgOfflineBanner from './TgOfflineBanner';
import { buildMenuTree } from '../../lib/menuTree';


interface TgMenuResponse {
  company: { id: number; name: string; logo?: string; primary_color?: string };
  branches: { id: number; name: string; address?: string }[];
  menu: Category[];
}

export default function TgMenuPage() {
  const navigate = useNavigate();
  const { cart, add, addLine } = useTgCart();
  // Ikki darajali menyu (#23): kategoriya → sub-menyu → taomlar; #35 — yetkazib berish ilovasi ko'rinishi
  const [activeTop, setActiveTop] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState<MenuItem | null>(null);
  const closeSheet = useCallback(() => setSheet(null), []);

  useEffect(() => {
    tgInit();
  }, []);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<TgMenuResponse>({
    queryKey: ['tg-menu'],
    queryFn: async () => {
      const res = await tgApi.get('/menu');
      return res.data.data as TgMenuResponse;
    },
  });

  const tree = useMemo(() => buildMenuTree<MenuItem>(data?.menu ?? []), [data]);
  const theme = tgThemeStyle(data?.company?.primary_color);
  const topNode = tree.find((n) => n.category.id === activeTop) ?? tree[0];
  const needle = q.trim().toLowerCase();
  const found = useMemo(
    () => (needle ? tree.flatMap((n) => n.children.flatMap((c) => c.menu_items ?? [])).filter((i) => i.name_uz.toLowerCase().includes(needle)) : []),
    [tree, needle],
  );
  const count = cartCount(cart);
  const total = Math.round(cartTotal(cart));

  /** "+" — qo'shimchasi/istagi bo'lmagan porsiyali taom darhol savatga, aks holda oyna ochiladi */
  const quickAdd = (item: MenuItem) => {
    const needsChoice = item.sell_type === 'weight' || (item.addons?.length ?? 0) > 0 || (item.modifiers?.length ?? 0) > 0;
    if (needsChoice) {
      setSheet(item);
    } else {
      haptic();
      add(item);
    }
  };

  if (isLoading) {
    return (
      <div role="status" className="min-h-screen p-4" style={{ ...tgThemeStyle(null), background: 'var(--tg-bg)' }}>
        <div className="h-7 w-48 rounded-lg mb-5 animate-pulse" style={{ background: 'color-mix(in srgb, var(--tg-hint) 22%, transparent)' }} />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl p-2" style={{ background: 'var(--tg-card)' }}>
              <div className="aspect-square rounded-xl animate-pulse" style={{ background: 'color-mix(in srgb, var(--tg-hint) 18%, transparent)' }} />
              <div className="h-4 w-20 mt-3 rounded animate-pulse" style={{ background: 'color-mix(in srgb, var(--tg-hint) 18%, transparent)' }} />
              <div className="h-4 w-28 mt-2 mb-1 rounded animate-pulse" style={{ background: 'color-mix(in srgb, var(--tg-hint) 18%, transparent)' }} />
            </div>
          ))}
        </div>
        <span className="sr-only">Menyu yuklanmoqda...</span>
      </div>
    );
  }

  if (isError || !data) {
    const message = tgErrorMessage(error, { fallback: "Menyuni yuklab bo'lmadi." });
    const code = (error as { response?: { data?: { error?: { code?: string } } } } | null)?.response?.data?.error?.code;
    // Restoran yo'q/nofaol — qayta urinish foyda bermaydi
    const retryable = code !== 'COMPANY_NOT_FOUND' && code !== 'COMPANY_REQUIRED';
    return (
      <div className="flex items-center justify-center min-h-screen  p-6">
        <div role="alert" className="w-full max-w-sm flex flex-col items-center text-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6">
          <AlertTriangle size={36} className="text-red-500" aria-hidden="true" />
          <p className="text-red-700">{message}</p>
          {retryable && (
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="min-h-11 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-base font-medium disabled:opacity-50"
            >
              {isRefetching ? 'Qayta yuklanmoqda...' : 'Qayta urinish'}
            </button>
          )}
        </div>
      </div>
    );
  }

  const card = (item: MenuItem) => (
    <DishCard key={item.id} item={item} inCart={itemCount(cart, item.id)} onOpen={() => setSheet(item)} onAdd={() => quickAdd(item)} />
  );

  return (
    <div className="min-h-screen pb-28" style={{ ...theme, background: 'var(--tg-bg)', color: 'var(--tg-text)' }}>
      <TgOfflineBanner />
      <header className="px-4 pt-4 pb-3" style={{ background: 'var(--tg-card)' }}>
        <div className="flex items-center gap-3">
          {data.company.logo && <img src={data.company.logo} alt="" className="h-11 w-11 rounded-xl object-cover" />}
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">{data.company.name}</h1>
        </div>
        <div className="relative mt-3">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tg-hint)' }} aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Taom qidirish"
            aria-label="Taom qidirish"
            className="w-full h-11 rounded-xl pl-10 pr-10 text-[15px] outline-none focus:ring-2"
            style={{ background: 'var(--tg-bg)', color: 'var(--tg-text)', ['--tw-ring-color' as string]: 'var(--tg-accent)' }}
          />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label="Qidiruvni tozalash" className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center" style={{ color: 'var(--tg-hint)' }}>
              <X size={18} />
            </button>
          )}
        </div>
      </header>

      {!needle && tree.length > 1 && (
        <nav className="sticky top-0 z-20 border-b" style={{ background: 'var(--tg-card)', borderColor: 'color-mix(in srgb, var(--tg-hint) 15%, transparent)' }}>
          <div className="flex gap-2 px-4 py-2 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Kategoriyalar">
            {tree.map(({ category: c }) => {
              const active = topNode?.category.id === c.id;
              return (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => { setActiveTop(c.id); window.scrollTo({ top: 0 }); }}
                  className="min-h-11 px-4 rounded-full text-[15px] font-semibold whitespace-nowrap"
                  style={active ? { background: 'var(--tg-accent)', color: 'var(--tg-on-accent)' } : { background: 'var(--tg-bg)', color: 'var(--tg-text)' }}
                >
                  {c.name_uz}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <main className="px-4">
        {needle ? (
          found.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 pt-4">{found.map(card)}</div>
          ) : (
            <p className="py-12 text-center text-[15px]" style={{ color: 'var(--tg-hint)' }}>«{q}» topilmadi. Boshqacha yozib ko'ring.</p>
          )
        ) : tree.length === 0 ? (
          <div className="py-16 text-center">
            <UtensilsCrossed size={40} className="mx-auto mb-3" style={{ color: 'var(--tg-hint)' }} aria-hidden="true" />
            <p className="text-[15px]" style={{ color: 'var(--tg-hint)' }}>Menyu hozircha bo'sh</p>
          </div>
        ) : (
          topNode?.children.map((sub) => (
            <section key={sub.id} aria-labelledby={`sub-${sub.id}`} className="pt-5">
              <h2 id={`sub-${sub.id}`} className="text-lg font-bold mb-3">{sub.name_uz}</h2>
              <div className="grid grid-cols-2 gap-3">{(sub.menu_items ?? []).map(card)}</div>
            </section>
          ))
        )}
      </main>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]" style={{ background: 'linear-gradient(to top, var(--tg-bg) 70%, transparent)' }}>
          <button
            onClick={() => navigate(`/tg/cart${window.location.search}`)}
            className="w-full min-h-14 rounded-2xl px-5 flex items-center justify-between shadow-lg"
            style={{ background: 'var(--tg-accent)', color: 'var(--tg-on-accent)' }}
          >
            <span className="flex items-center gap-2.5 text-base font-semibold">
              <ShoppingBag size={20} aria-hidden="true" />
              Savat
              <span className="min-w-7 h-7 px-2 rounded-full text-sm font-bold inline-flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--tg-on-accent) 20%, transparent)' }}>{count}</span>
            </span>
            <span className="text-base font-bold tabular-nums">{formatMoney(total)}</span>
          </button>
        </div>
      )}

      {sheet && (
        <TgItemSheet
          item={sheet}
          onClose={closeSheet}
          onSubmit={(line) => { addLine(line); setSheet(null); }}
        />
      )}
    </div>
  );
}

function DishCard({ item, inCart, onOpen, onAdd }: { item: MenuItem; inCart: number; onOpen: () => void; onAdd: () => void }) {
  return (
    <article className="relative rounded-2xl p-2 flex flex-col" style={{ background: 'var(--tg-card)' }}>
      <button type="button" onClick={onOpen} className="text-left flex-1 flex flex-col" aria-label={`${item.name_uz}, ${formatMoney(Number(item.price))}${item.sell_type === 'weight' ? ' 1 kg' : ''}`}>
        <div className="aspect-square rounded-xl overflow-hidden">
          <DishImage src={item.image} name={item.name_uz} seed={item.id} />
        </div>
        <div className="px-1 pt-2">
          <div className="text-base font-bold tabular-nums">
            {formatMoney(Number(item.price))}
            {item.sell_type === 'weight' && <span className="text-sm font-medium" style={{ color: 'var(--tg-hint)' }}> / kg</span>}
          </div>
          <div className="text-[14px] leading-snug mt-0.5 line-clamp-2">{item.name_uz}</div>
        </div>
      </button>
      <button
        type="button"
        onClick={onAdd}
        aria-label={`${item.name_uz} — savatga qo'shish`}
        className="mt-2 h-11 rounded-xl flex items-center justify-center gap-1.5 text-[15px] font-semibold"
        style={inCart > 0
          ? { background: 'var(--tg-accent)', color: 'var(--tg-on-accent)' }
          : { background: 'var(--tg-bg)', color: 'var(--tg-text)' }}
      >
        <Plus size={18} aria-hidden="true" />
        {inCart > 0 ? `${inCart} ta` : "Qo'shish"}
      </button>
    </article>
  );
}
