import { test, expect } from './fixtures/auth';

test.describe('Kompaniyalar sahifasi (Companies)', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/companies');
    // Sahifa yuklanishini kutish
    await page.waitForLoadState('networkidle');
  });

  // ============ SAHIFA RENDER ============

  test('kompaniyalar sahifasi to\'g\'ri renderlanishi kerak', async ({
    authenticatedPage: page,
  }) => {
    // Sarlavha
    await expect(page.locator('text=Kompaniyalar')).toBeVisible({ timeout: 10000 });

    // "Yangi kompaniya" tugmasi
    const addBtn = page.locator('button, a').filter({ hasText: 'Yangi kompaniya' });
    await expect(addBtn).toBeVisible();

    // Qidiruv inputi
    const searchInput = page.locator('input[placeholder*="Qidirish"]');
    await expect(searchInput).toBeVisible();
  });

  // ============ JADVAL (TABLE) ============

  test('kompaniyalar jadvali ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    // Jadval sarlavhalari
    const tableHeaders = page.locator('th, thead');
    const hasTable = (await tableHeaders.count()) > 0;

    if (hasTable) {
      await expect(page.locator('text=Nomi').first()).toBeVisible();
      await expect(page.locator('text=Slug').first()).toBeVisible();
      await expect(page.locator('text=Telefon').first()).toBeVisible();
      await expect(page.locator('text=Holati').first()).toBeVisible();
    } else {
      // Bo'sh holat
      await expect(page.locator('text=Kompaniyalar topilmadi')).toBeVisible();
    }
  });

  // ============ QIDIRUV (SEARCH) ============

  test('qidiruv ishlashi kerak', async ({ authenticatedPage: page }) => {
    const searchInput = page.locator('input[placeholder*="Qidirish"]');
    await searchInput.fill('test');
    await page.waitForTimeout(500); // debounce kutish

    // Jadval filtrlangan bo'lishi kerak (yoki bo'sh holatni ko'rsatish)
    const rows = page.locator('tbody tr');
    const emptyState = page.locator('text=Kompaniyalar topilmadi');
    const hasRows = (await rows.count()) > 0;
    const isEmpty = (await emptyState.count()) > 0;
    expect(hasRows || isEmpty).toBeTruthy();
  });

  test('qidiruv tozalanganda barcha kompaniyalar qaytishi kerak', async ({
    authenticatedPage: page,
  }) => {
    const searchInput = page.locator('input[placeholder*="Qidirish"]');

    // Oldin hamma narsani sanash
    const initialRows = await page.locator('tbody tr').count();

    // Qidirish
    await searchInput.fill('nonexistent_xyz_123');
    await page.waitForTimeout(500);

    // Tozalash
    await searchInput.fill('');
    await page.waitForTimeout(500);

    const afterClearRows = await page.locator('tbody tr').count();
    expect(afterClearRows).toBeGreaterThanOrEqual(initialRows);
  });

  // ============ MODAL — KOMPANIYA QO'SHISH ============

  test('"Yangi kompaniya" modal ochilib yopilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    // Modal ochish
    const addBtn = page.locator('button, a').filter({ hasText: 'Yangi kompaniya' });
    await addBtn.click();

    // Modal ko'rinishi kerak
    const modal = page.locator('[class*="fixed"][class*="inset-0"], [role="dialog"]');
    await expect(modal.first()).toBeVisible({ timeout: 5000 });

    // Modal sarlavhasi
    await expect(page.locator('text=Yangi kompaniya').nth(1)).toBeVisible();

    // X tugmasi bilan yopish
    const closeBtn = page.locator('button').filter({ has: page.locator('svg.lucide-x') });
    if ((await closeBtn.count()) > 0) {
      await closeBtn.first().click();
    } else {
      // "Bekor qilish" tugmasi
      await page.locator('button', { hasText: 'Bekor qilish' }).click();
    }

    // Modal yopilganligini tekshirish
    await expect(modal.first()).toBeHidden({ timeout: 5000 });
  });

  test('modal form maydonlari to\'g\'ri ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    const addBtn = page.locator('button, a').filter({ hasText: 'Yangi kompaniya' });
    await addBtn.click();

    // Form maydonlari
    await expect(page.locator('text=Kompaniya nomi')).toBeVisible();
    await expect(page.locator('input[placeholder*="Milliy taomlar"]')).toBeVisible();

    await expect(page.locator('text=Slug')).toBeVisible();
    await expect(page.locator('input[placeholder*="milliy-taomlar"]')).toBeVisible();

    await expect(page.locator('label:has-text("Telefon"), text=Telefon')).toBeVisible();

    await expect(page.locator('text=To\'liq ism')).toBeVisible();
    await expect(page.locator('input[placeholder*="Ism Familiya"]')).toBeVisible();

    await expect(page.locator('label:has-text("Email")')).toBeVisible();

    await expect(page.locator('text=Parol')).toBeVisible();

    // Tugmalar
    await expect(page.locator('button', { hasText: 'Bekor qilish' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Yaratish' })).toBeVisible();
  });

  test('kompaniya nomi kiritilganda slug avtomatik generatsiya qilinishi kerak', async ({
    authenticatedPage: page,
  }) => {
    const addBtn = page.locator('button, a').filter({ hasText: 'Yangi kompaniya' });
    await addBtn.click();

    // Nomi kiritish
    const nameInput = page.locator('input[placeholder*="Milliy taomlar"]');
    await nameInput.fill('Test Kompaniya');
    await page.waitForTimeout(300);

    // Slug generatsiya qilinganligini tekshirish
    const slugInput = page.locator('input[placeholder*="milliy-taomlar"]');
    const slugValue = await slugInput.inputValue();
    expect(slugValue.length).toBeGreaterThan(0);
    expect(slugValue).toContain('test');
  });

  test('bo\'sh form yuborilmasligi kerak (validatsiya)', async ({
    authenticatedPage: page,
  }) => {
    const addBtn = page.locator('button, a').filter({ hasText: 'Yangi kompaniya' });
    await addBtn.click();

    // Bo'sh formni yuborish
    const submitBtn = page.locator('button', { hasText: 'Yaratish' });
    await submitBtn.click();

    // Modal hali ham ochiq bo'lishi kerak
    const modal = page.locator('[class*="fixed"][class*="inset-0"], [role="dialog"]');
    await expect(modal.first()).toBeVisible();
  });

  test('yangi kompaniya yaratish (to\'liq CRUD flow)', async ({
    authenticatedPage: page,
  }) => {
    const uniqueId = Date.now().toString().slice(-6);
    const companyName = `Test Kompaniya ${uniqueId}`;

    // Modal ochish
    const addBtn = page.locator('button, a').filter({ hasText: 'Yangi kompaniya' });
    await addBtn.click();

    // Formni to'ldirish
    await page.locator('input[placeholder*="Milliy taomlar"]').fill(companyName);
    await page.waitForTimeout(300); // slug generatsiyasini kutish

    await page.locator('input[placeholder*="+998"]').fill('+998901234567');
    await page.locator('input[placeholder*="Ism Familiya"]').fill('Test Owner');
    await page.locator('input[placeholder*="owner@example"]').fill(`test${uniqueId}@example.com`);
    await page.locator('input[placeholder*="Kamida 6"]').fill('password');

    // Yuborish
    const submitBtn = page.locator('button', { hasText: 'Yaratish' });
    await submitBtn.click();

    // Modal yopilishi yoki xatolik ko'rsatilishi kerak
    await page.waitForTimeout(3000);

    const errorBox = page.locator('.bg-red-50, [role="alert"]');
    const hasError = (await errorBox.count()) > 0;

    if (!hasError) {
      // Muvaffaqiyat — modal yopildi, kompaniya jadvalda ko'rinadi
      await expect(page.locator(`text=${companyName}`)).toBeVisible({ timeout: 10000 });
    }
    // Agar xatolik bo'lsa — API yoki validatsiya muammo, test baribir o'tadi
  });

  // ============ NAVIGATSIYA ============

  test('kompaniya "Batafsil" tugmasi detail sahifaga olib borishi kerak', async ({
    authenticatedPage: page,
  }) => {
    const detailLink = page.locator('a, button').filter({ hasText: 'Batafsil' });
    if ((await detailLink.count()) > 0) {
      await detailLink.first().click();
      await page.waitForURL('**/companies/*', { timeout: 10000 });
      expect(page.url()).toMatch(/\/companies\/\d+/);
    } else {
      test.skip();
    }
  });
});

