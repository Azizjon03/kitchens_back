import { test, expect, type Page } from '@playwright/test';

/**
 * #37: birinchi kirishda Telegram kodi (veb) va xodimlar boti Mini App'i (/staff).
 * API mock qilinadi — Telegram va bazaga bog'liq emas.
 */
const USER = { id: 3, name: 'Oshpaz', phone: '+998900000002', role: 'chef', is_active: true, company_id: 1 };

async function stubAfterLogin(page: Page) {
  // Kirgandan keyingi ekran so'rovlari — tekshiruvga aloqasi yo'q (soxta token haqiqiy API'da 401 beradi)
  await page.route('**/api/v1/**', (r) => r.fulfill({ json: { success: true, data: [] } }));
  await page.route('**/api/v1/auth/me', (r) => r.fulfill({ json: { success: true, data: USER } }));
}

test.describe('Xodimlar boti (#37)', () => {
  // Avval umumiy zaxira, keyin har test o'z mock'larini qo'yadi (keyingi route ustun)
  test.beforeEach(async ({ page }) => { await stubAfterLogin(page); });

  test('vebda birinchi kirish: Telegram\'dan kod so\'raladi', async ({ page }) => {
    let verifyBody: Record<string, string> | null = null;
    await page.route('**/api/v1/auth/login', (r) => r.fulfill({ json: { success: true, data: {
      requires_telegram_verification: true, nonce: 'n'.repeat(32), bot_url: 'https://t.me/kitchens_xodim_bot?start=v_nnn', code_sent: false,
    } } }));
    await page.route('**/api/v1/auth/telegram/verify', (r) => {
      verifyBody = r.request().postDataJSON();
      return r.fulfill({ json: { success: true, data: { token: 'tok-1', user: USER } } });
    });

    await page.goto('/login');
    await page.getByLabel('Telefon raqam').fill('998900000002');
    await page.getByLabel('Parol').fill('secret123');
    await page.getByRole('button', { name: 'Kirish' }).click();

    await expect(page.getByRole('heading', { name: 'Telegram orqali tasdiqlang' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Telegram'da kod olish/ })).toHaveAttribute('href', /t\.me\/kitchens_xodim_bot\?start=v_/);
    const submit = page.getByRole('button', { name: 'Tasdiqlash' });
    await expect(submit).toBeDisabled();

    await page.getByLabel('Kod').fill('123 456');
    await expect(page.getByLabel('Kod')).toHaveValue('123456');
    await submit.click();

    await expect.poll(() => verifyBody).toEqual({ nonce: 'n'.repeat(32), code: '123456' });
    await expect.poll(() => page.evaluate(() => localStorage.getItem('access_token'))).toBe('tok-1');
  });

  test('noto\'g\'ri kod xabari ko\'rinadi', async ({ page }) => {
    await page.route('**/api/v1/auth/login', (r) => r.fulfill({ json: { success: true, data: {
      requires_telegram_verification: true, nonce: 'x'.repeat(32), bot_url: null, code_sent: false,
    } } }));
    await page.route('**/api/v1/auth/telegram/verify', (r) => r.fulfill({ status: 422, json: { success: false, error: { code: 'WRONG_CODE', message: "Kod noto'g'ri. Telegram'dagi oxirgi kodni yozing." } } }));
    await page.goto('/login');
    await page.getByLabel('Telefon raqam').fill('998900000002');
    await page.getByLabel('Parol').fill('secret123');
    await page.getByRole('button', { name: 'Kirish' }).click();
    await page.getByLabel('Kod').fill('000000');
    await page.getByRole('button', { name: 'Tasdiqlash' }).click();
    await expect(page.getByRole('alert')).toContainText("Kod noto'g'ri");
  });

  test('/tg/staff Telegram\'dan tashqarida yo\'riqnoma ko\'rsatadi', async ({ page }) => {
    await page.route('https://telegram.org/**', (r) => r.abort());
    await page.goto('/tg/staff');
    await expect(page.getByText('xodimlar boti ichida ochiladi')).toBeVisible();
  });

  test('/tg/staff: parol → shu chatga kod → kirish', async ({ page }) => {
    await page.route('https://telegram.org/**', (r) => r.abort());
    await page.addInitScript(() => {
      (window as unknown as { Telegram: unknown }).Telegram = { WebApp: { initData: 'user=%7B%22id%22%3A1%7D&hash=abc', ready() {}, expand() {} } };
    });
    let linkBody: Record<string, string> | null = null;
    await page.route('**/api/v1/auth/telegram/staff', (r) => r.fulfill({ status: 404, json: { success: false, error: { code: 'TELEGRAM_NOT_LINKED', message: 'ulanmagan' } } }));
    await page.route('**/api/v1/auth/telegram/staff/link', (r) => {
      linkBody = r.request().postDataJSON();
      return r.fulfill({ json: { success: true, data: { requires_telegram_verification: true, nonce: 'm'.repeat(32), bot_url: null, code_sent: true } } });
    });
    await page.route('**/api/v1/auth/telegram/verify', (r) => r.fulfill({ json: { success: true, data: { token: 'tok-2', user: USER } } }));

    await page.goto('/tg/staff');
    await expect(page.getByRole('heading', { name: 'Birinchi kirish' })).toBeVisible();
    await page.getByLabel('Telefon raqam').fill('+998900000002');
    await page.getByLabel('Parol').fill('secret123');
    await page.getByRole('button', { name: 'Kirish' }).click();

    await expect(page.getByText('kodi shu Telegram chatiga yuborildi')).toBeVisible();
    expect(linkBody).toMatchObject({ init_data: 'user=%7B%22id%22%3A1%7D&hash=abc', phone: '+998900000002' });
    await page.getByLabel('Kod').fill('654321');
    await page.getByRole('button', { name: 'Tasdiqlash' }).click();
    await expect(page).toHaveURL(/\/kitchen$/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('access_token'))).toBe('tok-2');
  });

  test('/tg/staff: kod o\'chiq — parol bilan darhol kiradi', async ({ page }) => {
    await page.route('https://telegram.org/**', (r) => r.abort());
    await page.addInitScript(() => {
      (window as unknown as { Telegram: unknown }).Telegram = { WebApp: { initData: 'user=%7B%22id%22%3A2%7D&hash=abc', ready() {}, expand() {} } };
    });
    await page.route('**/api/v1/auth/telegram/staff', (r) => r.fulfill({ status: 404, json: { success: false, error: { code: 'TELEGRAM_NOT_LINKED', message: 'ulanmagan' } } }));
    await page.route('**/api/v1/auth/telegram/staff/link', (r) => r.fulfill({ json: { success: true, data: { token: 'tok-3', user: USER } } }));

    await page.goto('/tg/staff');
    await page.getByLabel('Telefon raqam').fill('+998900000002');
    await page.getByLabel('Parol').fill('secret123');
    await page.getByRole('button', { name: 'Kirish' }).click();
    await expect(page).toHaveURL(/\/kitchen$/);
  });

  test('super admin xodimlar botini paneldan ulaydi va kodni yoqadi', async ({ page }) => {
    const base = {
      configured: false, source: null, username: null, bot_url: null, status: 'not_configured', last_error: null,
      last_checked_at: null, pending_updates: 0, login_code: false, webhook_url: 'https://kitchens.uz/api/v1/telegram/staff-webhook',
      mini_app_url: 'https://kitchens.uz/tg/staff', linked_total: 0,
      companies: [{ id: 1, name: 'Oliyaviy', is_active: true, staff_total: 4, staff_linked: 0 }],
    };
    const connected = { ...base, configured: true, source: 'panel', username: 'kitchens_xodim_bot', bot_url: 'https://t.me/kitchens_xodim_bot', status: 'connected' };
    let putBody: Record<string, string> | null = null;
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'sa');
      localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Super', phone: '+998906921469', role: 'super_admin', is_active: true }));
    });
    await page.route('**/api/v1/auth/me', (r) => r.fulfill({ json: { success: true, data: { id: 1, name: 'Super', role: 'super_admin', is_active: true } } }));
    await page.route('**/api/v1/super/staff-bot', (r) => {
      if (r.request().method() === 'PUT') {
        putBody = r.request().postDataJSON();
        return r.fulfill({ json: { success: true, data: connected } });
      }
      return r.fulfill({ json: { success: true, data: base } });
    });
    await page.route('**/api/v1/super/staff-bot/settings', (r) => r.fulfill({ json: { success: true, data: { ...connected, login_code: true } } }));

    await page.goto('/staff-bot');
    await expect(page.getByRole('heading', { name: 'Xodimlar boti' })).toBeVisible();
    await expect(page.getByText('Sozlanmagan')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /tasdiqlash kodi/ })).toBeDisabled();

    await page.getByLabel('Token').fill(' 123456789:' + 'A'.repeat(35) + ' ');
    await page.getByRole('button', { name: 'Ulash' }).click();
    await expect(page.getByRole('status')).toContainText('Bot ulandi');
    expect(putBody).toEqual({ token: '123456789:' + 'A'.repeat(35) });
    await expect(page.getByRole('link', { name: /@kitchens_xodim_bot/ })).toBeVisible();
    await expect(page.getByText('Token saqlangan')).toBeVisible();

    await page.getByRole('checkbox', { name: /tasdiqlash kodi/ }).click(); // holat server javobidan keyin o'zgaradi
    await expect(page.getByRole('status')).toContainText('Tasdiqlash kodi yoqildi');
    await expect(page.getByRole('checkbox', { name: /tasdiqlash kodi/ })).toBeChecked();
  });
});
