import QRCode from 'qrcode';
import api from './api';

/**
 * #44: oddiy (fiskal bo'lmagan) chek — 58/80 mm termoprinter. Brauzer orqali chop
 * etiladi: chek yashirin iframe'da quriladi va print() chaqiriladi. Ko'rinish —
 * tasdiqlangan namuna (kassa, hisob, yetkazib berish, oshxona bo'limi).
 */
export type ReceiptKind = 'payment' | 'bill' | 'delivery' | 'kitchen';

export interface ReceiptData {
  company: { name: string; address: string | null; phone: string; menu_url: string };
  order: {
    id: number; type: 'dine_in' | 'takeaway' | 'delivery'; status: string; created_at: string;
    table: string | null; seats: number | null; waiter: string | null; note: string | null;
    subtotal: number; service_charge_pct: number; service_charge_amount: number; discount_amount: number;
    delivery_fee: number; total: number;
    customer: { name: string | null; phone: string } | null;
    delivery_address: string | null; delivery_lat: number | null; delivery_lng: number | null;
  };
  items: {
    name: string; quantity: number; weight_kg: number | null; unit_price: number; total: number; note: string | null;
    station_id: number | null; station: string | null; is_table_set: boolean;
    modifiers: string[]; addons: { name: string; quantity: number; price: number }[];
  }[];
  payments: { method: string; amount: number; change: number; paid_at: string | null }[];
  cashier: string | null;
}

export interface KitchenOptions {
  /** Faqat shu bo'limlar taomlari; null — hammasi */
  stationIds?: number[] | null;
  stationName?: string | null;
}

const WIDTH_KEY = 'receipt-width';

export function receiptWidth(): 58 | 80 {
  try {
    return localStorage.getItem(WIDTH_KEY) === '58' ? 58 : 80;
  } catch {
    return 80;
  }
}

export function setReceiptWidth(w: 58 | 80) {
  try { localStorage.setItem(WIDTH_KEY, String(w)); } catch { /* xotira yo'q */ }
}

const METHODS: Record<string, string> = { cash: 'Naqd', card: 'Karta', click: 'Click', payme: 'Payme' };
const TYPES: Record<string, string> = { dine_in: 'zal', takeaway: 'olib ketish', delivery: 'yetkazib berish' };

// Matn va qo'sh tirnoqli atributlar uchun yetarli; o'zbekcha apostrof (Go'sht) o'zgarmaydi
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
// Mingliklar oddiy bo'shliq bilan (brauzer locale belgilari printerda buzilmasin)
const money = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const num = (n: number) => String(Number(n.toFixed(3)));
const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '');
const dateTime = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString('ru-RU')} ${time(iso)}`;
};
const row = (l: string, r: string, cls = '') => `<div class="row ${cls}"><span>${l}</span><span>${r}</span></div>`;
const qty = (it: ReceiptData['items'][number]) => (it.weight_kg ? `${num(it.weight_kg)} kg` : num(it.quantity));

function itemLines(d: ReceiptData, withPrices: boolean): string {
  return d.items.map((it) => {
    const base = it.weight_kg
      ? row(`${esc(it.name)} ${num(it.weight_kg)} kg`, withPrices ? money(it.unit_price * it.weight_kg) : '')
      : row(`${num(it.quantity)} × ${esc(it.name)}`, withPrices ? money(it.unit_price * it.quantity) : '');
    const addons = it.addons.map((a) => row(`+ ${esc(a.name)}${a.quantity > 1 ? ` ×${a.quantity}` : ''}`, withPrices ? money(a.price * a.quantity * (it.weight_kg ? 1 : it.quantity)) : '', 'sub')).join('');
    const mods = it.modifiers.length ? `<div class="sub small">${it.modifiers.map(esc).join(', ')}</div>` : '';
    return base + addons + mods;
  }).join('');
}

function totals(d: ReceiptData, label: string): string {
  const o = d.order;
  return [
    row('Taomlar', money(o.subtotal)),
    o.service_charge_amount > 0 ? row(`Xizmat haqi ${num(o.service_charge_pct)}%`, money(o.service_charge_amount)) : '',
    o.discount_amount > 0 ? row('Chegirma', '−' + money(o.discount_amount)) : '',
    o.delivery_fee > 0 ? row('Yetkazib berish', money(o.delivery_fee)) : '',
    '<hr class="sep2">',
    row(label, money(o.total), 'big'),
    '<hr class="sep2">',
  ].join('');
}

async function qr(text: string): Promise<string> {
  try {
    return await QRCode.toString(text, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' });
  } catch {
    return '';
  }
}

function header(d: ReceiptData, tag?: string): string {
  return `<div class="c big">${esc(d.company.name).toUpperCase()}</div>`
    + (tag ? `<div class="c"><span class="inv">${esc(tag)}</span></div>` : `${d.company.address ? `<div class="c">${esc(d.company.address)}</div>` : ''}<div class="c">${esc(d.company.phone)}</div>`)
    + '<hr class="sep">';
}

async function paymentHtml(d: ReceiptData): Promise<string> {
  const o = d.order;
  const pays = d.payments.map((p) => row(METHODS[p.method] ?? esc(p.method), money(p.amount))).join('');
  const change = d.payments.reduce((s, p) => s + p.change, 0);
  return header(d)
    + row('Chek', `#${o.id}`) + row('Sana', dateTime(d.payments.at(-1)?.paid_at ?? o.created_at))
    + (o.table ? row('Stol', `№ ${esc(o.table)} (${TYPES[o.type]})`) : row('Turi', TYPES[o.type]))
    + (o.waiter ? row('Ofitsiant', esc(o.waiter)) : '') + (d.cashier ? row('Kassir', esc(d.cashier)) : '')
    + '<hr class="sep">' + itemLines(d, true) + '<hr class="sep">'
    + totals(d, 'JAMI')
    + pays + (change > 0 ? row('Qaytim', money(change)) : '')
    + '<hr class="sep"><div class="c b">Rahmat! Yana kutib qolamiz.</div>'
    + `<div class="qr">${await qr(d.company.menu_url)}</div><p class="c small">Menyu: ${esc(d.company.menu_url.replace(/^https?:\/\//, ''))}</p>`
    + '<p class="c small">Fiskal chek emas</p>';
}

