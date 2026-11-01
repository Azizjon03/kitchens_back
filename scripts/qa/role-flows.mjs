// Kitchens — rollar bo'yicha brauzer QA (kitchens-qa-expert, 3-faza).
// Har rol: menyu (sidebar) bo'limlari, ruxsat etilgan sahifalar xatosiz ochilishi,
// taqiqlangan sahifalardan /dashboard ga qaytarilishi; keyin real ish zanjiri UI orqali:
// ofitsiant buyurtma → oshpaz "Tayyor" → ofitsiant "Berildi" → kassir smena + to'lov + yopish,
// admin xodim qo'shadi, menejer taom qo'shadi.
//
// Ishga tushirish (repo ildizidan):
//   node scripts/qa/role-flows.mjs "$PWD/frontend/node_modules" <screenshot_dir> <users.json>
// users.json: {"company_admin":"9989...","manager":"...","waiter":"...","chef":"...","cashier":"..."}
// Parollar: admin Admin12345, xodimlar Staff12345 (api-flow.mjs yaratgan QA kompaniya).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(process.argv[2] + '/');
const { chromium } = require('@playwright/test');
const SHOTS = process.argv[3];
const USERS = JSON.parse(readFileSync(process.argv[4], 'utf8'));
const BASE = 'http://localhost:3001';
const T = Date.now().toString().slice(-6);

let pass = 0, fail = 0;
const log = (ok, m) => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); };

const PAGES = {
  '/dashboard': 'Dashboard', '/menu': 'Menyu', '/modifiers': "Qo'shimchalar", '/tables': 'Stollar',
  '/waiter': 'Ofitsiant', '/orders': 'Buyurtmalar', '/kitchen': 'Oshxona', '/kitchen-stations': "Oshxona bo'limlari", '/cash-shifts': 'Kassa',
  '/staff': 'Xodimlar', '/branches': 'Filiallar', '/public-page': 'Restoran sahifasi', '/telegram-bot': 'Telegram bot',
};
// Layout.tsx allNav va App.tsx requiredRole dan
const NAV = {
  company_admin: ['/dashboard', '/menu', '/modifiers', '/tables', '/waiter', '/orders', '/kitchen', '/kitchen-stations', '/cash-shifts', '/staff', '/public-page', '/branches', '/telegram-bot'],
  manager: ['/dashboard', '/menu', '/modifiers', '/tables', '/waiter', '/orders', '/kitchen', '/kitchen-stations'],
  waiter: ['/tables', '/waiter', '/orders'],
  chef: ['/kitchen'],
  cashier: ['/orders', '/cash-shifts'],
};
const HOME = { company_admin: '/dashboard', manager: '/dashboard', waiter: '/waiter', chef: '/kitchen', cashier: '/cash-shifts' };
const ROLE_UZ = { company_admin: 'Admin', manager: 'Menejer', waiter: 'Ofitsiant', chef: 'Oshpaz', cashier: 'Kassir' };

const browser = await chromium.launch();

async function session(role, viewport = { width: 1440, height: 900 }) {
  const page = await browser.newPage({ viewport });
  const problems = [];
  page.on('pageerror', (e) => problems.push(`JS: ${e.message}`));
  page.on('response', (r) => {
    const u = r.url();
    // /cash-shifts/current 404 = "ochiq smena yo'q" (API shartnomasi), xato emas
    if (u.includes('/cash-shifts/current') && r.status() === 404) return;
    if (u.includes('/api/') && r.status() >= 400) problems.push(`${r.status()} ${r.request().method()} ${u.replace(/^.*\/api/, '/api')}`);
  });
  await page.goto(`${BASE}/login`);
  await page.fill('#phone', USERS[role]);
  await page.fill('#password', role === 'company_admin' ? 'Admin12345' : 'Staff12345');
  await page.click('button[type=submit]');
  // Login rolning ish ekraniga olib boradi (homePathFor): oshpaz → /kitchen, ofitsiant → /waiter, kassir → /cash-shifts
  await page.waitForURL((u) => u.pathname === HOME[role], { timeout: 10000 });
  return { page, problems };
}

