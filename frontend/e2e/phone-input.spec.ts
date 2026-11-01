import { test, expect } from '@playwright/test';

/** #42: telefon maydoni — +998 o'zi turadi, niqob, nusxalangan raqam. */
test.describe('Telefon maydoni (#42)', () => {
  test('+998 doim turadi, 9 raqam niqob bilan, server E.164 oladi', async ({ page }) => {
    let body: Record<string, string> | null = null;
    await page.route('**/api/v1/auth/login', (r) => {
      body = r.request().postDataJSON();
      return r.fulfill({ status: 401, json: { success: false, error: { code: 'INVALID_CREDENTIALS', message: "Telefon raqam yoki parol noto'g'ri." } } });
    });
    await page.goto('/login');
    const phone = page.getByLabel('Telefon raqam');
    await expect(page.getByText('+998', { exact: true })).toBeVisible();

    await phone.pressSequentially('901234567');
    await expect(phone).toHaveValue('(90) 123-45-67');
    // Ortiqcha raqam qo'shilmaydi
    await phone.press('8');
    await expect(phone).toHaveValue('(90) 123-45-67');
    // Backspace ajratkichlarda tiqilib qolmaydi
    for (let i = 0; i < 8; i++) await phone.press('Backspace');
    await expect(phone).toHaveValue('(9');

    await page.getByLabel('Parol').fill('x');
    await phone.fill('+998 (91) 765-43-21');
    await expect(phone).toHaveValue('(91) 765-43-21');
    await page.getByRole('button', { name: 'Kirish' }).click();
    await expect.poll(() => body?.phone).toBe('+998917654321');
  });

  test('to\'liq raqam nusxalab qo\'yilsa 998 takrorlanmaydi', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard ruxsati faqat chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/login');
    const phone = page.getByLabel('Telefon raqam');
    await page.evaluate(() => navigator.clipboard.writeText('998 90 111 22 33'));
    await phone.focus();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
    await expect(phone).toHaveValue('(90) 111-22-33');
  });
});
