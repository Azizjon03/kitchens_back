import { test, expect, type Page } from '@playwright/test';

/** #49: zallar — boshqarish (Stollar) va ofitsiant ekranida guruhlash. API mock. */
const hall = { id: 5, name: 'Katta zal', allow_whole: true, sort_order: 1 };
const tbl = (id: number, number: string, extra: Record<string, unknown> = {}) => ({
  id, company_id: 1, branch_id: 7, number, seats: 8, status: 'free', table_group_id: 5, group: hall, is_whole_group: false, created_at: '', ...extra,
});
const TABLES = [
  tbl(1, "Katta zal so'ri 1", { status: 'occupied' }), tbl(2, "Katta zal so'ri 2"),
  tbl(9, 'Katta zal', { seats: 16, is_whole_group: true, status: 'occupied' }),
  tbl(20, 'Kabina 1', { table_group_id: null, group: null, seats: 10 }),
];

async function setup(page: Page, user: Record<string, unknown>) {
  await page.addInitScript((u) => {
    localStorage.setItem('access_token', 't');
    localStorage.setItem('user', JSON.stringify(u));
  }, user);
  await page.route('**/api/v1/**', (r) => r.fulfill({ json: { success: true, data: [] } }));
  await page.route('**/api/broadcasting/auth', (r) => r.fulfill({ status: 403, body: '' }));
  await page.route('**/api/v1/auth/me', (r) => r.fulfill({ json: { success: true, data: user } }));
  await page.route('**/api/v1/branches', (r) => r.fulfill({ json: { success: true, data: [{ id: 7, name: 'Asosiy filial' }] } }));
  await page.route(/\/api\/v1\/tables(\?.*)?$/, (r) => r.fulfill({ json: { success: true, data: TABLES } }));
}

test('ofitsiant: stollar zal bo\'yicha, butun zal plitkasi', async ({ page }) => {
  await setup(page, { id: 31, name: 'W', role: 'waiter', is_active: true, company_id: 1, branch_id: 7 });
  await page.goto('/waiter');
  const big = page.getByRole('region', { name: 'Katta zal' });
  await expect(big.getByRole('button', { name: /Katta zal\s*butun zal · 16 kishi/ })).toBeDisabled();
  await expect(big.getByRole('button', { name: /#Katta zal so'ri 2/ })).toBeEnabled();
  await expect(page.getByRole('region', { name: 'Zalsiz stollar' }).getByRole('button', { name: /#Kabina 1/ })).toBeVisible();
});

test('rahbar: yangi zal yaratadi — nom, butun zal ruxsati, stollar', async ({ page }) => {
  await setup(page, { id: 1, name: 'Rahbar', role: 'company_admin', is_active: true, company_id: 1 });
  let body: Record<string, unknown> | null = null;
  await page.route(/\/api\/v1\/table-groups(\?.*)?$/, (r) => {
    if (r.request().method() === 'POST') {
      body = r.request().postDataJSON();
      return r.fulfill({ status: 201, json: { success: true, data: { id: 6 } } });
    }
    return r.fulfill({ json: { success: true, data: [{ ...hall, branch_id: 7, tables_count: 2 }] } });
  });
  await page.goto('/tables');
  await expect(page.getByRole('button', { name: /Katta zal · 2 ta · butun zal/ })).toBeVisible();
  await page.getByRole('button', { name: 'Yangi zal' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Nomi').fill('Kichik zal');
  await expect(dlg.getByRole('checkbox', { name: /Butun zalga buyurtma/ })).toBeChecked();
  await dlg.getByText('Kabina 1').click();
  await expect(dlg).toContainText('(10 kishi)');
  await dlg.getByRole('button', { name: 'Saqlash' }).click();
  await expect(dlg).toBeHidden();
  expect(body).toEqual({ name: 'Kichik zal', allow_whole: true, table_ids: [20], branch_id: 7 });
});
