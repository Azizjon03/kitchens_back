import { test, expect } from '@playwright/test';

/** #39: «Yetkazib berish» — menejer bot buyurtmasini tasdiqlaydi yoki rad etadi. API mock. */
const MANAGER = { id: 41, name: 'Aziz', role: 'manager', is_active: true, company_id: 1 };
const order = (id: number, status: string, extra: Record<string, unknown> = {}) => ({
  id, type: 'delivery', status, total: 91000, note: null, created_at: new Date(Date.now() - 6 * 60000).toISOString(),
  delivery_address: 'Chust, Mustaqillik 12', delivery_lat: '40.9983000', delivery_lng: '71.2372000',
  customer: { id: 5, name: 'Vali Aliyev', phone: '+998901234567' }, branch: { id: 7, name: 'Asosiy filial' }, confirmed_by: null,
  order_items: [{ id: 1, quantity: 1, menu_item: { name_uz: "Lag'mon" }, modifiers: [], addons: [{ id: 2, name_uz: "Go'sht", pivot: { quantity: 2 } }] }],
  ...extra,
});

test('menejer qo\'ng\'iroq qilib tasdiqlaydi, xaritani ko\'radi, rad etadi', async ({ page }) => {
  let list = [order(10, 'pending'), order(11, 'pending'), order(12, 'ready')];
  const calls: string[] = [];
  await page.addInitScript((u) => {
    localStorage.setItem('access_token', 'm');
    localStorage.setItem('user', JSON.stringify(u));
  }, MANAGER);
  await page.route('**/api/v1/**', (r) => r.fulfill({ json: { success: true, data: [] } }));
  await page.route('**/api/v1/auth/me', (r) => r.fulfill({ json: { success: true, data: MANAGER } }));
  await page.route('**/yandex.uz/**', (r) => r.fulfill({ body: '<html></html>', contentType: 'text/html' }));
  await page.route('**/api/v1/orders/delivery', (r) => r.fulfill({ json: { success: true, data: list } }));
  await page.route('**/api/v1/orders/10/confirm', (r) => {
    calls.push('confirm 10');
    list = list.map((o) => (o.id === 10 ? { ...o, status: 'preparing' } : o));
    return r.fulfill({ json: { success: true, data: {} } });
  });
  await page.route('**/api/v1/orders/11/cancel', (r) => {
    calls.push('cancel 11 ' + (r.request().postDataJSON() as { reason: string }).reason);
    list = list.filter((o) => o.id !== 11);
    return r.fulfill({ json: { success: true, data: {} } });
  });
  await page.route('**/api/v1/orders/12/status', (r) => {
    calls.push('status 12 ' + (r.request().postDataJSON() as { status: string }).status);
    list = list.map((o) => (o.id === 12 ? { ...o, status: 'delivering' } : o));
    return r.fulfill({ json: { success: true, data: {} } });
  });

  await page.goto('/delivery');
  const card10 = page.getByRole('article', { name: 'Buyurtma #10' });
  await expect(page.getByRole('heading', { name: /Tasdiqlash kutilmoqda/ })).toContainText('2');
  await expect(card10.getByRole('link', { name: "Qo'ng'iroq" })).toHaveAttribute('href', 'tel:+998901234567');
  await expect(card10).toContainText('+998 (90) 123-45-67');
  await expect(card10.getByRole('link', { name: /Yandex xaritada ochish/ })).toHaveAttribute('href', 'https://yandex.uz/maps/?pt=71.2372,40.9983&z=17&l=map');
  await expect(card10.locator('iframe')).toHaveAttribute('src', /map-widget\/v1\/\?pt=71\.2372,40\.9983/);
  await expect(card10).toContainText("+ Go'sht ×2");

  await card10.getByRole('button', { name: 'Tasdiqlash' }).click();
  await expect(page.getByRole('heading', { name: /Tasdiqlash kutilmoqda/ })).toContainText('1');

  await page.getByRole('article', { name: 'Buyurtma #11' }).getByRole('button', { name: 'Rad etish' }).click();
  await page.getByRole('dialog').getByLabel('Mijoz bekor qildi').check();
  await page.getByRole('dialog').getByRole('button', { name: 'Rad etish' }).click();
  await expect(page.getByRole('article', { name: 'Buyurtma #11' })).toHaveCount(0);

  await page.getByRole('article', { name: 'Buyurtma #12' }).getByRole('button', { name: "Kuryer yo'lga chiqdi" }).click();
  await expect(page.getByRole('article', { name: 'Buyurtma #12' }).getByRole('button', { name: 'Yetkazildi' })).toBeVisible();
  expect(calls).toEqual(['confirm 10', 'cancel 11 Mijoz bekor qildi', 'status 12 delivering']);
});
