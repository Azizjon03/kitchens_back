# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Kitchens.uz** — a multi-tenant SaaS POS/management platform for restaurants, cafés, and kitchens. A Laravel JSON API backend (`backend/`) and a React + TypeScript SPA (`frontend/`), orchestrated with Docker. The full product spec (in Uzbek) lives at `docs/kitchecns_uz.md` and is the source of truth for business rules.

## Repository layout

- `backend/` — Laravel 13 / PHP 8.3+ API (Sanctum token auth, PostgreSQL in prod, SQLite for tests)
- `frontend/` — React 19 + TypeScript + Vite + Tailwind v4 SPA, TanStack Query for server state, React Router v6
- `docker/`, `docker-compose.yml`, `Dockerfile` — local dev stack (PHP-FPM, nginx, Postgres, Redis, Vite, Reverb)
- `docs/kitchecns_uz.md` — product/technical spec
- `PHASE1_SETUP.md` — setup guide (in Uzbek) for the Phase 1 modules: Reverb env vars, KDS, Telegram Mini App wiring, role → page matrix

## Commands

### Docker (full stack)
```bash
docker compose up -d          # app(php-fpm) + nginx(:8000) + postgres(:5433) + redis(:6380) + frontend(:3000) + reverb(:8080, WebSockets)
```
The frontend dev server (Vite) proxies `/api` to the nginx container — see `frontend/vite.config.ts` (`target: http://nginx:80`). The API is reachable at `:8000`, the SPA at `:3000`.

### Backend (run inside the `app` container or a local PHP env)
```bash
composer dev                  # concurrently runs: php artisan serve + queue:listen + pail (logs) + npm run dev
composer setup                # install, copy .env, key:generate, migrate, npm build
php artisan migrate           # run migrations
php artisan db:seed            # seed plans (free/pro/premium) + super admin
composer test                 # config:clear then php artisan test (PHPUnit)
php artisan test --filter=TestName     # run a single test (e.g. TelegramOrderTest, OrderBroadcastTest)
./vendor/bin/pint              # format PHP (Laravel Pint)
php artisan telegram:setup <company-slug>   # point a company's Telegram bot menu button at the Mini App
```
Tests run against an in-memory SQLite DB (see `backend/phpunit.xml`); no Postgres needed for the test suite.

### Frontend
```bash
npm run dev                   # Vite dev server (:5173, mapped to :3000 in docker)
npm run build                 # tsc -b && vite build
npm run lint                  # eslint
npm run test:e2e              # Playwright (chromium + mobile-chrome), against http://localhost:3000
npm run test:e2e:login        # run a single spec (also :dashboard, :companies, :navigation, :responsive)
npm run test:e2e:ui           # Playwright UI mode
```

## Architecture

### Multi-tenancy (the core invariant)
Every tenant-owned model uses the `App\Models\Traits\BelongsToCompany` trait, which:
1. Adds the global `CompanyScope` — automatically constrains all queries to `auth()->user()->company_id`, **unless the user is `super_admin`** (who sees all companies).
2. On `creating`, auto-fills `company_id` from the authenticated user.

**Consequence:** never manually filter by `company_id` in tenant controllers — the scope handles it. When adding a new tenant-scoped model, add `use BelongsToCompany;`. Be aware that `super_admin` queries bypass the scope entirely, so SuperAdmin controllers see cross-tenant data by design.

### Roles & authorization
Roles live on `users.role` as a string: `super_admin`, `company_admin`, `manager`, `waiter`, `cashier`, `chef` (chef gets read + status-transition access to orders for the KDS, no write actions). Telegram customers are not users — they authenticate via initData (see below). Authorization is enforced by route middleware, not policies:
- `auth:sanctum` — token auth (Bearer token in `Authorization` header)
- `role:company_admin,manager` — `CheckRole` middleware, comma-separated allowed roles (`$user->hasRole(...)`)
- `company.active` — `EnsureCompanyActive`, blocks deactivated companies (super_admin exempt)
- `telegram` — `ValidateTelegramInitData`, authenticates Telegram Mini App customers (no Sanctum token)

Route → role mapping is all declared in `backend/routes/api.php` under the `v1` prefix. Read that file to understand who can do what. SuperAdmin endpoints are under `v1/super/*`.

