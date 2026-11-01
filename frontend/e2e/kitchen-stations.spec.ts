import { test, expect } from '@playwright/test';

/**
 * #40: oshxona bo'limlari — oshpaz faqat o'z bo'limi taomlarini ko'radi va o'z qismini
 * «Tayyor» qiladi. API mock qilinadi.
 */
const CHEF = { id: 21, name: 'Kabobchi', role: 'chef', is_active: true, company_id: 1, branch_id: 7 };
const STATIONS = [
  { id: 1, name: 'Kabob', is_active: true, users: [{ id: 21, name: 'Kabobchi' }], categories: [] },
  { id: 2, name: 'Oshxona ichi', is_active: true, users: [], categories: [] },
];
const item = (id: number, name: string, station: number, ready: string | null = null) => ({
  id, quantity: 1, is_table_set: false, kitchen_station_id: station, ready_at: ready, menu_item: { name_uz: name }, modifiers: [], addons: [],
});
const ORDER = {
  id: 501, company_id: 1, branch_id: 7, type: 'dine_in', status: 'preparing', created_at: new Date().toISOString(),
  table: { id: 3, number: 3 }, order_items: [item(1, 'Jaz kabob', 1), item(2, 'Osh', 2)],
};

test('oshpaz faqat o\'z bo\'limini ko\'radi va o\'z qismini tayyor qiladi', async ({ page }) => {
  let readyBody: unknown = null;
  await page.addInitScript((u) => {
    localStorage.setItem('access_token', 'chef');
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.removeItem('kds-station');
  }, CHEF);
  await page.route('**/api/v1/**', (r) => r.fulfill({ json: { success: true, data: [] } }));
  await page.route('**/api/broadcasting/auth', (r) => r.fulfill({ status: 403, body: '' }));
  await page.route('**/api/v1/auth/me', (r) => r.fulfill({ json: { success: true, data: CHEF } }));
  await page.route('**/api/v1/branches', (r) => r.fulfill({ json: { success: true, data: [{ id: 7, name: 'Asosiy filial' }] } }));
  await page.route('**/api/v1/kitchen-stations', (r) => r.fulfill({ json: { success: true, data: STATIONS } }));
  await page.route('**/api/v1/orders?*', (r) => r.fulfill({ json: { success: true, data: [ORDER] } }));
  await page.route('**/api/v1/orders/501/kitchen-ready', (r) => {
    readyBody = r.request().postDataJSON();
    return r.fulfill({ json: { success: true, data: {
      id: 501, company_id: 1, branch_id: 7, type: 'dine_in', status: 'preparing', created_at: ORDER.created_at, table: ORDER.table,
      items: [
        { id: 1, name_uz: 'Jaz kabob', quantity: 1, modifiers: [], addons: [], station_id: 1, ready_at: new Date().toISOString() },
        { id: 2, name_uz: 'Osh', quantity: 1, modifiers: [], addons: [], station_id: 2, ready_at: null },
      ],
    } } });
  });

  await page.goto('/kitchen');
  const card = page.locator('div.rounded-xl.border-2', { has: page.getByText('#501', { exact: true }) });
  await expect(card).toContainText('Jaz kabob');
  await expect(card.getByText('Osh', { exact: true })).toHaveCount(0);
  await expect(card).toContainText("Boshqa bo'limlar: Oshxona ichi — tayyorlanmoqda");
  await expect(page.getByLabel("Bo'lim")).toHaveValue('1');

  await card.getByRole('button', { name: 'Tayyor' }).click();
  await expect(card).toContainText('Qismingiz tayyor');
  expect(readyBody).toEqual({ station_id: 1 });
});