// ── 1. Har rol: menyu, ruxsat etilgan va taqiqlangan sahifalar ─────────
for (const role of Object.keys(NAV)) {
  const { page, problems } = await session(role);
  const R = ROLE_UZ[role];
  // #27: sahifalar lazy yuklanadi — sidebar chizilishini kutamiz
  await page.locator('aside nav a, nav a').first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
  const navLabels = (await page.locator('aside nav a, nav a').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  const expected = NAV[role].map((p) => PAGES[p]);
  const extra = navLabels.filter((l) => !expected.includes(l));
  const missing = expected.filter((l) => !navLabels.includes(l));
  log(extra.length === 0 && missing.length === 0, `${R}: menyu = [${navLabels.join(', ')}]${extra.length ? ` ortiqcha: ${extra}` : ''}${missing.length ? ` yo'q: ${missing}` : ''}`);

  // /dashboard rol uchun xatosiz ochiladimi (login har rolni shu yerga olib keladi)
  await page.waitForTimeout(1200);
  const dashProblems = problems.splice(0);
  log(dashProblems.length === 0, `${R}: login → ${HOME[role]} xatosiz${dashProblems.length ? ' — ' + dashProblems.join(' | ') : ''}`);

  for (const path of NAV[role]) {
    if (path === '/dashboard') continue;
    await page.goto(BASE + path);
    await page.waitForTimeout(1500);
    const url = new URL(page.url()).pathname;
    const errs = problems.splice(0);
    const alert = await page.getByRole('alert').count();
    log(url === path && errs.length === 0 && alert === 0, `${R}: ${path} ochiladi${url !== path ? ` (→ ${url})` : ''}${errs.length ? ' — ' + errs.join(' | ') : ''}${alert ? ' — sahifada xato bloki' : ''}`);
  }
  await page.screenshot({ path: `${SHOTS}/role-${role}-last.png` });

  const forbidden = Object.keys(PAGES).filter((p) => !NAV[role].includes(p) && p !== '/dashboard');
  const leaked = [];
  for (const path of forbidden) {
    await page.goto(BASE + path);
    await page.waitForTimeout(500);
    if (new URL(page.url()).pathname === path) leaked.push(path);
  }
  problems.splice(0);
  log(leaked.length === 0, `${R}: taqiqlangan ${forbidden.length} sahifa ${HOME[role]} ga qaytaradi${leaked.length ? ' — OCHILDI: ' + leaked.join(', ') : ''}`);
  await page.close();
}

// ── 2. Ish zanjiri UI orqali ──────────────────────────────────────────
// 2a. Ofitsiant: bo'sh stolga buyurtma (planshet 768)
const waiter = await session('waiter', { width: 768, height: 1024 });
let p = waiter.page;
await p.goto(`${BASE}/waiter`);
await p.waitForTimeout(1500);
const free = p.locator('button:not([disabled])', { hasText: "Bo'sh" }).first();
let tableNo = null;
if (await free.count()) {
  tableNo = (await free.innerText()).match(/#(\S+)/)?.[1];
  await free.click();
  const dialog = p.locator('div.fixed.inset-0').last();
  await dialog.getByRole('button', { name: /Osh/ }).first().click();
  const [resp] = await Promise.all([
    p.waitForResponse((r) => r.url().endsWith('/api/v1/orders') && r.request().method() === 'POST'),
    dialog.getByRole('button', { name: /Buyurtma berish/ }).click(),
  ]);
  log(resp.status() === 201, `Ofitsiant: stol #${tableNo} ga buyurtma berdi (HTTP ${resp.status()})`);
  var orderId = (await resp.json()).data?.id;
  await p.waitForTimeout(1200);
  log(await p.getByText(`Stol #${tableNo}`).count() > 0, `Ofitsiant: buyurtma "Faol buyurtmalar"da ko'rinadi`);
} else {
  log(false, "Ofitsiant: bo'sh stol topilmadi — zanjir to'xtadi");
}

// 2b. Oshpaz: KDS da ko'radi, "Tayyor"
if (orderId) {
  const chef = await session('chef', { width: 1920, height: 1080 });
  await chef.page.goto(`${BASE}/kitchen`);
  // Aniq "#ID" — "Stol #778" kabi matnlarga mos kelmasin
  const card = chef.page.locator('div.rounded-xl.border-2', { has: chef.page.getByText(`#${orderId}`, { exact: true }) });
  await card.waitFor({ timeout: 8000 }).catch(() => {});
  log(await card.count() === 1, `Oshpaz: buyurtma #${orderId} KDS da`);
  const [r] = await Promise.all([
    chef.page.waitForResponse((x) => x.url().includes(`/orders/${orderId}/kitchen-ready`)),
    card.getByRole('button', { name: /Tayyor/ }).click(),
  ]);
  log(r.status() === 200, `Oshpaz: "Tayyor" (HTTP ${r.status()})`);
  await chef.page.screenshot({ path: `${SHOTS}/role-chef-kds.png` });
  await chef.page.close();

  // 2c. Ofitsiant: real-time "tayyor" va "Berildi"
  await p.waitForTimeout(2500);
  const orderCard = p.locator('div.rounded-xl', { hasText: `Stol #${tableNo}` }).filter({ hasText: 'Tayyor' }).last();
  const serveBtn = orderCard.getByRole('button', { name: /Berildi/ });
  if (!(await serveBtn.count())) { await p.reload(); await p.waitForTimeout(1500); }
  const [r2] = await Promise.all([
    p.waitForResponse((x) => x.url().includes(`/orders/${orderId}/status`)),
    p.locator('div.rounded-xl', { hasText: `Stol #${tableNo}` }).getByRole('button', { name: /Berildi/ }).first().click(),
  ]);
  log(r2.status() === 200, `Ofitsiant: "Berildi" (HTTP ${r2.status()})`);
}
await p.close();

// 2d. Kassir: smena ochish → to'lov → smena yopish → hisobot
if (orderId) {
  const cashier = await session('cashier');
  p = cashier.page;
  await p.goto(`${BASE}/cash-shifts`);
  await p.waitForTimeout(1200);
  const openBtn = p.getByRole('button', { name: /^Smena ochish$/ });
  if (await openBtn.count()) {
    await openBtn.click();
    const dlg = p.locator('div.fixed.inset-0').last();
    await dlg.locator('input[type=number]').first().fill('100000');
    const [r] = await Promise.all([
      p.waitForResponse((x) => x.url().includes('/cash-shifts/open')),
      dlg.getByRole('button', { name: /^Ochish$/ }).click(),
    ]);
    log(r.status() === 201 || r.status() === 200, `Kassir: smena ochildi (HTTP ${r.status()})`);
  } else {
    log(true, 'Kassir: smena allaqachon ochiq');
  }
  await p.goto(`${BASE}/orders`);
  await p.locator('tbody tr', { hasText: `#${orderId}` }).first().click();
  await p.getByRole('button', { name: /^To'lov$/ }).click();
  const payDlg = p.locator('div.fixed.inset-0').last();
  const [pr] = await Promise.all([
    p.waitForResponse((x) => x.url().endsWith('/api/v1/payments')),
    payDlg.getByRole('button', { name: /To'lash/ }).click(),
  ]);
  log(pr.status() === 201, `Kassir: to'lov qabul qildi (HTTP ${pr.status()})`);
  await p.waitForTimeout(1000);
  await p.goto(`${BASE}/cash-shifts`);
  await p.waitForTimeout(1200);
  await p.getByRole('button', { name: /^Smena yopish$/ }).click();
  const closeDlg = p.locator('div.fixed.inset-0').last();
  const expectedTxt = await closeDlg.innerText();
  const expected = Number((expectedTxt.match(/Kutilgan summa:\s*([^\n]+)/) || [])[1]?.replace(/[.,]00\b/, '').replace(/\D/g, '') || 0);
  await closeDlg.locator('input[type=number]').first().fill(String(expected || 100000));
  const [cr] = await Promise.all([
    p.waitForResponse((x) => x.url().includes('/cash-shifts/close')),
    closeDlg.getByRole('button', { name: /^Yopish$/ }).click(),
  ]);
  log(cr.status() === 200, `Kassir: smena yopildi, kutilgan summa ${expected} (HTTP ${cr.status()})`);
  await p.screenshot({ path: `${SHOTS}/role-cashier-closed.png` });
  const cashierProblems = cashier.problems;
  log(cashierProblems.length === 0, `Kassir: kutilmagan API xatolari yo'q${cashierProblems.length ? ' — ' + cashierProblems.join(' | ') : ''}`);
  await p.close();
}

// 2e. Admin: xodim qo'shadi; Menejer: taom qo'shadi
{
  const admin = await session('company_admin');
  p = admin.page;
  await p.goto(`${BASE}/staff`);
  await p.getByRole('button', { name: /Yangi xodim/ }).click();
  const dlg = p.locator('div.fixed.inset-0').last();
  await dlg.getByPlaceholder('Xodim ismi').fill('QA Rol Kassir ' + T);
  await dlg.getByPlaceholder('+998 90 123-45-67').fill('+9989' + T.padStart(8, '7'));
  await dlg.locator('input[type=password]').first().fill('Staff12345');
  const sel = dlg.locator('select').first();
  if (await sel.count()) await sel.selectOption('cashier').catch(() => {});
  const [r] = await Promise.all([
    p.waitForResponse((x) => x.url().endsWith('/api/v1/users') && x.request().method() === 'POST'),
    dlg.locator('button[type=submit]').click(),
  ]);
  const body = await r.json().catch(() => ({}));
  // Free tarif: 5 xodim chegarasi — 422 + aniq xabar ham to'g'ri natija
  const limitMsg = body?.error?.code === 'PLAN_LIMIT_REACHED';
  await p.waitForTimeout(600);
  const shownLimit = limitMsg ? (await dlg.innerText()).includes('tarif') : true;
  log(r.status() === 201 || (limitMsg && shownLimit), `Admin: xodim qo'shish → HTTP ${r.status()}${limitMsg ? ` (tarif limiti, xabar ko'rindi: ${shownLimit})` : ''}`);
  await p.close();
}
{
  const mgr = await session('manager');
  p = mgr.page;
  await p.goto(`${BASE}/menu`);
  await p.waitForTimeout(1200);
  await p.getByRole('button', { name: /^Taom$/ }).click();
  // #29: avval standart katalog — undan "Yangisini yaratish"
  await p.getByRole('dialog').getByRole('button', { name: /Yangisini yaratish/ }).click();
  const dlg = p.locator('div.fixed.inset-0').last();
  await dlg.getByPlaceholder('Osh', { exact: true }).fill('QA Somsa ' + T);
  await dlg.getByPlaceholder('Плов', { exact: true }).fill('QA Самса ' + T);
  await dlg.getByPlaceholder('25000').fill('12000');
  const cat = dlg.locator('select').first();
  if (await cat.count()) { const n = await cat.locator('option').count(); if (n > 1) await cat.selectOption({ index: 1 }); }
  const [r] = await Promise.all([
    p.waitForResponse((x) => x.url().endsWith('/api/v1/menu-items') && x.request().method() === 'POST'),
    dlg.locator('button[type=submit]').click(),
  ]);
  log(r.status() === 201, `Menejer: menyuga taom qo'shdi (HTTP ${r.status()})`);
  await p.close();
}

await browser.close();
console.log(`\nJAMI: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