### API conventions
- All API responses go through the `ApiResponse` trait: `$this->success($data, $status)` → `{success: true, data}`; `$this->error($code, $message, $status)` → `{success: false, error: {code, message}}`. Use these in every controller.
- `ForceJsonResponse` middleware (prepended to the api group) forces JSON responses even without an `Accept` header.
- Controllers live under `App\Http\Controllers\Api\V1\` (and `...\V1\SuperAdmin\`). Standard Laravel `apiResource` routing.
- List endpoints paginate (`->paginate(20)`) and accept query filters (e.g. OrderController filters by status/table_id/branch_id/type/date_from/date_to).
- Business logic that is shared between the staff POS and the Telegram Mini App lives in `App\Services\` (`MenuService`, `OrderService`) — controllers in both `V1\` and `V1\Tg\` delegate to them. Put new order/menu logic there, not in controllers.

### Real-time (KDS / waiter screen)
Order lifecycle events broadcast over **Laravel Reverb** (WebSockets, `:8080`):
- Events `App\Events\OrderCreated` and `OrderStatusUpdated` broadcast on the private channel `kitchen.{companyId}.{branchId}` (authorized in `backend/routes/channels.php` for company_admin/manager/waiter/chef of that company).
- Frontend subscribes via `frontend/src/lib/echo.ts` (laravel-echo + pusher-js, `broadcaster: 'reverb'`, auth at `/api/broadcasting/auth` with the Sanctum token). Config comes from `VITE_REVERB_*` env vars; backend from `REVERB_*` (see `PHASE1_SETUP.md`).
- The flow: order created (waiter POS or Telegram) → appears on `KitchenPage` (KDS) → chef marks ready → waiter notified in real time → cashier takes payment.

### Telegram Mini App (customer ordering)
Public customer-facing API under `v1/tg/*` (`Tg\MenuController`, `Tg\OrderController`), guarded by the `telegram` middleware instead of Sanctum:
- Auth is Telegram **initData** (`X-Telegram-Init-Data` header), HMAC-validated against the company's bot token stored in `companies.settings_json.telegram_bot_token` (`App\Services\Telegram\InitDataValidator`). The customer is upserted into `customers`.
- **Dev bypass:** with `APP_DEBUG=true`, send `X-Telegram-Dev-Id` (frontend: open `/tg?company=<slug>&dev_id=12345`) to fake a customer without Telegram.
- Frontend Mini App pages live in `frontend/src/pages/tg/` with their own API client `frontend/src/lib/tgApi.ts` and cart state in `tgCart.ts` — they do not use the staff auth/api modules.
- `php artisan telegram:setup <slug>` (`App\Services\Telegram\TelegramSetup`) sets the bot's menu button to `FRONTEND_URL/tg?company=<slug>`.

### Frontend ↔ backend contract
- `frontend/src/lib/api.ts` — axios instance with `baseURL: /api/v1`. Request interceptor attaches `Bearer` token from `localStorage.access_token`; response interceptor clears storage and dispatches a `auth:logout` window event on 401.
- `frontend/src/lib/auth.tsx` — `AuthProvider` / `useAuth()`. **Login is by `phone` + `password`, not email** (see migration `2026_04_07_..._make_email_nullable_phone_required_on_users`). Token + user are persisted to localStorage.
- `frontend/src/components/ProtectedRoute.tsx` — gates routes; accepts a `requiredRole` prop (e.g. `super_admin` for company/plan/history pages). Routing is in `frontend/src/App.tsx`.
- Server state is managed with TanStack Query (`retry: 1`, `refetchOnWindowFocus: false`).

## Domain model

Core entities (`backend/app/Models/`): `Company` (tenant) → `Branch`, `User`, `Subscription` (tied to a `Plan`). Menu: `Category` → `MenuItem` (+ `Modifier`, `Addon`). Operations: `Table`, `Order` → `OrderItem`, `Payment`, `CashShift`, plus `Customer` (Telegram customers), `AuditLog`. Migrations in `backend/database/migrations/` are grouped by domain (companies, branches+users, menu, tables+orders, etc.). Orders support discounts, service charges, and table merge/transfer — see `OrderController` and `TableController`.

Menu items sell by portion or by weight: `menu_items.sell_type` is `portion|weight`; for weight items `price` is per kg and `min_weight`/`weight_step` constrain the amount. Order items carry a decimal `quantity` (fractional portions like 0.7 are valid) and `weight_kg` for weight-based lines.

## Notes

- The spec (`docs/kitchecns_uz.md`) says Laravel 11 / PHP 8.2, but `composer.json` pins Laravel ^13 / PHP ^8.3 and the Dockerfile uses PHP 8.4 — trust the actual config files.
- Seeded super admin: phone `+998906921469`, password `password` (dev only).
- Test suite is PHPUnit (`backend/phpunit.xml`); `pestphp/pest-plugin` is allowed in `composer.json` config but Pest is not installed. Feature tests: `TelegramOrderTest`, `StaffManagementTest`, `OrderBroadcastTest`.
