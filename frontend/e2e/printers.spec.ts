import { test, expect, type Page } from '@playwright/test';

/** #53: printerlar sahifasi, kompyuterni ulash, menyuni yig'ish. API mock. */
const ADMIN = { id: 1, name: 'Rahbar', role: 'company_admin', is_active: true, company_id: 1 };
let data = {
  printers: [{ id: 3, name: 'Kabob printer', ip: '192.168.123.100', port: 9100, paper_width: 80, is_active: true, status: 'offline', last_error: "Printer javob bermadi (192.168.123.100:9100)", last_checked_at: null }],
  agents: [] as Record<string, unknown>[],
  recent_jobs: [{ id: 9, order_id: 18, kind: 'kitchen', status: 'failed', error: 'Printer javob bermadi', created_at: new Date().toISOString(), printer: { id: 3, name: 'Kabob printer' } }],
};

async function setup(page: Page) {
  await page.addInitScript((u) => {
    localStorage.setItem('access_token', 't');
    localStorage.setItem('user', JSON.stringify(u));
  }, ADMIN);
  await page.route('**/api/v1/**', (r) => r.fulfill({ json: { success: true, data: [] } }));
  await page.route('**/api/v1/auth/me', (r) => r.fulfill({ json: { success: true, data: ADMIN } }));
  await page.route('**/api/v1/printers', (r) => {
    if (r.request().method() === 'POST') return r.fulfill({ status: 201, json: { success: true, data: { id: 4 } } });
    return r.fulfill({ json: { success: true, data } });
  });
}

test('printer holati, xatosi va kompyuterni ulash — dastur fayli yuklanadi', async ({ page }) => {
  await setup(page);
  await page.route('**/api/v1/print-agents', (r) => {
    data = { ...data, agents: [{ id: 1, name: 'Oshxona kompyuteri', online: false, last_seen_at: null, version: null }] };
    return r.fulfill({ status: 201, json: { success: true, data: { script: "$Token   = 'abc'\nWrite-Host 'ok'", filename: 'kitchens-printer.ps1' } } });
  });
  await page.goto('/printers');
  await expect(page.getByText('Javob bermayapti')).toBeVisible();
  await expect(page.getByText('Printer javob bermadi (192.168.123.100:9100)')).toBeVisible();
  await expect(page.getByText('Chiqmadi', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Kompyuterni ulash' }).click();
  const dlg = page.getByRole('dialog');
  const download = page.waitForEvent('download');
  await dlg.getByRole('button', { name: 'Dasturni yuklab olish' }).click();
  expect((await download).suggestedFilename()).toBe('kitchens-printer.ps1');
  await expect(dlg).toContainText('Run with PowerShell');
});

test('printer qo\'shish: IP tekshiruvi va yuborilgan qiymatlar', async ({ page }) => {
  await setup(page);
  let body: Record<string, unknown> | null = null;
  await page.route('**/api/v1/printers', (r) => {
    if (r.request().method() === 'POST') { body = r.request().postDataJSON(); return r.fulfill({ status: 201, json: { success: true, data: { id: 4 } } }); }
    return r.fulfill({ json: { success: true, data } });
  });
  await page.goto('/printers');
  await page.getByRole('button', { name: "Printer qo'shish" }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Nomi').fill('Osh printer');
  await dlg.getByLabel('IP manzil').fill('192.168.123.101abc');
  await dlg.getByText('58 mm').click();
  await dlg.getByRole('button', { name: 'Saqlash' }).click();
  await expect(dlg).toBeHidden();
  expect(body).toEqual({ name: 'Osh printer', ip: '192.168.123.101', port: 9100, paper_width: 58 });
});

test('yon menyuni yopish va ochish (kompyuterda)', async ({ page, isMobile }) => {
  test.skip(isMobile, 'faqat katta ekranda');
  await setup(page);
  await page.goto('/printers');
  const nav = page.getByRole('navigation', { name: 'Asosiy menyu' });
  await expect(nav.getByText('Printerlar')).toBeVisible();
  await page.getByRole('button', { name: 'Menyuni yopish' }).last().click();
  await expect(nav.getByRole('link', { name: 'Printerlar' })).toBeVisible(); // belgi qoladi, nom sr-only
  await expect(nav.getByText('Printerlar')).not.toBeInViewport();
  await page.reload();
  await page.getByRole('button', { name: 'Menyuni ochish' }).click();
  await expect(nav.getByText('Printerlar')).toBeVisible();
});