function billHtml(d: ReceiptData): string {
  const o = d.order;
  return header(d, 'HISOB')
    + row('Buyurtma', `#${o.id}`)
    + (o.table ? row('Stol', `№ ${esc(o.table)}${o.seats ? `, ${o.seats} kishi` : ''}`) : row('Turi', TYPES[o.type]))
    + row('Ochilgan', time(o.created_at)) + (o.waiter ? row('Ofitsiant', esc(o.waiter)) : '')
    + '<hr class="sep">' + row('Taom', 'Summa', 'b') + itemLines(d, true) + '<hr class="sep">'
    + totals(d, "TO'LASH")
    + '<p class="c small">Naqd, karta, Click yoki Payme</p><p class="c small">Bu to\'lov cheki emas</p>';
}

async function deliveryHtml(d: ReceiptData): Promise<string> {
  const o = d.order;
  const map = o.delivery_lat !== null && o.delivery_lng !== null
    ? `https://yandex.uz/maps/?pt=${o.delivery_lng},${o.delivery_lat}&z=17&l=map`
    : o.delivery_address ? `https://yandex.uz/maps/?text=${encodeURIComponent(o.delivery_address)}` : null;
  return header(d, o.type === 'delivery' ? 'YETKAZIB BERISH' : 'OLIB KETISH')
    + row('Buyurtma', `#${o.id} · Telegram`) + row('Qabul', time(o.created_at))
    + '<hr class="sep">'
    + (o.customer ? `<div class="b">${esc(o.customer.name ?? 'Mijoz')}</div><div class="b">${esc(o.customer.phone)}</div>` : '')
    + (o.delivery_address ? `<div>${esc(o.delivery_address)}</div>` : '')
    + (o.note ? `<div class="note">${esc(o.note)}</div>` : '')
    + (map ? `<div class="qr">${await qr(map)}</div><p class="c small">Xaritada ochish uchun skanerlang</p>` : '')
    + '<hr class="sep">' + itemLines(d, true) + '<hr class="sep">'
    + totals(d, o.type === 'delivery' ? 'OLINADI' : "TO'LASH")
    + '<p class="c small">Fiskal chek emas</p>';
}

