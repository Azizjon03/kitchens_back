import { test, expect, loginViaAPI, createCompanyAdmin } from './fixtures/auth';

import type { Page } from '@playwright/test';

/** Mobil/planshet (< lg) da sidebar yashirin — linkni bosishdan oldin hamburger orqali ochamiz. */
async function openSidebarIfCollapsed(page: Page) {
  // #27: sahifalar lazy yuklanadi — Layout chizilguncha kutamiz
  await page.locator('aside').waitFor({ state: 'attached' });
  const hamburger = page.locator('header button').filter({ has: page.locator('svg.lucide-menu') });
  if (await hamburger.isVisible()) {
    await hamburger.click();
    await expect(page.locator('aside')).toBeInViewport();
  }
}

const SUPER_ADMIN_LINKS = ['Dashboard', 'Kompaniyalar', 'Tariflar', 'Standart menyu', 'Telegram botlar', 'Xodimlar boti', 'Tarix'];
const COMPANY_ADMIN_LINKS = [
  'Dashboard', 'Menyu', "Qo'shimchalar", 'Stollar', 'Ofitsiant',
  'Yetkazib berish', 'Buyurtmalar', 'Oshxona', "Oshxona bo'limlari", 'Printerlar', 'Kassa', 'Xodimlar', 'Restoran sahifasi', 'Filiallar', 'Telegram bot',
];

// authenticatedPage — super admin
test.describe('Sidebar navigatsiya (super admin)', () => {
  test('sidebar brend va Dashboard linki ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    const sidebar = page.locator('aside');
    await expect(sidebar.getByRole('heading', { name: 'Kitchens.uz' })).toBeVisible();
    // Brend ostidagi rol yozuvi
    await expect(sidebar.getByRole('heading', { name: 'Kitchens.uz' }).locator('xpath=following-sibling::p')).toHaveText('Super Admin');
    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  });

  test('super admin uchun sidebar navigatsiya elementlari', async ({
    authenticatedPage: page,
  }) => {
    const nav = page.locator('aside nav');
    await expect(nav.getByRole('link')).toHaveText(SUPER_ADMIN_LINKS);
    // Kompaniya bo'limlari super adminga ko'rinmaydi
    await expect(nav.getByRole('link', { name: 'Menyu', exact: true })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Buyurtmalar' })).toHaveCount(0);
  });

  test('navigatsiya linklarini bosish to\'g\'ri sahifaga olib borishi kerak', async ({
    authenticatedPage: page,
  }) => {
    const nav = page.locator('aside nav');
    const targets: [string, string][] = [
      ['Kompaniyalar', '/companies'],
      ['Tariflar', '/plans'],
      ['Tarix', '/history'],
      ['Dashboard', '/dashboard'],
    ];
    for (const [name, path] of targets) {
      await openSidebarIfCollapsed(page);
      await nav.getByRole('link', { name }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }
  });

  test('aktiv navigatsiya elementi belgilangan bo\'lishi kerak', async ({
    authenticatedPage: page,
  }) => {
    const nav = page.locator('aside nav');
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toHaveClass(/bg-amber-50/);
    await expect(nav.getByRole('link', { name: 'Kompaniyalar' })).not.toHaveClass(/bg-amber-50/);

    await openSidebarIfCollapsed(page);
    await nav.getByRole('link', { name: 'Kompaniyalar' }).click();
    await expect(page).toHaveURL(/\/companies$/);
    await expect(nav.getByRole('link', { name: 'Kompaniyalar' })).toHaveClass(/bg-amber-50/);
    await expect(nav.getByRole('link', { name: 'Dashboard' })).not.toHaveClass(/bg-amber-50/);
  });

  // ============ FOYDALANUVCHI BO'LIMI ============

  test('sidebar da foydalanuvchi ma\'lumotlari ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    const user = await page.evaluate(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const name: string = user.name || user.full_name;
    expect(name).toBeTruthy();

    // Sidebar pastidagi foydalanuvchi bloki
    const sidebar = page.locator('aside div.border-t');
    // Avatar (ismning birinchi harfi), ism va telefon
    await expect(sidebar.locator('.bg-amber-100')).toHaveText(name.charAt(0).toUpperCase());
    await expect(sidebar.getByText(name, { exact: true })).toBeVisible();
    // #42: telefon bir xil ko'rinishda: +998 (90) 692-14-69
    const d = String(user.phone).replace(/\D/g, '');
    const shown = `+998 (${d.slice(3, 5)}) ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10, 12)}`;
    await expect(sidebar.getByText(shown, { exact: true })).toBeVisible();
  });

  // ============ LOGOUT ============

  test('chiqish tugmasi ishlashi kerak', async ({ page }) => {
    // Alohida token: logout server tomonda tokenni bekor qila boshlasa, worker keshidagi umumiy token buzilmaydi
    await loginViaAPI(page, undefined, undefined, { fresh: true });
    await page.goto('/dashboard');
    await openSidebarIfCollapsed(page);
    await page.getByRole('button', { name: 'Chiqish' }).click();
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull();

    // Qayta himoyalangan sahifaga kirib bo'lmaydi
    await page.goto('/dashboard');
    await page.waitForURL('**/login', { timeout: 10000 });
  });
});

