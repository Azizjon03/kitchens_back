import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Home, Briefcase, MapPin, Plus, Check } from 'lucide-react';
import tgApi from '../../lib/tgApi';
import { emptyNewAddress, type AddressChoice, type SavedAddress } from '../../lib/tgAddress';

/**
 * #39: yetkazib berish manzili — saqlangan manzillardan tanlash («Uy», «Ish»…)
 * yoki shu buyurtma uchun yangi manzil (matn + joylashuv, xohlasa nom bilan saqlanadi).
 */
interface TgLocationManager {
  isInited?: boolean;
  isLocationAvailable?: boolean;
  init?: (cb?: () => void) => void;
  getLocation?: (cb: (data: { latitude: number; longitude: number } | null) => void) => void;
}

/** Telegram LocationManager (Bot API 8.0), bo'lmasa brauzer geolokatsiyasi */
function requestLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    const lm = (window as unknown as { Telegram?: { WebApp?: { LocationManager?: TgLocationManager } } }).Telegram?.WebApp?.LocationManager;
    const viaBrowser = () => {
      if (!navigator.geolocation) return reject(new Error('no-geo'));
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => reject(new Error('denied')),
        { enableHighAccuracy: true, timeout: 15000 },
      );
    };
    if (lm?.init && lm.getLocation) {
      const get = () => lm.getLocation!((d) => (d ? resolve({ lat: d.latitude, lng: d.longitude }) : viaBrowser()));
      if (lm.isInited) get();
      else lm.init(get);
      return;
    }
    viaBrowser();
  });
}

const LABEL_ICON: Record<string, typeof Home> = { Uy: Home, Ish: Briefcase };

export default function TgAddressPicker({ value, onChange }: { value: AddressChoice | null; onChange: (c: AddressChoice) => void }) {
  const { data: saved = [], isLoading } = useQuery<SavedAddress[]>({
    queryKey: ['tg-addresses'],
    queryFn: async () => (await tgApi.get('/addresses')).data.data,
  });
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  // Tanlanmagan bo'lsa: oxirgi ishlatilgan manzil, yo'q bo'lsa — yangi «Uy»
  const current: AddressChoice | null = value ?? (isLoading ? null : saved[0] ? { mode: 'saved', id: saved[0].id } : emptyNewAddress());
  const fresh = current?.mode === 'new' ? current : null;
  const setNew = (patch: Partial<Extract<AddressChoice, { mode: 'new' }>>) =>
    onChange({ ...(fresh ?? (emptyNewAddress() as Extract<AddressChoice, { mode: 'new' }>)), ...patch });

  const locate = async () => {
    setLocError('');
    setLocating(true);
    try {
      const { lat, lng } = await requestLocation();
      setNew({ lat, lng });
    } catch {
      setLocError("Joylashuvni olib bo'lmadi. Telefon sozlamalarida GPS va Telegram'ga ruxsatni yoqing yoki manzilni yozing.");
    } finally {
      setLocating(false);
    }
  };

  const chip = (active: boolean) => ({
    background: active ? 'color-mix(in srgb, var(--tg-accent) 14%, var(--tg-bg))' : 'var(--tg-bg)',
    borderColor: active ? 'var(--tg-accent)' : 'transparent',
  });

  return (
    <div className="mt-3 space-y-2" role="radiogroup" aria-label="Yetkazib berish manzili">
      {saved.map((a) => {
        const active = current?.mode === 'saved' && current.id === a.id;
        const Icon = LABEL_ICON[a.label] ?? MapPin;
        return (
          <button key={a.id} type="button" role="radio" aria-checked={active} onClick={() => onChange({ mode: 'saved', id: a.id })}
            className="w-full min-h-14 flex items-center gap-3 px-3 rounded-xl border-2 text-left" style={chip(active)}>
            <Icon size={20} aria-hidden="true" style={{ color: 'var(--tg-accent)' }} />
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-semibold">{a.label}</span>
              <span className="block text-sm truncate" style={{ color: 'var(--tg-hint)' }}>
                {a.address || (a.latitude !== null ? 'Xaritadagi nuqta' : '')}
              </span>
            </span>
            {active && <Check size={18} aria-hidden="true" style={{ color: 'var(--tg-accent)' }} />}
          </button>
        );
      })}

      <button type="button" role="radio" aria-checked={!!fresh} onClick={() => !fresh && onChange(emptyNewAddress(saved.some((a) => a.label === 'Uy') ? 'Ish' : 'Uy'))}
        className="w-full min-h-12 flex items-center gap-3 px-3 rounded-xl border-2 text-left" style={chip(!!fresh)}>
        <Plus size={20} aria-hidden="true" style={{ color: 'var(--tg-accent)' }} />
        <span className="text-[15px] font-semibold">{saved.length ? 'Boshqa manzil' : 'Manzil'}</span>
      </button>

      {fresh && (
        <div className="space-y-2 pt-1">
          <button type="button" onClick={locate} disabled={locating}
            className="w-full min-h-12 rounded-xl text-[15px] font-semibold disabled:opacity-60"
            style={{ background: fresh.lat !== null ? 'color-mix(in srgb, #15803d 14%, var(--tg-bg))' : 'var(--tg-accent)', color: fresh.lat !== null ? 'var(--tg-text)' : 'var(--tg-on-accent)' }}>
            {locating ? 'Aniqlanmoqda...' : fresh.lat !== null ? '✓ Joylashuv olindi — qayta olish' : '📍 Joylashuvimni yuborish'}
          </button>
          {locError && <p role="alert" className="text-sm text-red-600">{locError}</p>}
          <label htmlFor="tg-address" className="block text-sm font-medium">Manzil va mo'ljal</label>
          <input id="tg-address" value={fresh.address} onChange={(e) => setNew({ address: e.target.value })} maxLength={255}
            placeholder="Ko'cha, uy, qavat, mo'ljal"
            className="w-full h-12 px-3 rounded-xl text-[15px] outline-none" style={{ background: 'var(--tg-bg)', color: 'var(--tg-text)' }} />
          <label className="flex items-center gap-3 min-h-11 cursor-pointer">
            <input type="checkbox" checked={fresh.save} onChange={(e) => setNew({ save: e.target.checked })} className="w-5 h-5" style={{ accentColor: 'var(--tg-accent)' }} />
            <span className="text-[15px]">Saqlab qo'yish</span>
          </label>
          {fresh.save && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Manzil nomi">
              {['Uy', 'Ish'].map((l) => (
                <button key={l} type="button" aria-pressed={fresh.label === l} onClick={() => setNew({ label: l })}
                  className="min-h-11 px-4 rounded-full border-2 text-[15px] font-medium" style={chip(fresh.label === l)}>{l}</button>
              ))}
              <input aria-label="Boshqa nom" value={['Uy', 'Ish'].includes(fresh.label) ? '' : fresh.label} onChange={(e) => setNew({ label: e.target.value })}
                placeholder="Boshqa nom" maxLength={40}
                className="flex-1 min-w-32 h-11 px-3 rounded-full text-[15px] outline-none" style={{ background: 'var(--tg-bg)', color: 'var(--tg-text)' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
