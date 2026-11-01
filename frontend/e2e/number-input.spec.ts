import { test, expect } from './fixtures/auth';

/** Raqam maydoni: "0" ustiga yozilganda "01" bo'lmaydi, bo'sh qoldirilsa min qo'yiladi. */
test('raqam maydoni 0 ni almashtiradi va min dan pastga tushmaydi', async ({ authenticatedPage: page }) => {
  await page.goto('/plans');
  await page.getByRole('button', { name: 'Yangi tarif' }).click();

  const price = page.getByLabel("Oylik narx (so'm)");
  await expect(price).toHaveValue('0');
  await price.click();
  await page.keyboard.type('150000');
  await expect(price).toHaveValue('150000');

  // Harf va ortiqcha nol kirmaydi
  await price.fill('');
  await page.keyboard.type('00a12');
  await expect(price).toHaveValue('12');

  // Bo'sh qoldirilsa — eng kam qiymat (min=0)
  await price.fill('');
  await page.getByLabel('Max filiallar (-1 = cheksiz)').click();
  await expect(price).toHaveValue('0');
});
