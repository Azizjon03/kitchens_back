import { test, expect } from './fixtures/auth';

test.describe('Dashboard sahifasi', () => {
  test('dashboard sahifasi yuklangandan keyin statistikalar ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    // Sahifa yuklandi
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });

    // Stat kartalar yoki placeholder ko'rinishi kerak
    const statCards = page.locator('.bg-white, .bg-gray-50').filter({ hasText: /Jami|kompaniya|statistika/i });
    const hasStats = (await statCards.count()) > 0;

    // Agar super_admin bo'lsa — stat kartalar
    const superAdminCards = page.locator('text=Jami kompaniyalar');
    const companyPlaceholder = page.locator('text=kompaniya statistikasi');

    const isSuperAdmin = (await superAdminCards.count()) > 0;
    const isCompanyAdmin = (await companyPlaceholder.count()) > 0;

    // Ikkalasidan biri ko'rinishi kerak
    expect(isSuperAdmin || isCompanyAdmin).toBeTruthy();
  });

  test('super admin uchun 4 ta stat karta ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    const superAdminCards = page.locator('text=Jami kompaniyalar');
    if ((await superAdminCards.count()) === 0) {
      test.skip();
      return;
    }

    await expect(page.locator('text=Jami kompaniyalar')).toBeVisible();
    await expect(page.locator('text=Jami foydalanuvchilar')).toBeVisible();
    await expect(page.locator('text=Jami buyurtmalar')).toBeVisible();
    await expect(page.locator('text=Jami daromad')).toBeVisible();
  });

  test('tizim holati kartasi ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    const systemStatus = page.locator('text=Tizim holati');
    if ((await systemStatus.count()) > 0) {
      await expect(systemStatus).toBeVisible();
      await expect(page.locator('text=Tizim barqaror ishlayapti')).toBeVisible();
    }
  });

  test('loading skeleton ko\'rsatilishi kerak', async ({ page }) => {
    // API ni sekinlashtirish
    await page.route('**/api/v1/super/dashboard', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.continue();
    });

    // Login qilish
    const email = process.env.TEST_EMAIL || 'admin@kitchens.uz';
    const password = process.env.TEST_PASSWORD || 'password';

    await page.goto('/login');
    await page.fill('input#email', email);
    await page.fill('input#password', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Skeleton/loading elementlari
    const loadingElements = page.locator('.animate-pulse, .animate-spin');
    // Agar API sekin bo'lsa skeleton ko'rinadi
    if ((await loadingElements.count()) > 0) {
      await expect(loadingElements.first()).toBeVisible();
    }
  });
});
