import { test, expect } from '@playwright/test';

/**
 * #43: ofitsiant — qoralama → tasdiqlash → yuborish, o'z buyurtmalari soni.
 * API mock qilinadi.
 */
const WAITER = { id: 31, name: 'Dilshod', role: 'waiter', is_active: true, company_id: 1, branch_id: 7 };
const MENU = [
  { id: 10, name_uz: 'Milliy taomlar', parent_id: null, sort_order: 1, menu_items: [
    { id: 100, category_id: 10, name_uz: 'Osh', sell_type: 'portion', price: 45000, is_available: true,
      modifiers: [{ id: 5, name_uz: 'Piyozsiz' }], addons: [{ id: 1, name_uz: "Go'sht", price: 12000, max_quantity: 3 }] },
    { id: 101, category_id: 10, name_uz: 'Non', sell_type: 'portion', price: 4000, is_available: true, modifiers: [], addons: [] },
  ] },
];

test('qoralama yig\'iladi, tasdiqlashda tekshiriladi va keyin yuboriladi', async ({ page }) => {
  let sent: { items: unknown[] } | null = null;
  await page.addInitScript((u) => {
    localStorage.setItem('access_token', 'w');
    localStorage.setItem('user', JSON.stringify(u));
  }, WAITER);
  await page.route('**/api/v1/**', (r) => r.fulfill({ json: { success: true, data: [] } }));
  await page.route('**/api/broadcasting/auth', (r) => r.fulfill({ status: 403, body: '' }));
  await page.route('**/api/v1/auth/me', (r) => r.fulfill({ json: { success: true, data: WAITER } }));
  await page.route('**/api/v1/branches', (r) => r.fulfill({ json: { success: true, data: [{ id: 7, name: 'Asosiy' }] } }));
  await page.route('**/api/v1/tables?*', (r) => r.fulfill({ json: { success: true, data: [{ id: 3, number: '3', status: 'free', seats: 4 }] } }));
  await page.route('**/api/v1/pos/menu', (r) => r.fulfill({ json: { success: true, data: MENU } }));
  await page.route('**/api/v1/orders/my-stats', (r) => r.fulfill({ json: { success: true, data: { preparing: 2, ready: 1, served: 0, today_count: 7, today_total: 512000 } } }));
  await page.route('**/api/v1/orders', (r) => {
    if (r.request().method() !== 'POST') return r.fallback();
    sent = r.request().postDataJSON();
    return r.fulfill({ status: 201, json: { success: true, data: { id: 900 } } });
  });

  await page.goto('/waiter');
  const stats = page.getByLabel('Mening buyurtmalarim');
  await expect(stats).toContainText('Tayyor — olib boring1');
  await expect(stats).toContainText('Bugun jami7');

  await page.getByRole('button', { name: /#3/ }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: "Osh qo'shish" }).click();
  await dlg.getByRole('button', { name: "Osh: ko'paytirish" }).click();
  await dlg.getByRole('button', { name: "Non qo'shish" }).click();
  // Menyu yopilmaydi, pastda qoralama
  await expect(dlg.getByRole('button', { name: /^Buyurtma · 3 ta/ })).toContainText('94 000');

  // Oynani yopib qayta ochsa — qoralama saqlangan
  await dlg.getByRole('button', { name: /Yopish/ }).click();
  await expect(page.getByText('qoralama', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /#3/ }).click();
  await dlg.getByRole('button', { name: /^Buyurtma · 3 ta/ }).click();

  // Tasdiqlash: Osh 2 → 1 → 0.7, go'sht ×2, piyozsiz
  await expect(dlg.getByRole('heading', { name: /tasdiqlang/ })).toBeVisible();
  await dlg.getByRole('button', { name: 'Osh: kamaytirish' }).click();
  await dlg.getByRole('button', { name: 'Osh: kamaytirish' }).click();
  await expect(dlg.getByText('0.7 ta', { exact: true })).toBeVisible();
  await dlg.getByRole('button', { name: "Go'sht qo'shish" }).click();
  await dlg.getByRole('button', { name: "Go'sht: ko'paytirish" }).click();
  await dlg.getByRole('button', { name: 'Piyozsiz' }).click();
  expect(sent).toBeNull();

  await dlg.getByRole('button', { name: 'Tasdiqlash va yuborish' }).click();
  await expect(dlg).toBeHidden();
  expect(sent!.items).toEqual([
    { menu_item_id: 100, quantity: 0.7, weight_kg: null, modifier_ids: [5], addons: [{ id: 1, quantity: 2 }], note: null },
    { menu_item_id: 101, quantity: 1, weight_kg: null, modifier_ids: [], addons: [], note: null },
  ]);
});
