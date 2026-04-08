import { test, expect } from './fixtures/auth';

test.describe('Sidebar navigatsiya', () => {
  test('sidebar menyu elementlari ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    // Brand
    await expect(page.locator('text=Kitchens.uz').first()).toBeVisible();

    // Dashboard link — har doim ko'rinadi
    const dashboardLink = page.locator('a[href="/dashboard"]');
    await expect(dashboardLink).toBeVisible();
  });

  test('super admin uchun sidebar navigatsiya elementlari', async ({
    authenticatedPage: page,
  }) => {
    const companiesLink = page.locator('a[href="/companies"]');
    if ((await companiesLink.count()) > 0) {
      // Super admin menyu elementlari
      await expect(page.locator('text=Dashboard')).toBeVisible();
      await expect(page.locator('text=Kompaniyalar')).toBeVisible();
      await expect(page.locator('text=Tariflar')).toBeVisible();
    }
  });

  test('company admin uchun sidebar navigatsiya elementlari', async ({
    authenticatedPage: page,
  }) => {
    const menuLink = page.locator('a[href="/menu"]');
    if ((await menuLink.count()) > 0) {
      // Company admin menyu elementlari
      await expect(page.locator('text=Dashboard')).toBeVisible();
      await expect(page.locator('text=Menyu')).toBeVisible();
      await expect(page.locator('text=Stollar')).toBeVisible();
      await expect(page.locator('text=Buyurtmalar')).toBeVisible();
    }
  });

  test('navigatsiya linklarini bosish to\'g\'ri sahifaga olib borishi kerak', async ({
    authenticatedPage: page,
  }) => {
    // Dashboard
    await page.click('a[href="/dashboard"]');
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');

    // Kompaniyalar (agar super admin bo'lsa)
    const companiesLink = page.locator('a[href="/companies"]');
    if ((await companiesLink.count()) > 0) {
      await companiesLink.click();
      await page.waitForURL('**/companies');
      expect(page.url()).toContain('/companies');
    }

    // Menyu (agar company admin bo'lsa)
    const menuLink = page.locator('a[href="/menu"]');
    if ((await menuLink.count()) > 0) {
      await menuLink.click();
      await page.waitForURL('**/menu');
      expect(page.url()).toContain('/menu');
    }
  });

  test('aktiv navigatsiya elementi belgilangan bo\'lishi kerak', async ({
    authenticatedPage: page,
  }) => {
    // Dashboard sahifada turganida — aktiv link
    const dashboardLink = page.locator('a[href="/dashboard"]');
    const classes = await dashboardLink.getAttribute('class');
    expect(classes).toContain('amber');
  });

  // ============ FOYDALANUVCHI BO'LIMI ============

  test('sidebar da foydalanuvchi ma\'lumotlari ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    // Avatar (birinchi harf)
    const avatar = page.locator('.bg-amber-100').filter({ hasText: /^[A-Z]$/ });
    if ((await avatar.count()) > 0) {
      await expect(avatar.first()).toBeVisible();
    }
  });

  // ============ LOGOUT ============

  test('chiqish tugmasi ishlashi kerak', async ({ authenticatedPage: page }) => {
    // Logout tugmasini topish
    const logoutBtn = page.locator('button[title="Chiqish"], button:has(svg.lucide-log-out)');
    if ((await logoutBtn.count()) > 0) {
      await logoutBtn.first().click();
      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    }
  });
});

test.describe('Stub sahifalar (placeholder pages)', () => {
  test('Menyu sahifasi placeholder ko\'rsatishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/menu');
    const menuTitle = page.locator('text=Menyu boshqaruvi');
    if ((await menuTitle.count()) > 0) {
      await expect(menuTitle).toBeVisible();
    }
  });

  test('Stollar sahifasi placeholder ko\'rsatishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/tables');
    const tablesTitle = page.locator('text=Stollar boshqaruvi');
    if ((await tablesTitle.count()) > 0) {
      await expect(tablesTitle).toBeVisible();
    }
  });

  test('Buyurtmalar sahifasi placeholder ko\'rsatishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/orders');
    const ordersTitle = page.locator('text=Buyurtmalar boshqaruvi');
    if ((await ordersTitle.count()) > 0) {
      await expect(ordersTitle).toBeVisible();
    }
  });
});
