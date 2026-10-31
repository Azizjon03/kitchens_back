import { test as base, expect, Page, APIRequestContext } from '@playwright/test';

// Login telefon + parol bilan (email emas). To'liq raqam: maska 998 ni o'zi qo'shmaydi.
const TEST_PHONE = process.env.TEST_PHONE || '998906921469';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password';

/**
 * Login via UI
 */
export async function loginViaUI(page: Page, phone = TEST_PHONE, password = TEST_PASSWORD) {
  await page.goto('/login');
  await page.fill('input#phone', phone);
  await page.fill('input#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

// Worker ichida token qayta ishlatiladi: backend `auth/login` ni IP bo'yicha
// 60 so'rov/daqiqaga cheklaydi (throttle:60,1,auth) — har test uchun alohida
// login qilinsa, suite ketma-ket ikki marta ishlaganda 429 olinadi.
const sessionCache = new Map<string, { token: string; user: unknown }>();

/**
 * Login via API (faster) and inject token into localStorage.
 * `fresh: true` — keshni chetlab yangi token oladi (masalan, logout testi tokenni bekor qiladi).
 */
export async function loginViaAPI(
  page: Page,
  phone = TEST_PHONE,
  password = TEST_PASSWORD,
  { fresh = false }: { fresh?: boolean } = {},
) {
  const key = `${phone}:${password}`;
  let session = fresh ? undefined : sessionCache.get(key);

  if (!session) {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    const response = await page.request.post(`${baseURL}/api/v1/auth/login`, {
      data: { phone: '+' + phone.replace(/\D/g, ''), password },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    expect(response.ok(), `API login (${phone}) xato: ${response.status()} ${await response.text()}`).toBeTruthy();
    const body = await response.json();
    session = { token: body.data.token, user: body.data.user };
    if (!fresh) sessionCache.set(key, session);
  }

  await page.goto('/login');
  await page.evaluate(({ t, u }) => {
    localStorage.setItem('access_token', t);
    localStorage.setItem('user', JSON.stringify(u));
  }, { t: session.token, u: session.user });
}

/**
 * Super admin API orqali yangi "QA E2E" kompaniya va uning egasini (company_admin)
 * yaratadi. Har chaqiriqda noyob nom/slug/telefon (timestamp). Dev bazada qoladi.
 */
export async function createCompanyAdmin(request: APIRequestContext) {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };

  const login = await request.post(`${baseURL}/api/v1/auth/login`, {
    data: { phone: '+' + TEST_PHONE.replace(/\D/g, ''), password: TEST_PASSWORD },
    headers,
  });
  expect(login.ok(), await login.text()).toBeTruthy();
  const token = (await login.json()).data.token;

  const ts = Date.now().toString();
  const phone = `99893${ts.slice(-7)}`;
  const password = 'password123';
  const companyName = `QA E2E Admin ${ts}`;

  const res = await request.post(`${baseURL}/api/v1/super/companies`, {
    data: {
      name: companyName,
      slug: `qa-e2e-admin-${ts}`,
      phone: `+99871${ts.slice(-7)}`,
      owner_full_name: 'QA E2E Admin',
      owner_phone: `+${phone}`,
      owner_password: password,
    },
    headers: { ...headers, Authorization: `Bearer ${token}` },
  });
  expect(res.status(), await res.text()).toBe(201);

  return { phone, password, companyName };
}

/**
 * Extended test fixture with authenticated page
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await loginViaAPI(page);
    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard');
    await use(page);
  },
});

export { expect };
