import { test as base, expect, Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@kitchens.uz';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password';

/**
 * Login via UI
 */
export async function loginViaUI(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await page.goto('/login');
  await page.fill('input#email', email);
  await page.fill('input#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

/**
 * Login via API (faster) and inject token into localStorage
 */
export async function loginViaAPI(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  const response = await page.request.post(`${baseURL}/api/v1/auth/login`, {
    data: { email, password },
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (response.ok()) {
    const body = await response.json();
    const token = body.data.token;
    const user = body.data.user;

    await page.goto('/login');
    await page.evaluate(({ t, u }) => {
      localStorage.setItem('access_token', t);
      localStorage.setItem('user', JSON.stringify(u));
    }, { t: token, u: user });
  } else {
    await loginViaUI(page, email, password);
  }
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
