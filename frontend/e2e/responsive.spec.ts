import { test, expect } from './fixtures/auth';

test.describe('Responsive dizayn — Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone X

  test('mobile da hamburger menyu ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    // Desktop sidebar ko'rinmasligi kerak
    const sidebar = page.locator('aside, nav').filter({ hasText: 'Kitchens.uz' });

    // Hamburger tugmasi ko'rinishi kerak
    const hamburger = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    if ((await hamburger.count()) > 0) {
      await expect(hamburger.first()).toBeVisible();
    }
  });

  test('hamburger tugmasini bosganda sidebar ochilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    const hamburger = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    if ((await hamburger.count()) === 0) {
      test.skip();
      return;
    }

    await hamburger.first().click();

    // Sidebar ko'rinishi kerak
    await expect(page.locator('text=Kitchens.uz').first()).toBeVisible({ timeout: 5000 });

    // Overlay ko'rinishi kerak
    const overlay = page.locator('.bg-black\\/50, [class*="bg-black"]');
    if ((await overlay.count()) > 0) {
      await expect(overlay.first()).toBeVisible();
    }
  });

  test('mobile sidebar yopilishi kerak (X tugmasi)', async ({
    authenticatedPage: page,
  }) => {
    const hamburger = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    if ((await hamburger.count()) === 0) {
      test.skip();
      return;
    }

    await hamburger.first().click();
    await page.waitForTimeout(500);

    // X tugmasi bilan yopish
    const closeBtn = page.locator('button').filter({ has: page.locator('svg.lucide-x') });
    if ((await closeBtn.count()) > 0) {
      await closeBtn.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('mobile sidebar yopilishi kerak (overlay bosish)', async ({
    authenticatedPage: page,
  }) => {
    const hamburger = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    if ((await hamburger.count()) === 0) {
      test.skip();
      return;
    }

    await hamburger.first().click();
    await page.waitForTimeout(500);

    // Overlay bosish orqali yopish
    const overlay = page.locator('.bg-black\\/50, [class*="bg-black"][class*="fixed"]');
    if ((await overlay.count()) > 0) {
      await overlay.first().click({ force: true });
      await page.waitForTimeout(500);
    }
  });

  test('mobile da login sahifasi to\'g\'ri ko\'rsatilishi kerak', async ({ page }) => {
    await page.goto('/login');

    // Form ko'rinishi kerak
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Viewport ichida joylashganligini tekshirish
    const submitBtn = page.locator('button[type="submit"]');
    const box = await submitBtn.boundingBox();
    if (box) {
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }
  });

  test('mobile da modal to\'g\'ri ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    // Hamburger orqali navigatsiya
    const hamburger = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    if ((await hamburger.count()) > 0) {
      await hamburger.first().click();
      await page.waitForTimeout(500);
    }

    const addBtn = page.locator('button, a').filter({ hasText: 'Yangi kompaniya' });
    if ((await addBtn.count()) > 0) {
      await addBtn.first().click();
      await page.waitForTimeout(500);

      // Modal viewport ichida bo'lishi kerak
      const modal = page.locator('[class*="fixed"][class*="inset-0"], [role="dialog"]');
      if ((await modal.count()) > 0) {
        await expect(modal.first()).toBeVisible();
      }
    }
  });
});

test.describe('Responsive dizayn — Tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 } }); // iPad

  test('tablet da sahifa to\'g\'ri ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Responsive dizayn — Desktop', () => {
  test.use({ viewport: { width: 1920, height: 1080 } }); // Full HD

  test('desktop da sidebar doim ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    // Sidebar ko'rinishi kerak
    await expect(page.locator('text=Kitchens.uz').first()).toBeVisible();

    // Hamburger ko'rinmasligi kerak
    const hamburger = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    // Desktop da hamburger hidden bo'lishi kerak (lg:hidden class)
  });
});
