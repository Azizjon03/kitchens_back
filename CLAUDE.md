# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Kitchens.uz** — a multi-tenant SaaS POS/management platform for restaurants, cafés, and kitchens. A Laravel JSON API backend (`backend/`) and a React + TypeScript SPA (`frontend/`), orchestrated with Docker. The full product spec (in Uzbek) lives at `docs/kitchecns_uz.md` and is the source of truth for business rules.

## Repository layout

- `backend/` — Laravel 13 / PHP 8.3+ API (Sanctum token auth, PostgreSQL in prod, SQLite for tests)
- `frontend/` — React 19 + TypeScript + Vite + Tailwind v4 SPA, TanStack Query for server state, React Router v6
- `docker/`, `docker-compose.yml`, `Dockerfile` — local dev stack (PHP-FPM, nginx, Postgres, Redis, Vite)
- `docs/kitchecns_uz.md` — product/technical spec

## Commands

### Docker (full stack)
```bash
docker compose up -d          # app(php-fpm) + nginx(:8000) + postgres(:5433) + redis(:6380) + frontend(:3000)
```
The frontend dev server (Vite) proxies `/api` to the nginx container — see `frontend/vite.config.ts` (`target: http://nginx:80`). The API is reachable at `:8000`, the SPA at `:3000`.

### Backend (run inside the `app` container or a local PHP env)
```bash
composer dev                  # concurrently runs: php artisan serve + queue:listen + pail (logs) + npm run dev
composer setup                # install, copy .env, key:generate, migrate, npm build
php artisan migrate           # run migrations
php artisan db:seed            # seed plans (free/pro/premium) + super admin
composer test                 # config:clear then php artisan test (PHPUnit)
php artisan test --filter=TestName     # run a single test
./vendor/bin/pint              # format PHP (Laravel Pint)
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
Roles live on `users.role` as a string: `super_admin`, `company_admin`, `manager`, `waiter`, `cashier` (and courier via Telegram per spec). Authorization is enforced by route middleware, not policies:
- `auth:sanctum` — token auth (Bearer token in `Authorization` header)
- `role:company_admin,manager` — `CheckRole` middleware, comma-separated allowed roles (`$user->hasRole(...)`)
- `company.active` — `EnsureCompanyActive`, blocks deactivated companies (super_admin exempt)

Route → role mapping is all declared in `backend/routes/api.php` under the `v1` prefix. Read that file to understand who can do what. SuperAdmin endpoints are under `v1/super/*`.

### API conventions
- All API responses go through the `ApiResponse` trait: `$this->success($data, $status)` → `{success: true, data}`; `$this->error($code, $message, $status)` → `{success: false, error: {code, message}}`. Use these in every controller.
- `ForceJsonResponse` middleware (prepended to the api group) forces JSON responses even without an `Accept` header.
- Controllers live under `App\Http\Controllers\Api\V1\` (and `...\V1\SuperAdmin\`). Standard Laravel `apiResource` routing.
- List endpoints paginate (`->paginate(20)`) and accept query filters (e.g. OrderController filters by status/table_id/branch_id/type/date_from/date_to).

### Frontend ↔ backend contract
- `frontend/src/lib/api.ts` — axios instance with `baseURL: /api/v1`. Request interceptor attaches `Bearer` token from `localStorage.access_token`; response interceptor clears storage and dispatches a `auth:logout` window event on 401.
- `frontend/src/lib/auth.tsx` — `AuthProvider` / `useAuth()`. **Login is by `phone` + `password`, not email** (see migration `2026_04_07_..._make_email_nullable_phone_required_on_users`). Token + user are persisted to localStorage.
- `frontend/src/components/ProtectedRoute.tsx` — gates routes; accepts a `requiredRole` prop (e.g. `super_admin` for company/plan/history pages). Routing is in `frontend/src/App.tsx`.
- Server state is managed with TanStack Query (`retry: 1`, `refetchOnWindowFocus: false`).

## Domain model

Core entities (`backend/app/Models/`): `Company` (tenant) → `Branch`, `User`, `Subscription` (tied to a `Plan`). Menu: `Category` → `MenuItem` (+ `Modifier`, `Addon`). Operations: `Table`, `Order` → `OrderItem`, `Payment`, `CashShift`, plus `Customer`, `AuditLog`. Migrations in `backend/database/migrations/` are grouped by domain (companies, branches+users, menu, tables+orders, etc.). Orders support discounts, service charges, split bills (multiple checks per table), and table merge/transfer — see `OrderController` and `TableController`.

## Notes

- The spec (`docs/kitchecns_uz.md`) says Laravel 11 / PHP 8.2, but `composer.json` pins Laravel ^13 / PHP ^8.3 and the Dockerfile uses PHP 8.4 — trust the actual config files.
- Seeded super admin: phone `+998906921469`, password `password` (dev only).
- **Incomplete feature:** `Order::checks()` references an `OrderCheck` model that does not exist (no model file, no migration). The split-bill feature is stubbed — calling that relation will fail until it's implemented.
- Test suite is PHPUnit (`backend/phpunit.xml`); `pestphp/pest-plugin` is allowed in `composer.json` config but Pest is not installed and `tests/` only contains the default PHPUnit example tests.
