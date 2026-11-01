/** #39: Mini App yetkazib berish manzili — tanlov turi va buyurtma maydonlari */
export interface SavedAddress {
  id: number;
  label: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

export type AddressChoice =
  | { mode: 'saved'; id: number }
  | { mode: 'new'; label: string; address: string; lat: number | null; lng: number | null; save: boolean };

export const emptyNewAddress = (label = 'Uy'): AddressChoice => ({ mode: 'new', label, address: '', lat: null, lng: null, save: true });

export function isAddressReady(c: AddressChoice | null): boolean {
  if (!c) return false;
  return c.mode === 'saved' || c.address.trim() !== '' || c.lat !== null;
}

/** Buyurtma so'roviga qo'shiladigan maydonlar */
export function addressPayload(c: AddressChoice): Record<string, unknown> {
  if (c.mode === 'saved') return { address_id: c.id };
  return {
    delivery_address: c.address.trim() || null,
    delivery_lat: c.lat,
    delivery_lng: c.lng,
    save_address: c.save,
    address_label: c.label.trim() || 'Manzil',
  };
}

