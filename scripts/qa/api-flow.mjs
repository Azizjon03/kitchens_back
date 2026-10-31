// Kitchens end-to-end API QA (kitchens-qa-expert, 2-faza).
// Ishga tushirish (repo ildizidan):
//   node scripts/qa/api-flow.mjs http://localhost:8000 localhost 8082 kitchens-key password "$PWD/frontend/node_modules"
// Argumentlar: <API_BASE> <WS_HOST> <WS_PORT> <REVERB_KEY> <SUPER_ADMIN_PAROL> <frontend/node_modules>
// Har ishga tushishda yangi "QA Restoran <T>" kompaniyasi yaratiladi (o'chirilmaydi).
import { createRequire } from 'node:module';
const [, , BASE, WS_HOST, WS_PORT, RKEY, SUPER_PASS, NM] = process.argv;
const require = createRequire(NM + '/');
const _P = require('pusher-js'); const Pusher = _P.default || _P.Pusher || _P;

const results = [];
const T = Date.now().toString().slice(-6);
let pass = 0, fail = 0;
function check(name, ok, info = '') {
  results.push({ name, ok, info });
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`);
}
async function api(method, path, body, token, extraHeaders = {}) {
  const res = await fetch(BASE + '/api/v1' + path, {
    method,
    headers: {
      Accept: 'application/json', 'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}), ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json, data: json?.data };
}
const err = (r) => `${r.status} ${JSON.stringify(r.json?.error ?? r.json?.errors ?? r.json?.message ?? '').slice(0, 160)}`;
async function login(phone, password) {
  const r = await api('POST', '/auth/login', { phone, password });
  return { r, token: r.data?.token, user: r.data?.user };
}

function listen(token, channel) {
  const events = [];
  const p = new Pusher(RKEY, {
    wsHost: WS_HOST, wsPort: +WS_PORT, wssPort: +WS_PORT, forceTLS: WS_PORT === '443',
    enabledTransports: ['ws', 'wss'], disableStats: true, cluster: 'mt1',
    channelAuthorization: { endpoint: BASE + '/api/broadcasting/auth', headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } },
  });
  const ch = p.subscribe('private-' + channel);
  const ready = new Promise((resolve) => {
    ch.bind('pusher:subscription_succeeded', () => resolve(true));
    ch.bind('pusher:subscription_error', (e) => resolve('ERR ' + JSON.stringify(e).slice(0, 120)));
    setTimeout(() => resolve('timeout'), 8000);
  });
  ch.bind_global((name, data) => { if (!name.startsWith('pusher')) events.push({ name, data }); });
  return { p, ready, events };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 5000) { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await wait(150); } return false; }

(async () => {
  // ── 1. Auth ───────────────────────────────────────────
  const sa = await login('+998906921469', SUPER_PASS);
  check('Super admin login', !!sa.token && sa.user?.role === 'super_admin', err(sa.r));
  const bad = await login('+998906921469', 'wrong-pass');
  check("Noto'g'ri parol 401", bad.r.status === 401, err(bad.r));
  const noPhone = await api('POST', '/super/companies', { name: 'x', slug: 'np-' + T, owner_full_name: 'x', owner_phone: '+998900000008', owner_password: 'Admin12345' }, sa.token);
  check('Telefonsiz kompaniya 422 (500 emas)', noPhone.status === 422, err(noPhone));
  const noAuth = await api('GET', '/auth/me');
  check('Tokensiz /me 401', noAuth.status === 401, err(noAuth));

  // ── 2. Super admin: kompaniya + admin ─────────────────
  const plans = await api('GET', '/super/plans', null, sa.token);
  check('Tariflar ro\'yxati (3 ta)', plans.status === 200 && (plans.data?.length ?? plans.data?.data?.length) === 3, err(plans));
  const slug = 'qa-' + T;
  const adminPhone = '+99890' + T.padStart(7, '1');
  const co = await api('POST', '/super/companies', {
    name: 'QA Restoran ' + T, slug, phone: '+998712000000',
    owner_full_name: 'QA Admin', owner_phone: adminPhone, owner_password: 'Admin12345',
  }, sa.token);
  check('Kompaniya yaratish (admin bilan)', co.status === 201, err(co));
  const companyId = co.data?.id;
  const dup = await api('POST', '/super/companies', { name: 'x', slug, owner_full_name: 'x', owner_phone: '+998900000009', owner_password: 'Admin12345' }, sa.token);
  check('Takroriy slug 422', dup.status === 422, err(dup));
  const coShow = await api('GET', '/super/companies/' + companyId, null, sa.token);
  check('Kompaniya tafsiloti', coShow.status === 200, err(coShow));
  const coList = await api('GET', '/super/companies?search=' + slug, null, sa.token);
  check('Kompaniyalar qidiruvi', coList.status === 200 && JSON.stringify(coList.data).includes(slug), err(coList));

  const adm = await login(adminPhone, 'Admin12345');
  check('Kompaniya admini login qila oladi', !!adm.token && adm.user?.role === 'company_admin', err(adm.r));
  const A = adm.token;
  const saOnly = await api('GET', '/super/companies', null, A);
  check('company_admin super endpointga kira olmaydi (403)', saOnly.status === 403, err(saOnly));

  // ── 3. Filial, xodimlar ───────────────────────────────
  // Kompaniya "Asosiy filial" bilan yaratiladi (#21)
  const brs = await api('GET', '/branches', null, A);
  const brList = brs.data?.data ?? brs.data ?? [];
  check('Kompaniyada "Asosiy filial" avtomatik', brs.status === 200 && brList.length === 1 && brList[0].name === 'Asosiy filial', err(brs));
  const branchId = brList[0]?.id;
  const br2 = await api('POST', '/branches', { name: 'Ikkinchi filial' }, A);
  check('Free tarif: 2-filial rad etiladi', br2.status >= 400 && br2.status < 500, err(br2));

  const staff = {};
  for (const [i, role] of ['waiter', 'chef', 'cashier', 'manager'].entries()) {
    const phone = '+99891' + T.padStart(6, '0') + i;
    const u = await api('POST', '/users', { name: 'QA ' + role, phone, role, branch_id: branchId, password: 'Staff12345' }, A);
    check(`Xodim yaratish: ${role}`, u.status === 201, err(u));
    const l = await login(phone, 'Staff12345');
    check(`Xodim login: ${role}`, !!l.token && l.user?.role === role, err(l.r));
    staff[role] = l.token;
  }
  const badRole = await api('POST', '/users', { name: 'x', phone: '+998919999999', role: 'super_admin', password: 'Staff12345' }, A);
  check('super_admin rolini berib bo\'lmaydi (422)', badRole.status === 422, err(badRole));

  // ── 4. Menyu va stol ──────────────────────────────────
  const cat = await api('POST', '/categories', { name_uz: 'Issiq taomlar', name_ru: 'Горячие блюда' }, A);
  check('Kategoriya yaratish', cat.status === 201, err(cat));
  const item = await api('POST', '/menu-items', { category_id: cat.data?.id, name_uz: 'Osh', name_ru: 'Плов', price: 45000 }, A);
  check('Taom yaratish (porsiya)', item.status === 201, err(item));
  const wItem = await api('POST', '/menu-items', { category_id: cat.data?.id, name_uz: 'Shashlik', name_ru: 'Шашлык', price: 200000, sell_type: 'weight', min_weight: 0.2, weight_step: 0.1 }, A);
  check('Taom yaratish (vazn bo\'yicha)', wItem.status === 201, err(wItem));
  const negPrice = await api('POST', '/menu-items', { category_id: cat.data?.id, name_uz: 'x', name_ru: 'x', price: -5 }, A);
  check('Manfiy narx 422', negPrice.status === 422, err(negPrice));
  const chefMenu = await api('POST', '/categories', { name_uz: 'x', name_ru: 'x' }, staff.chef);
  check('Oshpaz menyu yarata olmaydi (403)', chefMenu.status === 403, err(chefMenu));
  const tbl = await api('POST', '/tables', { number: 'A1', seats: 4, branch_id: branchId }, A);
  check('Stol yaratish', tbl.status === 201, err(tbl));
  const posMenu = await api('GET', '/pos/menu', null, staff.waiter);
  check('Ofitsiant POS menyusi', posMenu.status === 200 && JSON.stringify(posMenu.data).includes('Osh'), err(posMenu));

  // ── 5. Real-time: KDS kanali ──────────────────────────
  const channel = `kitchen.${companyId}.${branchId}`;
  const kds = listen(staff.chef, channel);
  const sub = await kds.ready;
  check('Oshpaz KDS kanaliga ulanadi (WebSocket)', sub === true, String(sub));
  const foreign = listen(staff.chef, `kitchen.${companyId + 999}.${branchId}`);
  const fsub = await foreign.ready;
  check('Begona kompaniya kanali rad etiladi', fsub !== true, String(fsub));
  foreign.p.disconnect();

  // ── 6. Buyurtma oqimi (dine_in) ───────────────────────
  const ord = await api('POST', '/orders', {
    branch_id: branchId, table_id: tbl.data?.id, type: 'dine_in',
    items: [{ menu_item_id: item.data?.id, quantity: 2 }, { menu_item_id: wItem.data?.id, quantity: 1, weight_kg: 0.5 }],
  }, staff.waiter);
  check('Ofitsiant buyurtma beradi', ord.status === 201, err(ord));
  const orderId = ord.data?.id;
  const total = Number(ord.data?.total_amount ?? ord.data?.total ?? 0);
  check('Buyurtma summasi serverda hisoblanadi', total >= 190000, `total=${total} (2×45000 + 0.5kg×200000 = 190000 + xizmat haqi)`);
  check('KDS order.created eventini oladi', await waitFor(() => kds.events.some((e) => e.name === 'order.created')), kds.events.map((e) => e.name).join(','));
  const tblAfter = await api('GET', '/tables/' + tbl.data?.id, null, A);
  check('Stol band (occupied) bo\'ladi', tblAfter.data?.status === 'occupied', 'status=' + tblAfter.data?.status);

  const chefServe = await api('PATCH', `/orders/${orderId}/status`, { status: 'served' }, staff.chef);
  check('Oshpaz "served" qila olmaydi (403)', chefServe.status === 403, err(chefServe));
  const ready = await api('PATCH', `/orders/${orderId}/status`, { status: 'ready' }, staff.chef);
  check('Oshpaz "Tayyor" bosadi', ready.status === 200, err(ready));
  check('KDS order.status eventini oladi', await waitFor(() => kds.events.some((e) => e.name === 'order.status')), kds.events.map((e) => e.name).join(','));
  const served = await api('PATCH', `/orders/${orderId}/status`, { status: 'served' }, staff.waiter);
  check('Ofitsiant "Berildi"', served.status === 200, err(served));
  const fakePaid = await api('PATCH', `/orders/${orderId}/status`, { status: 'paid' }, staff.waiter);
  check("To'lovsiz 'paid' qilib bo'lmaydi (422)", fakePaid.status === 422, err(fakePaid));

  // ── 7. Kassa: smena va to'lov ─────────────────────────
  const noShift = await api('POST', '/payments', { order_id: orderId, method: 'cash', amount: 1000 }, staff.cashier);
  check("Smenasiz to'lov rad etiladi", noShift.status === 422, err(noShift));
  const shift = await api('POST', '/cash-shifts/open', { branch_id: branchId, opening_amount: 100000 }, staff.cashier);
  check('Kassir smena ochadi', shift.status === 201 || shift.status === 200, err(shift));
  const orderNow = await api('GET', '/orders/' + orderId, null, staff.cashier);
  const due = Number(orderNow.data?.total_amount ?? total);
  const p1 = await api('POST', '/payments', { order_id: orderId, method: 'card', amount: 100000 }, staff.cashier);
  check("Qisman to'lov (karta)", p1.status === 201, err(p1));
  const p2 = await api('POST', '/payments', { order_id: orderId, method: 'cash', amount: due - 100000 }, staff.cashier);
  check("Qoldiq to'lov (naqd)", p2.status === 201, err(p2));
  const paidOrder = await api('GET', '/orders/' + orderId, null, staff.cashier);
  check("Buyurtma 'paid' holatiga o'tadi", paidOrder.data?.status === 'paid', 'status=' + paidOrder.data?.status);
  const over = await api('POST', '/payments', { order_id: orderId, method: 'cash', amount: 1000 }, staff.cashier);
  check("To'langan buyurtmaga qayta to'lov rad etiladi", over.status === 422, err(over));
  const tblFree = await api('GET', '/tables/' + tbl.data?.id, null, A);
  check("To'lovdan keyin stol bo'shaydi", tblFree.data?.status === 'free', 'status=' + tblFree.data?.status);
  const close = await api('POST', '/cash-shifts/close', { closing_amount: 100000 + (due - 100000) }, staff.cashier);
  check('Smena yopiladi', close.status === 200, err(close));
  const shiftId = shift.data?.id ?? close.data?.id;
  const rep = await api('GET', `/cash-shifts/${shiftId}/report`, null, A);
  check('Smena hisoboti', rep.status === 200, err(rep) + ' ' + JSON.stringify(rep.data ?? '').slice(0, 200));

  // ── 8. Telegram Mini App (dev rejim) ──────────────────
  const tgH = { 'X-Telegram-Dev-Id': '777' + T };
  const tgMenu = await api('GET', `/tg/menu?company=${slug}`, null, null, tgH);
  check('TG Mini App menyusi', tgMenu.status === 200 && JSON.stringify(tgMenu.data).includes('Osh'), err(tgMenu));
  kds.events.length = 0;
  const tgOrd = await api('POST', `/tg/orders?company=${slug}`, { branch_id: branchId, items: [{ menu_item_id: item.data?.id, quantity: 1 }] }, null, tgH);
  check('TG mijoz buyurtma beradi', tgOrd.status === 201, err(tgOrd));
  check('TG buyurtmasi KDS ga real-time keladi', await waitFor(() => kds.events.some((e) => e.name === 'order.created')), kds.events.map((e) => e.name).join(','));
  const tgNoAuth = await api('GET', `/tg/menu?company=${slug}`);
  check('TG: initData siz rad etiladi', tgNoAuth.status >= 400 && tgNoAuth.status < 500, err(tgNoAuth));

  // ── 9. Tenant izolyatsiyasi ───────────────────────────
  const co2 = await api('POST', '/super/companies', { name: 'Boshqa ' + T, slug: slug + '-b', phone: '+998712000001', owner_full_name: 'B Admin', owner_phone: '+99893' + T.padStart(7, '2'), owner_password: 'Admin12345' }, sa.token);
  const b = await login('+99893' + T.padStart(7, '2'), 'Admin12345');
  const peek = await api('GET', '/orders/' + orderId, null, b.token);
  check("Boshqa kompaniya buyurtmani ko'ra olmaydi (404)", co2.status === 201 && peek.status === 404, err(co2) + ' / ' + err(peek));
  const peekMenu = await api('GET', '/menu-items', null, b.token);
  check("Boshqa kompaniya menyuni ko'rmaydi", peekMenu.status === 200 && !JSON.stringify(peekMenu.data).includes('Plov') && !JSON.stringify(peekMenu.data).includes('Плов'), err(peekMenu));

  // ── 10. Kompaniyani bloklash ──────────────────────────
  const tog = await api('PATCH', `/super/companies/${companyId}/toggle`, null, sa.token);
  const blocked = await api('GET', '/orders', null, staff.waiter);
  check('Bloklangan kompaniya xodimi kira olmaydi (403)', tog.status === 200 && blocked.status === 403, err(blocked));
  await api('PATCH', `/super/companies/${companyId}/toggle`, null, sa.token);
  const dash = await api('GET', '/super/dashboard', null, sa.token);
  check('Super admin dashboard', dash.status === 200, err(dash));
  const logs = await api('GET', '/super/audit-logs', null, sa.token);
  check('Audit log', logs.status === 200, err(logs));

  kds.p.disconnect();
  console.log(`\nJAMI: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