// Avvalgi "Stub sahifalar (placeholder pages)" testlari o'rniga: /menu, /tables,
// /orders endi to'liq sahifalar va faqat kompaniya rollari uchun. Super admin
// ularni ochsa ProtectedRoute uni /dashboard ga qaytaradi.
test.describe('Rol bo\'yicha himoya (super admin)', () => {
  for (const path of ['/menu', '/tables', '/orders']) {
    test(`super admin ${path} ga kirsa dashboard ga qaytarilishi kerak`, async ({
      authenticatedPage: page,
    }) => {
      await page.goto(path);
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
    });
  }
});

// Company admin — har ishga tushishda API orqali yangi "QA E2E Admin <ts>" kompaniya yaratiladi.
test.describe('Company admin navigatsiyasi', () => {
  test.describe.configure({ mode: 'serial' });

  let creds: { phone: string; password: string; companyName: string };

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    creds = await createCompanyAdmin(request);
    await request.dispose();
  });

  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, creds.phone, creds.password);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible({ timeout: 10000 });
  });

  test('company admin uchun sidebar navigatsiya elementlari', async ({ page }) => {
    const sidebar = page.locator('aside');
    await expect(sidebar.getByRole('heading', { name: 'Kitchens.uz' }).locator('xpath=following-sibling::p')).toHaveText('Admin Panel');
    const nav = sidebar.locator('nav');
    await expect(nav.getByRole('link')).toHaveText(COMPANY_ADMIN_LINKS);
    await expect(nav.getByRole('link', { name: 'Kompaniyalar' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Tariflar' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Standart menyu' })).toHaveCount(0);
  });

  test('company admin dashboard da kompaniya bloki ko\'rsatilishi kerak', async ({ page }) => {
    // #25: "Bugungi ish" bloki doim; "Birinchi qadamlar" — restoran to'liq sozlanmaguncha
    await expect(page.getByRole('heading', { name: 'Bugungi ish' })).toBeVisible();
    await expect(page.getByText('Jami kompaniyalar')).toHaveCount(0);
  });

  test('company admin /companies ga kirsa dashboard ga qaytarilishi kerak', async ({ page }) => {
    await page.goto('/companies');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  for (const [name, path] of [['Menyu', '/menu'], ['Stollar', '/tables'], ['Buyurtmalar', '/orders']] as const) {
    test(`${name} sahifasi (${path}) to'liq sahifa sifatida ochilishi kerak`, async ({ page }) => {
      await openSidebarIfCollapsed(page);
      await page.locator('aside nav').getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { name, level: 1, exact: true })).toBeVisible({ timeout: 10000 });
      await expect(page.locator('aside nav').getByRole('link', { name, exact: true })).toHaveClass(/bg-amber-50/);
    });
  }
});
