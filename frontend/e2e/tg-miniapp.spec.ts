import { test, expect, type Page } from '@playwright/test';

/**
 * #35: Telegram Mini App — rasmli kartochkalar, taom oynasi va qo'shimcha soni
 * (oshga 2× go'sht). API mock qilinadi — baza va Telegram'ga bog'liq emas.
 */
const MENU = {
  company: { id: 1, name: 'Oliyaviy Restoran', primary_color: '#b45309' },
  service_charge_pct: 0,
  branches: [{ id: 7, name: 'Asosiy filial' }],
  menu: [
    { id: 10, name_uz: 'Milliy taomlar', parent_id: null, sort_order: 1, menu_items: [] },
    {
      id: 11, name_uz: 'Palov', parent_id: 10, sort_order: 1,
      menu_items: [
        {
          id: 100, category_id: 11, name_uz: "Osh (to'y oshi)", description_uz: "Devzira guruch, qo'y go'shti", sell_type: 'portion', price: 30000,
          image: null, is_available: true, is_popular: false, sort_order: 1, modifiers: [{ id: 5, name_uz: 'Piyozsiz', is_active: true }],
          addons: [
            { id: 1, name_uz: "Go'sht", price: 12000, is_active: true, max_quantity: 3 },
            { id: 2, name_uz: 'Qazi', price: 15000, is_active: true, max_quantity: 2 },
          ],
        },
        { id: 101, category_id: 11, name_uz: 'Non', sell_type: 'portion', price: 4000, image: null, is_available: true, is_popular: false, sort_order: 2, addons: [], modifiers: [] },
      ],
    },
  ],
};

// #39: ro'yxatdan o'tishdagi joylashuv — «Uy»
const ADDRESSES = [{ id: 7, label: 'Uy', address: 'Mustaqillik 12', latitude: 40.9983, longitude: 71.2372 }];

async function mockApi(page: Page) {
  await page.route('https://telegram.org/**', (r) => r.abort());
  await page.route('**/api/v1/tg/menu**', (r) => r.fulfill({ json: { success: true, data: MENU } }));
  await page.route('**/api/v1/tg/me?*', (r) => r.fulfill({ json: { success: true, data: { address: null, latitude: null, registered: true } } }));
  await page.route('**/api/v1/tg/addresses?*', (r) => r.fulfill({ json: { success: true, data: ADDRESSES } }));
}

test.describe('Telegram Mini App (#35)', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    // Har test yangi brauzer kontekstida — savat (localStorage) bo'sh
    await page.goto('/tg?company=oliyaviy&dev_id=1');
  });

  test('taom kartochkalari rasm (yoki naqsh) va narx bilan ko\'rinadi', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Oliyaviy Restoran' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Palov' })).toBeVisible();
    await expect(page.getByRole('img', { name: "Osh (to'y oshi)" })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Osh \(to'y oshi\), 30 000/ })).toBeVisible();
  });

  test('oshga 2× go\'sht qo\'shib buyurtma beriladi', async ({ page }) => {
    await page.getByRole('button', { name: /^Osh \(to'y oshi\),/ }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('button', { name: "Go'sht qo'shish" }).click();
    await sheet.getByRole('button', { name: "Go'sht: ko'paytirish" }).click();
    await sheet.getByRole('button', { name: 'Piyozsiz' }).click();
    await expect(sheet.getByRole('button', { name: /Qo'shish/ })).toContainText('54 000');
    await sheet.getByRole('button', { name: /Qo'shish/ }).click();

    // Go'sht ko'pi bilan 3 — 4-chisi bosilmaydi (oynani qayta ochib tekshiramiz)
    await page.getByRole('button', { name: /^Savat/ }).click();
    await expect(page.getByText("+ Go'sht ×2; Piyozsiz")).toBeVisible();
    await expect(page.getByRole('button', { name: /Buyurtma berish/ })).toContainText('54 000');

    let payload: { items: Array<{ addons: unknown; modifier_ids: number[] }> } | null = null;
    await page.route('**/api/v1/tg/orders?*', async (r) => {
      payload = r.request().postDataJSON();
      await r.fulfill({ status: 201, json: { success: true, data: { id: 501, status: 'preparing', type: 'takeaway', total: 54000, items: [] } } });
    });
    await page.route('**/api/v1/tg/orders/501?*', (r) => r.fulfill({ json: { success: true, data: { id: 501, status: 'preparing', type: 'takeaway', total: 54000, subtotal: 54000, items: [] } } }));
    await page.getByRole('button', { name: /Buyurtma berish/ }).click();
    await page.waitForURL('**/tg/order/501**');
    expect(payload!.items[0].addons).toEqual([{ id: 1, quantity: 2 }]);
    expect(payload!.items[0].modifier_ids).toEqual([5]);
  });

  test('qo\'shimcha soni cheklovdan oshmaydi, oddiy taom "+" bilan darhol qo\'shiladi', async ({ page }) => {
    await page.getByRole('button', { name: "Non — savatga qo'shish" }).click();
    await expect(page.getByRole('button', { name: /^Savat/ })).toContainText('4 000');

    await page.getByRole('button', { name: /^Osh \(to'y oshi\),/ }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('button', { name: "Qazi qo'shish" }).click();
    await sheet.getByRole('button', { name: "Qazi: ko'paytirish" }).click();
    await expect(sheet.getByRole('button', { name: "Qazi: ko'paytirish" })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  });

  test('yetkazib berish: saqlangan «Uy» yoki yangi manzil «Ish» nomi bilan', async ({ page }) => {
    await page.getByRole('button', { name: "Non — savatga qo'shish" }).click();
    await page.getByRole('button', { name: /^Savat/ }).click();
    await page.getByRole('radio', { name: 'Yetkazib bering' }).click();

    const picker = page.getByRole('radiogroup', { name: 'Yetkazib berish manzili' });
    await expect(picker.getByRole('radio', { name: /Uy/ })).toHaveAttribute('aria-checked', 'true');

    const bodies: Record<string, unknown>[] = [];
    await page.route('**/api/v1/tg/orders?*', async (r) => {
      bodies.push(r.request().postDataJSON());
      await r.fulfill({ status: 201, json: { success: true, data: { id: 502, status: 'pending', type: 'delivery', total: 4000, items: [] } } });
    });
    await page.route('**/api/v1/tg/orders/502?*', (r) => r.fulfill({ json: { success: true, data: { id: 502, status: 'pending', type: 'delivery', total: 4000, subtotal: 4000, items: [] } } }));

    // Boshqa manzil: yozilmaguncha buyurtma tugmasi yopiq
    await picker.getByRole('radio', { name: /Boshqa manzil/ }).click();
    await expect(page.getByRole('button', { name: /Buyurtma berish/ })).toBeDisabled();
    await page.getByLabel("Manzil va mo'ljal").fill("Navoiy 5, 2-qavat, bank yonida");
    await page.getByRole('button', { name: 'Ish', exact: true }).click();
    await page.getByRole('button', { name: /Buyurtma berish/ }).click();
    await page.waitForURL('**/tg/order/502**');
    await expect(page.getByText('Tasdiqlanmoqda').first()).toBeVisible();
    expect(bodies[0]).toMatchObject({ type: 'delivery', delivery_address: 'Navoiy 5, 2-qavat, bank yonida', save_address: true, address_label: 'Ish' });
  });
});
