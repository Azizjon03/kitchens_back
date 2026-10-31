import { test, expect, loginViaUI } from './fixtures/auth';

// Fixture super admin (998906921469) bilan kiradi — super admin dashboardi tekshiriladi.
test.describe('Dashboard sahifasi', () => {
  test('dashboard sahifasi sarlavha va xush kelibsiz matnini ko\'rsatishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/^Xush kelibsiz, .+!$/)).toBeVisible();
  });

  test('super admin uchun 4 ta stat karta ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    const main = page.getByRole('main');
    for (const title of ['Jami kompaniyalar', 'Jami foydalanuvchilar', 'Jami buyurtmalar', 'Jami daromad']) {
      await expect(main.getByText(title, { exact: true })).toBeVisible({ timeout: 10000 });
    }
    // Daromad so'mda formatlanadi
    await expect(main.getByText(/so'm$/)).toBeVisible();
  });

  test('tizim holati kartasi ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByRole('heading', { name: 'Tizim holati' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Tizim barqaror ishlayapti', { exact: false })).toBeVisible();
  });

  test('loading skeleton ko\'rsatilishi kerak', async ({ page }) => {
    // Stat API ni sekinlashtirish
    await page.route('**/api/v1/super/dashboard', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.continue();
    });

    await loginViaUI(page);

    // API javobi kelguncha skeleton kartalar, keyin haqiqiy kartalar
    const skeletons = page.getByRole('main').locator('.animate-pulse');
    await expect(skeletons).toHaveCount(4);
    await expect(page.getByText('Jami kompaniyalar', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(skeletons).toHaveCount(0);
  });
});
