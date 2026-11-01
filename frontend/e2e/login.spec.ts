import { test, expect } from '@playwright/test';

const TEST_PHONE = process.env.TEST_PHONE || '998906921469';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password';

test.describe('Login sahifasi', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  // ============ RENDER TESTLARI ============

  test('login sahifasi to\'g\'ri renderlanishi kerak', async ({ page }) => {
    // Logo va sarlavha
    await expect(page.getByRole('heading', { name: 'Kitchens.uz' })).toBeVisible();
    await expect(page.getByText('Admin paneliga kirish')).toBeVisible();

    // Telefon input (login telefon + parol bilan)
    const phoneInput = page.getByLabel('Telefon raqam');
    await expect(phoneInput).toBeVisible();
    await expect(phoneInput).toHaveAttribute('id', 'phone');
    await expect(phoneInput).toHaveAttribute('type', 'tel');
    await expect(phoneInput).toHaveAttribute('placeholder', '(90) 123-45-67');
    // #42: +998 maydon yonida doim turadi
    await expect(page.getByText('+998', { exact: true })).toBeVisible();

    // Password input
    const passwordInput = page.getByLabel('Parol');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Kirish button
    await expect(page.getByRole('button', { name: 'Kirish' })).toBeVisible();
  });

  test('telefon raqam kiritilganda maska qo\'llanishi kerak', async ({ page }) => {
    const phoneInput = page.locator('input#phone');
    // #42: +998 tashqarida, foydalanuvchi faqat 9 raqam yozadi
    await phoneInput.pressSequentially('906921469');
    await expect(phoneInput).toHaveValue('(90) 692-14-69');

    // 9 raqamdan ortig'i kesiladi
    await phoneInput.pressSequentially('77');
    await expect(phoneInput).toHaveValue('(90) 692-14-69');
  });

  test('parolni ko\'rsatish/yashirish tugmasi ishlashi kerak', async ({ page }) => {
    const passwordInput = page.locator('input#password');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Formadagi yagona type=button — ko'z (Eye) tugmasi
    const eyeButton = page.locator('form button[type="button"]');
    await expect(eyeButton).toHaveCount(1);

    await eyeButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    await eyeButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  // ============ VALIDATSIYA TESTLARI ============

  test('bo\'sh form yuborilmasligi kerak', async ({ page }) => {
    let loginRequested = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/auth/login')) loginRequested = true;
    });

    await page.locator('button[type="submit"]').click();

    // HTML5 required — form yuborilmaydi
    const phoneInvalid = await page.locator('input#phone').evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(phoneInvalid).toBeTruthy();
    expect(loginRequested).toBeFalsy();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('noto\'g\'ri login ma\'lumotlari bilan xatolik ko\'rsatilishi kerak', async ({ page }) => {
    await page.fill('input#phone', TEST_PHONE);
    await page.fill('input#password', 'wrongpassword');

    const responsePromise = page.waitForResponse((res) => res.url().includes('/api/v1/auth/login'));
    await page.click('button[type="submit"]');
    const response = await responsePromise;
    expect(response.ok()).toBeFalsy();

    // Xatolik qutisi (bg-red-50) matn bilan ko'rsatiladi, login sahifasida qolamiz
    const errorBox = page.locator('form .bg-red-50');
    await expect(errorBox).toBeVisible({ timeout: 10000 });
    await expect(errorBox).not.toBeEmpty();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull();
  });

  // ============ MUVAFFAQIYATLI LOGIN ============

  test('to\'g\'ri login ma\'lumotlari bilan dashboard ga yo\'naltirilishi kerak', async ({ page }) => {
    await page.fill('input#phone', TEST_PHONE);
    await page.fill('input#password', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeTruthy();
  });

  // ============ HIMOYA TESTLARI ============

  test('autentifikatsiyasiz dashboard ga kirib bo\'lmasligi kerak', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('autentifikatsiyasiz companies ga kirib bo\'lmasligi kerak', async ({ page }) => {
    await page.goto('/companies');
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });
});
