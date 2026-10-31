import { test, expect } from './fixtures/auth';
import type { Page } from '@playwright/test';

/** "Yangi kompaniya" modali (role=dialog yo'q — sarlavhasi bo'yicha topamiz). */
function companyModal(page: Page) {
  return page
    .locator('div.fixed.inset-0')
    .filter({ has: page.getByRole('heading', { name: 'Yangi kompaniya' }) });
}

function companiesListResponse(page: Page, search?: string) {
  return page.waitForResponse((res) => {
    const url = new URL(res.url());
    if (!url.pathname.endsWith('/api/v1/super/companies') || res.request().method() !== 'GET') return false;
    return search === undefined ? true : url.searchParams.get('search') === search;
  });
}

test.describe('Kompaniyalar sahifasi (Companies)', () => {

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/companies');
    await expect(page.getByRole('heading', { name: 'Kompaniyalar', level: 1 })).toBeVisible({ timeout: 10000 });
    // Ro'yxat yuklanib bo'lguncha kutish
    await expect(page.getByRole('status')).toHaveCount(0, { timeout: 10000 });
  });

  // ============ SAHIFA RENDER ============

  test('kompaniyalar sahifasi to\'g\'ri renderlanishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByRole('heading', { name: 'Kompaniyalar', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Yangi kompaniya' })).toBeVisible();
    await expect(page.getByPlaceholder('Qidirish...')).toBeVisible();
  });

  // ============ JADVAL (TABLE) ============

  test('kompaniyalar jadvali ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    const table = page.getByRole('table');
    if ((await table.count()) === 0) {
      // Bo'sh holat (bazada kompaniya yo'q)
      await expect(page.getByText("Hali kompaniya qo'shilmagan")).toBeVisible();
      return;
    }
    for (const name of ['Nomi', 'Slug', 'Telefon', 'Holati', 'Amallar']) {
      await expect(table.getByRole('columnheader', { name })).toBeVisible();
    }
    await expect(table.locator('tbody tr').first()).toBeVisible();
  });

  test('yuklanayotganda "Kompaniyalar yuklanmoqda..." holati ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await page.route('**/api/v1/super/companies*', async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await page.reload();

    const loading = page.getByRole('status').filter({ hasText: 'Kompaniyalar yuklanmoqda...' });
    await expect(loading).toBeVisible({ timeout: 10000 });
    await expect(loading).toBeHidden({ timeout: 10000 });
  });

  // ============ QIDIRUV (SEARCH, server tomonda) ============

  test('qidiruv serverga search parametri bilan so\'rov yuborishi va natijani filtrlashi kerak', async ({
    authenticatedPage: page,
  }) => {
    const firstName = (await page.locator('tbody tr').first().locator('td').first().textContent())?.trim();
    test.skip(!firstName, 'Bazada kompaniya yo\'q — qidiruvni tekshirib bo\'lmaydi');

    const responsePromise = companiesListResponse(page, firstName!);
    await page.getByPlaceholder('Qidirish...').fill(firstName!);
    const response = await responsePromise; // 300 ms debounce'dan keyin
    expect(response.ok()).toBeTruthy();

    const rows = page.locator('tbody tr');
    await expect(rows.first()).toContainText(firstName!);
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      // Server nom yoki slug bo'yicha (katta-kichik harfsiz) qidiradi
      const text = (await rows.nth(i).textContent())!.toLowerCase();
      const needle = firstName!.toLowerCase();
      const slugNeedle = needle.replace(/[^a-z0-9]+/g, '-');
      expect(text.includes(needle) || text.includes(slugNeedle)).toBeTruthy();
    }
  });

  test('natija topilmasa bo\'sh holat va "Qidiruvni tozalash" ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    const initialRows = await page.locator('tbody tr').count();
    const query = `nonexistent_xyz_${Date.now()}`;

    const searchInput = page.getByPlaceholder('Qidirish...');
    await searchInput.fill(query);

    await expect(page.getByText(`"${query}" bo'yicha kompaniya topilmadi`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('tbody tr')).toHaveCount(0);

    await page.getByRole('button', { name: 'Qidiruvni tozalash' }).click();
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('tbody tr')).toHaveCount(initialRows, { timeout: 10000 });
  });

  // ============ SAHIFALASH (PAGINATION) ============

  test('sahifalash "Keyingi"/"Oldingi" tugmalari ishlashi kerak', async ({
    authenticatedPage: page,
  }) => {
    const pageInfo = page.getByText(/Sahifa \d+ \/ \d+/);
    test.skip((await pageInfo.count()) === 0, 'Faqat bitta sahifa kompaniya bor — sahifalash ko\'rinmaydi');

    await expect(pageInfo).toContainText('Sahifa 1 /');
    const prev = page.getByRole('button', { name: 'Oldingi' });
    const next = page.getByRole('button', { name: 'Keyingi' });
    await expect(prev).toBeDisabled();

    const firstRowPage1 = await page.locator('tbody tr').first().textContent();
    await next.click();
    await expect(pageInfo).toContainText('Sahifa 2 /');
    await expect(prev).toBeEnabled();
    await expect(page.locator('tbody tr').first()).not.toHaveText(firstRowPage1!);

    await prev.click();
    await expect(pageInfo).toContainText('Sahifa 1 /');
  });

  // ============ MODAL — KOMPANIYA QO'SHISH ============

  test('"Yangi kompaniya" modal ochilib yopilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    const modal = companyModal(page);

    // X tugmasi bilan yopish
    await page.getByRole('button', { name: 'Yangi kompaniya' }).click();
    await expect(modal).toBeVisible({ timeout: 5000 });
    await modal.getByRole('heading', { name: 'Yangi kompaniya' }).locator('xpath=following-sibling::button').click();
    await expect(modal).toBeHidden({ timeout: 5000 });

    // "Bekor qilish" bilan yopish
    await page.getByRole('button', { name: 'Yangi kompaniya' }).click();
    await expect(modal).toBeVisible({ timeout: 5000 });
    await modal.getByRole('button', { name: 'Bekor qilish' }).click();
    await expect(modal).toBeHidden({ timeout: 5000 });
  });

  test('modal form maydonlari to\'g\'ri ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole('button', { name: 'Yangi kompaniya' }).click();
    const modal = companyModal(page);
    await expect(modal).toBeVisible();

    // Label'lar input bilan bog'lanmagan (htmlFor yo'q) — label matni + placeholder bo'yicha tekshiramiz
    for (const label of ['Kompaniya nomi', 'Slug', 'Telefon', "To'liq ism", 'Telefon raqam', 'Email (ixtiyoriy)', 'Parol']) {
      await expect(modal.locator('label', { hasText: new RegExp(`^${label.replace(/[()]/g, '\\$&')}$`) })).toBeVisible();
    }
    await expect(modal.getByText('Egasi (Owner)')).toBeVisible();

    await expect(modal.getByPlaceholder('Milliy taomlar')).toBeVisible();
    await expect(modal.getByPlaceholder('milliy-taomlar')).toBeVisible();
    // Kompaniya telefoni va egasi telefoni — ikkita maskali input
    await expect(modal.getByPlaceholder('+998 (90) 123-45-67')).toHaveCount(2);
    await expect(modal.getByPlaceholder('Ism Familiya')).toBeVisible();
    await expect(modal.getByPlaceholder('owner@example.com')).toBeVisible();
    const password = modal.getByPlaceholder('Kamida 8 ta belgi');
    await expect(password).toBeVisible();
    await expect(password).toHaveAttribute('minlength', '8');

    await expect(modal.getByRole('button', { name: 'Bekor qilish' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Yaratish' })).toBeVisible();
  });

  test('kompaniya nomi kiritilganda slug avtomatik generatsiya qilinishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole('button', { name: 'Yangi kompaniya' }).click();
    const modal = companyModal(page);

    await modal.getByPlaceholder('Milliy taomlar').fill('Test Kompaniya 2');
    await expect(modal.getByPlaceholder('milliy-taomlar')).toHaveValue('test-kompaniya-2');
  });

  test('telefon maydonlari kiritilganda maska qo\'llanishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole('button', { name: 'Yangi kompaniya' }).click();
    const phones = companyModal(page).getByPlaceholder('+998 (90) 123-45-67');

    await phones.nth(0).pressSequentially('998901234567');
    await expect(phones.nth(0)).toHaveValue('+998 (90) 123-45-67');
    await phones.nth(1).pressSequentially('998712000000');
    await expect(phones.nth(1)).toHaveValue('+998 (71) 200-00-00');
  });

  test('bo\'sh form yuborilmasligi kerak (validatsiya)', async ({
    authenticatedPage: page,
  }) => {
    let postSent = false;
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/v1/super/companies')) postSent = true;
    });

    await page.getByRole('button', { name: 'Yangi kompaniya' }).click();
    const modal = companyModal(page);
    await modal.getByRole('button', { name: 'Yaratish' }).click();

    // HTML5 required — modal ochiq qoladi, so'rov ketmaydi
    await expect(modal).toBeVisible();
    const nameInvalid = await modal
      .getByPlaceholder('Milliy taomlar')
      .evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(nameInvalid).toBeTruthy();
    expect(postSent).toBeFalsy();
  });

  test('yangi kompaniya yaratish (to\'liq flow)', async ({
    authenticatedPage: page,
  }) => {
    const ts = Date.now().toString();
    const companyName = `QA E2E ${ts}`;
    const expectedSlug = `qa-e2e-${ts}`;
    // Har ishga tushishda noyob raqamlar: 99890 + timestampning oxirgi 7 raqami
    const tail = ts.slice(-7);
    const companyPhone = `99871${tail}`;
    const ownerPhone = `99890${tail}`;

    await page.getByRole('button', { name: 'Yangi kompaniya' }).click();
    const modal = companyModal(page);

    await modal.getByPlaceholder('Milliy taomlar').fill(companyName);
    await expect(modal.getByPlaceholder('milliy-taomlar')).toHaveValue(expectedSlug);

    const phones = modal.getByPlaceholder('+998 (90) 123-45-67');
    await phones.nth(0).fill(companyPhone);
    await modal.getByPlaceholder('Ism Familiya').fill('QA E2E Owner');
    await phones.nth(1).fill(ownerPhone);
    await modal.getByPlaceholder('owner@example.com').fill(`qa-e2e-${ts}@example.com`);
    await modal.getByPlaceholder('Kamida 8 ta belgi').fill('password123');

    const createResponse = page.waitForResponse(
      (res) => res.url().includes('/api/v1/super/companies') && res.request().method() === 'POST',
    );
    await modal.getByRole('button', { name: 'Yaratish' }).click();
    const res = await createResponse;
    expect(res.status(), await res.text()).toBe(201);

    const body = await res.json();
    expect(body.data.slug).toBe(expectedSlug);

    // Muvaffaqiyat — modal yopiladi, kompaniya qidiruvda topiladi
    await expect(modal).toBeHidden({ timeout: 10000 });
    await page.getByPlaceholder('Qidirish...').fill(companyName);
    const row = page.locator('tbody tr').filter({ hasText: companyName });
    await expect(row).toHaveCount(1, { timeout: 10000 });
    await expect(row).toContainText(expectedSlug);
    await expect(row).toContainText(`+${companyPhone}`);
  });

  // ============ NAVIGATSIYA ============

  test('kompaniya "Batafsil" tugmasi detail sahifaga olib borishi kerak', async ({
    authenticatedPage: page,
  }) => {
    const detailLink = page.getByRole('link', { name: 'Batafsil' });
    test.skip((await detailLink.count()) === 0, 'Bazada kompaniya yo\'q');

    await detailLink.first().click();
    await page.waitForURL(/\/companies\/\d+$/, { timeout: 10000 });
  });

  test('jadval qatorini bosish detail sahifaga olib borishi kerak', async ({
    authenticatedPage: page,
  }) => {
    const firstRow = page.locator('tbody tr').first();
    test.skip((await firstRow.count()) === 0, 'Bazada kompaniya yo\'q');

    const name = (await firstRow.locator('td').first().textContent())!.trim();
    await firstRow.locator('td').first().click();
    await page.waitForURL(/\/companies\/\d+$/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Kompaniya tafsilotlari (Company Detail)', () => {

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/companies');
    const detailLink = page.getByRole('link', { name: 'Batafsil' });
    await expect(detailLink.first().or(page.getByText("Hali kompaniya qo'shilmagan"))).toBeVisible({ timeout: 10000 });
    test.skip((await detailLink.count()) === 0, 'Bazada kompaniya yo\'q');

    await detailLink.first().click();
    await page.waitForURL(/\/companies\/\d+$/, { timeout: 10000 });
  });

  test('kompaniya ma\'lumotlari ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByText('Telefon', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Yaratilgan sana', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Kompaniyalarga qaytish' })).toBeVisible();
  });

  test('"Kompaniyalarga qaytish" tugmasi ishlashi kerak', async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole('link', { name: 'Kompaniyalarga qaytish' }).click();
    await page.waitForURL(/\/companies$/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Kompaniyalar', level: 1 })).toBeVisible();
  });
});
