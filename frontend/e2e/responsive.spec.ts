import { test, expect } from './fixtures/auth';
import { devices, type Page } from '@playwright/test';

// Mobil sarlavhadagi (lg:hidden) hamburger tugmasi
const hamburger = (page: Page) => page.locator('header button').filter({ has: page.locator('svg.lucide-menu') });
// Sidebar ochiq bo'lganda chiqadigan qora overlay
const overlay = (page: Page) => page.locator('div.fixed.inset-0.bg-black\\/50');

test.describe('Responsive dizayn — Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone X

  test('mobile da hamburger menyu ko\'rsatilishi va sidebar yashirin bo\'lishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await expect(hamburger(page)).toBeVisible();
    await expect(page.locator('header').getByText('Kitchens.uz')).toBeVisible();
    // Sidebar ekrandan tashqarida (-translate-x-full)
    await expect(page.locator('aside')).not.toBeInViewport();
  });

  test('hamburger tugmasini bosganda sidebar ochilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await hamburger(page).click();

    await expect(page.locator('aside')).toBeInViewport();
    await expect(page.locator('aside').getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(overlay(page)).toBeVisible();
  });

  test('mobile sidebar yopilishi kerak (X tugmasi)', async ({
    authenticatedPage: page,
  }) => {
    await hamburger(page).click();
    await expect(page.locator('aside')).toBeInViewport();

    await page.locator('aside button').filter({ has: page.locator('svg.lucide-x') }).click();
    await expect(overlay(page)).toBeHidden();
    await expect(page.locator('aside')).not.toBeInViewport();
  });

  test('mobile sidebar yopilishi kerak (overlay bosish)', async ({
    authenticatedPage: page,
  }) => {
    await hamburger(page).click();
    await expect(overlay(page)).toBeVisible();

    // Sidebar (w-64 = 256px) overlay ustida — undan o'ngdagi bo'sh joyni bosamiz
    await overlay(page).click({ position: { x: 340, y: 400 } });
    await expect(overlay(page)).toBeHidden();
    await expect(page.locator('aside')).not.toBeInViewport();
  });

  test('mobile da sidebar linkini bosganda sidebar yopilishi va sahifa ochilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await hamburger(page).click();
    await page.locator('aside nav').getByRole('link', { name: 'Kompaniyalar' }).click();
    await expect(page).toHaveURL(/\/companies$/);
    await expect(overlay(page)).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Kompaniyalar', level: 1 })).toBeVisible();
  });

  test('mobile da login sahifasi to\'g\'ri ko\'rsatilishi kerak', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('input#phone')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();

    // Viewport ichida joylashganligini tekshirish
    const box = await submitBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  });

  test('mobile da modal to\'g\'ri ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/companies');
    await page.getByRole('button', { name: 'Yangi kompaniya' }).click();

    const heading = page.getByRole('heading', { name: 'Yangi kompaniya' });
    await expect(heading).toBeVisible();

    // Modal oynasi (sarlavhaning oq konteyneri) gorizontal viewport ichida
    const dialogBox = page.locator('div.bg-white.rounded-2xl').filter({ has: heading });
    const box = await dialogBox.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);

    // Uzun forma modal ichida scroll bo'ladi — "Yaratish" tugmasigacha yetib boriladi
    const submit = dialogBox.getByRole('button', { name: 'Yaratish' });
    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeInViewport();
  });
});

test.describe('Responsive dizayn — gorizontal overflow (haqiqiy mobil qurilma)', () => {
  // defaultBrowserType ni describe ichida berib bo'lmaydi
  const { defaultBrowserType: _ignored, ...pixel5 } = devices['Pixel 5'];
  test.use(pixel5);

  for (const path of ['/dashboard', '/companies', '/plans', '/history']) {
    test(`${path} sahifasi mobil ekranda gorizontal kengaymasligi kerak`, async ({ authenticatedPage: page }) => {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('status')).toHaveCount(0, { timeout: 10000 });
      const { scroll, client } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(scroll).toBeLessThanOrEqual(client);
    });
  }
});

test.describe('Responsive dizayn — Tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 } }); // iPad

  test('tablet da sahifa to\'g\'ri ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible({ timeout: 10000 });
    // 768px < lg (1024px) — hali mobil sarlavha va hamburger
    await expect(hamburger(page)).toBeVisible();
    await expect(page.locator('aside')).not.toBeInViewport();
  });
});

test.describe('Responsive dizayn — Desktop', () => {
  test.use({ viewport: { width: 1920, height: 1080 } }); // Full HD

  test('desktop da sidebar doim ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.locator('aside')).toBeInViewport();
    await expect(page.locator('aside').getByRole('heading', { name: 'Kitchens.uz' })).toBeVisible();
    // Hamburger (lg:hidden) desktopda ko'rinmaydi
    await expect(hamburger(page)).toBeHidden();
  });
});
