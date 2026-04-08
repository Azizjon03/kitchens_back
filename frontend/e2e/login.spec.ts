import { test, expect } from '@playwright/test';

test.describe('Login sahifasi', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  // ============ RENDER TESTLARI ============

  test('login sahifasi to\'g\'ri renderlanishi kerak', async ({ page }) => {
    // Logo va sarlavha
    await expect(page.locator('text=Kitchens.uz')).toBeVisible();

    // Email input
    const emailInput = page.locator('input#email');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('placeholder', 'admin@kitchens.uz');

    // Password input
    const passwordInput = page.locator('input#password');
    await expect(passwordInput).toBeVisible();

    // Kirish button
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText('Kirish');
  });

  test('parolni ko\'rsatish/yashirish tugmasi ishlashi kerak', async ({ page }) => {
    const passwordInput = page.locator('input#password');

    // Default: password type
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Eye toggle tugmasini bosish
    const toggleBtn = page.locator('input#password + button, button:near(input#password)').first();
    // Agar toggle button mavjud bo'lsa
    const eyeButton = page.locator('button[type="button"]').filter({ has: page.locator('svg') });
    if (await eyeButton.count() > 0) {
      await eyeButton.first().click();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      await eyeButton.first().click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  // ============ VALIDATSIYA TESTLARI ============

  test('bo\'sh form yuborilmasligi kerak', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // HTML5 validation — form yuborilmaydi
    const currentURL = page.url();
    expect(currentURL).toContain('/login');
  });

  test('noto\'g\'ri login ma\'lumotlari bilan xatolik ko\'rsatilishi kerak', async ({ page }) => {
    await page.fill('input#email', 'wrong@email.com');
    await page.fill('input#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Loading state
    await expect(page.locator('button[type="submit"]')).toBeDisabled({ timeout: 2000 }).catch(() => {});

    // Error xabari ko'rsatilishi kerak
    const errorBox = page.locator('.bg-red-50, [role="alert"]');
    await expect(errorBox).toBeVisible({ timeout: 10000 });
  });

  // ============ MUVAFFAQIYATLI LOGIN ============

  test('to\'g\'ri login ma\'lumotlari bilan dashboard ga yo\'naltirilishi kerak', async ({ page }) => {
    const email = process.env.TEST_EMAIL || 'admin@kitchens.uz';
    const password = process.env.TEST_PASSWORD || 'password';

    await page.fill('input#email', email);
    await page.fill('input#password', password);
    await page.click('button[type="submit"]');

    // Loading holati
    await expect(page.locator('button[type="submit"]')).toContainText(/Kirish/);

    // Dashboard ga o'tishi kerak
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
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