function kitchenHtml(d: ReceiptData, opts: KitchenOptions): string {
  const o = d.order;
  const mine = d.items.filter((it) => !it.is_table_set && (!opts.stationIds || opts.stationIds.includes(it.station_id ?? -1)));
  const others = [...new Set(d.items.filter((it) => !it.is_table_set && !mine.includes(it)).map((it) => it.station ?? "Bo'limsiz"))];
  const tag = opts.stationName ?? (opts.stationIds ? null : 'OSHXONA');
  const where = o.table ? `STOL ${esc(o.table)}` : o.type === 'delivery' ? 'YETKAZISH' : 'OLIB KETISH';
  return (tag ? `<div class="c"><span class="inv">${esc(tag).toUpperCase()}</span></div>` : '')
    + `<div class="c huge">${where}</div>`
    + row(`#${o.id}${o.waiter ? ` · ${esc(o.waiter)}` : ''}`, time(o.created_at))
    + '<hr class="sep2">'
    + mine.map((it) => `<div class="item">${qty(it)} × ${esc(it.name)}</div>`
      + it.addons.map((a) => `<div class="mod">+ ${esc(a.name)}${a.quantity > 1 ? ` ×${a.quantity}` : ''}</div>`).join('')
      + it.modifiers.map((m) => `<div class="mod">${esc(m)}</div>`).join('')
      + (it.note ? `<div class="note">Izoh: ${esc(it.note)}</div>` : '')).join('<hr class="sep">')
    + (o.note ? `<div class="note">Izoh: ${esc(o.note)}</div>` : '')
    + '<hr class="sep2">'
    + (others.length ? `<p class="small">Boshqa bo'limlar: ${others.map(esc).join(', ')}</p>` : '');
}

function css(width: 58 | 80): string {
  const paper = width === 58 ? '58mm' : '80mm';
  // Termoprinter ingichka va kulrangni xira chiqaradi: yirik, qalin, toza qora
  const font = width === 58 ? '13px' : '15px';
  return `@page{size:${paper} auto;margin:0}
*{box-sizing:border-box}
body{margin:0;width:${paper};padding:${width === 58 ? '2mm 2mm 6mm' : '3mm 3mm 8mm'};font:700 ${font}/1.35 Arial,"Helvetica Neue",Helvetica,sans-serif;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact;-webkit-font-smoothing:none}
.c{text-align:center}.b{font-weight:800}.big{font-size:1.45em;font-weight:800;line-height:1.2}
.huge{font-size:2.4em;font-weight:800;line-height:1.05}
.sep{border:0;border-top:2px dashed #000;margin:6px 0}.sep2{border:0;border-top:3px solid #000;margin:6px 0}
.row{display:flex;justify-content:space-between;gap:6px;font-variant-numeric:tabular-nums}
.row>:last-child{text-align:right;white-space:nowrap}.sub{padding-left:1.5ch}.small{font-size:.9em;margin:0}
.inv{background:#000;color:#fff;padding:2px 6px;display:inline-block;font-weight:800}
.mod{font-weight:800;font-size:1.25em;text-transform:uppercase}.item{font-size:1.4em;font-weight:800;line-height:1.25}
.note{border:2px solid #000;padding:4px 6px;margin-top:6px}
.qr{width:28mm;margin:6px auto 2px}.qr svg{width:100%;height:auto;display:block}
p{margin:0}`;
}

/** Chekni HTML ko'rinishida quradi (test va ko'rib chiqish uchun ham) */
export async function buildReceiptHtml(kind: ReceiptKind, d: ReceiptData, opts: KitchenOptions = {}, width = receiptWidth()): Promise<string> {
  const body = kind === 'payment' ? await paymentHtml(d)
    : kind === 'bill' ? billHtml(d)
      : kind === 'delivery' ? await deliveryHtml(d)
        : kitchenHtml(d, opts);
  return `<!DOCTYPE html><html lang="uz"><head><meta charset="utf-8"><title>Chek #${d.order.id}</title><style>${css(width)}</style></head><body>${body}</body></html>`;
}

/** Yashirin iframe orqali chop etish */
function printHtml(html: string): Promise<void> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();
    const done = () => { setTimeout(() => frame.remove(), 1000); resolve(); };
    setTimeout(() => {
      try {
        frame.contentWindow!.focus();
        frame.contentWindow!.print();
      } finally {
        done();
      }
    }, 150);
  });
}

export async function printReceipt(orderId: number, kind: ReceiptKind, opts: KitchenOptions = {}): Promise<void> {
  const data = (await api.get(`/orders/${orderId}/receipt`)).data.data as ReceiptData;
  // e2e va ko'rib chiqish uchun: oxirgi chek
  (window as unknown as { __lastReceipt?: string }).__lastReceipt = await buildReceiptHtml(kind, data, opts);
  await printHtml((window as unknown as { __lastReceipt: string }).__lastReceipt);
}