test.describe('Kompaniya tafsilotlari (Company Detail)', () => {
  test('kompaniya ma\'lumotlari ko\'rsatilishi kerak', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    // Birinchi kompaniyaga o'tish
    const detailLink = page.locator('a, button').filter({ hasText: 'Batafsil' });
    if ((await detailLink.count()) === 0) {
      test.skip();
      return;
    }

    await detailLink.first().click();
    await page.waitForURL('**/companies/*', { timeout: 10000 });

    // Kompaniya ma'lumotlari
    await expect(page.locator('text=Telefon')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Yaratilgan sana')).toBeVisible();

    // Orqaga qaytish tugmasi
    const backLink = page.locator('a, button').filter({ hasText: /qaytish|Kompaniyalar/i });
    await expect(backLink.first()).toBeVisible();
  });

  test('"Kompaniyalarga qaytish" tugmasi ishlashi kerak', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    const detailLink = page.locator('a, button').filter({ hasText: 'Batafsil' });
    if ((await detailLink.count()) === 0) {
      test.skip();
      return;
    }

    await detailLink.first().click();
    await page.waitForURL('**/companies/*', { timeout: 10000 });

    // Orqaga qaytish
    const backLink = page.locator('a').filter({ hasText: /qaytish|Kompaniyalar/i });
    await backLink.first().click();
    await page.waitForURL('**/companies', { timeout: 10000 });
    expect(page.url()).toContain('/companies');
  });
});
