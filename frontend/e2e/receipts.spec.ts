import { test, expect, type Page } from '@playwright/test';

/** #44: chek — hisob (ofitsiant) va oshxona bo'limi qog'ozi. API mock, print() o'chirilgan. */
const RECEIPT = {
  company: { name: 'Oliyaviy restoran', address: 'Chust, Navoiy 5', phone: '+998 (69) 123-45-67', menu_url: 'https://kitchens.uz/r/oliyaviy' },
  order: {
    id: 1284, type: 'dine_in', status: 'served', created_at: '2026-11-02T08:58:00Z', table: '5', seats: 4, waiter: 'Dilshod', note: null,
    subtotal: 169000, service_charge_pct: 10, service_charge_amount: 16900, discount_amount: 0, delivery_fee: 0, total: 185900,
    customer: null, delivery_address: null, delivery_lat: null, delivery_lng: null,
  },
  items: [
    { name: "Osh (to'y oshi)", quantity: 1, weight_kg: null, unit_price: 45000, total: 69000, note: 'achchiq qilmang', station_id: 2, station: 'Oshxona ichi', is_table_set: false, modifiers: ['Piyozsiz'], addons: [{ name: "Go'sht", quantity: 2, price: 12000 }] },
    { name: 'Jaz kabob', quantity: 4, weight_kg: null, unit_price: 18000, total: 72000, note: null, station_id: 1, station: 'Kabob', is_table_set: false, modifiers: [], addons: [] },
    { name: 'Non', quantity: 2, weight_kg: null, unit_price: 4000, total: 8000, note: null, station_id: 1, station: 'Kabob', is_table_set: false, modifiers: [], addons: [] },
  ],
  payments: [], cashier: null,
};

async function setup(page: Page, user: Record<string, unknown>) {
  await page.addInitScript((u) => {
    localStorage.setItem('access_token', 't');
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('receipt-width', '80');
    // Haqiqiy print oynasi ochilmasin
    HTMLIFrameElement.prototype.focus = () => {};
    const orig = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow')!;
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      get() { const w = orig.get!.call(this); if (w) w.print = () => { (window as unknown as { __printed: number }).__printed = ((window as unknown as { __printed?: number }).__printed ?? 0) + 1; }; return w; },
    });
  }, user);
  await page.route('**/api/v1/**', (r) => r.fulfill({ json: { success: true, data: [] } }));
  await page.route('**/api/broadcasting/auth', (r) => r.fulfill({ status: 403, body: '' }));
  await page.route('**/api/v1/auth/me', (r) => r.fulfill({ json: { success: true, data: user } }));
  await page.route('**/api/v1/orders/1284/receipt', (r) => r.fulfill({ json: { success: true, data: RECEIPT } }));
}

const lastReceipt = (page: Page) => page.evaluate(() => (window as unknown as { __lastReceipt?: string }).__lastReceipt ?? '');

test('ofitsiant hisob chiqaradi: taomlar, qo\'shimcha soni, xizmat haqi, jami', async ({ page }) => {
  const waiter = { id: 31, name: 'Dilshod', role: 'waiter', is_active: true, company_id: 1, branch_id: 7 };
  await setup(page, waiter);
  await page.route('**/api/v1/branches', (r) => r.fulfill({ json: { success: true, data: [{ id: 7, name: 'Asosiy' }] } }));
  await page.route('**/api/v1/orders?*', (r) => r.fulfill({ json: { success: true, data: [
    { id: 1284, status: 'served', type: 'dine_in', total: 185900, user_id: 31, created_at: RECEIPT.order.created_at, table: { id: 3, number: '5' }, order_items: [] },
  ] } }));

  await page.goto('/waiter');
  await page.getByRole('button', { name: 'Hisob chiqarish' }).click();
  await expect.poll(() => lastReceipt(page)).toContain('HISOB');
  const html = await lastReceipt(page);
  expect(html).toContain('OLIYAVIY RESTORAN');
  expect(html).toContain("+ Go'sht ×2");
  expect(html).toContain('24 000'); // 2 × 12 000
  expect(html).toContain('Xizmat haqi 10%');
  expect(html).toContain('185 900');
  expect(html).toContain('size:80mm auto');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __printed?: number }).__printed ?? 0)).toBe(1);
});

test('oshxona: Kabob bo\'limi qog\'ozida faqat o\'z taomlari, narxsiz', async ({ page }) => {
  const chef = { id: 21, name: 'Kabobchi', role: 'chef', is_active: true, company_id: 1, branch_id: 7 };
  await setup(page, chef);
  await page.route('**/api/v1/branches', (r) => r.fulfill({ json: { success: true, data: [{ id: 7, name: 'Asosiy' }] } }));
  await page.route('**/api/v1/kitchen-stations', (r) => r.fulfill({ json: { success: true, data: [
    { id: 1, name: 'Kabob', is_active: true, users: [{ id: 21, name: 'Kabobchi' }], categories: [] },
    { id: 2, name: 'Oshxona ichi', is_active: true, users: [], categories: [] },
  ] } }));
  await page.route('**/api/v1/orders?*', (r) => r.fulfill({ json: { success: true, data: [{
    id: 1284, company_id: 1, branch_id: 7, type: 'dine_in', status: 'preparing', created_at: new Date().toISOString(), table: { id: 3, number: 5 },
    order_items: [
      { id: 1, quantity: 4, is_table_set: false, kitchen_station_id: 1, ready_at: null, menu_item: { name_uz: 'Jaz kabob' }, modifiers: [], addons: [] },
      { id: 2, quantity: 1, is_table_set: false, kitchen_station_id: 2, ready_at: null, menu_item: { name_uz: 'Osh' }, modifiers: [], addons: [] },
    ],
  }] } }));

  await page.goto('/kitchen');
  await page.getByRole('button', { name: 'Chop etish' }).click();
  await expect.poll(() => lastReceipt(page)).toContain('STOL 5');
  const html = await lastReceipt(page);
  expect(html).toContain('KABOB');
  expect(html).toContain('4 × Jaz kabob');
  expect(html).toContain('2 × Non');
  expect(html).not.toContain("Osh (to'y oshi)");
  expect(html).not.toContain('72 000');
  expect(html).toContain("Boshqa bo'limlar: Oshxona ichi");
});
