<?php

use App\Http\Controllers\Api\V1\AddonController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BranchController;
use App\Http\Controllers\Api\V1\CashShiftController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\MenuCatalogController;
use App\Http\Controllers\Api\V1\MenuItemController;
use App\Http\Controllers\Api\V1\ModifierController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\SuperAdmin\AuditLogController;
use App\Http\Controllers\Api\V1\SuperAdmin\CatalogController;
use App\Http\Controllers\Api\V1\MediaController;
use App\Http\Controllers\Api\V1\PublicPageController;
use App\Http\Controllers\Api\V1\SuperAdmin\CompanyController;
use App\Http\Controllers\Api\V1\SuperAdmin\TelegramBotController as SuperTelegramBotController;
use App\Http\Controllers\Api\V1\TelegramBotController;
use App\Http\Controllers\Api\V1\TelegramWebhookController;
use App\Http\Controllers\Api\V1\SuperAdmin\DashboardController;
use App\Http\Controllers\Api\V1\SuperAdmin\PlanController;
use App\Http\Controllers\Api\V1\TableController;
use App\Http\Controllers\Api\V1\TableSetController;
use App\Http\Controllers\Api\V1\TableTemplateController;
use App\Http\Controllers\Api\V1\Tg\MenuController as TgMenuController;
use App\Http\Controllers\Api\V1\Tg\OrderController as TgOrderController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\StaffTelegramWebhookController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // Public auth routes (rate-limited)
    // throttle'ning 3-argumenti — kalit prefiksi. Usiz barcha `throttle:N,M` lar bitta
    // IP hisoblagichini bo'lishadi: login va menyu so'rovlari TG buyurtma limitini yeb qo'yardi.
    Route::middleware('throttle:60,1,auth')->group(function () {
        Route::post('auth/login', [AuthController::class, 'login']);
        Route::post('auth/login/select', [AuthController::class, 'selectCompany']);
        Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('auth/reset-password', [AuthController::class, 'resetPassword']);
    });

    // #37: birinchi kirishda Telegram kodi va xodimlar boti Mini App'i
    Route::middleware('throttle:20,1,tg-verify')->group(function () {
        Route::post('auth/telegram/verify', [AuthController::class, 'verifyTelegram']);
        Route::post('auth/telegram/staff', [AuthController::class, 'telegramStaffLogin']);
        Route::post('auth/telegram/staff/link', [AuthController::class, 'telegramStaffLink']);
    });
    Route::post('telegram/staff-webhook', StaffTelegramWebhookController::class)->middleware('throttle:600,1,tg-staff-webhook');

    // #35: taom rasmlari (ommaviy, uzoq kesh)
    Route::get('media/{path}', [MediaController::class, 'show'])->where('path', '[A-Za-z0-9/_-]+\.(webp|png|jpg)');

    // Telegram Mini App (customer-facing, authenticated via Telegram initData)
    Route::prefix('tg')->middleware(['telegram', 'throttle:60,1,tg'])->group(function () {
        Route::get('menu', [TgMenuController::class, 'index']);
        Route::post('orders', [TgOrderController::class, 'store'])->middleware('throttle:10,1,tg-orders');
        Route::get('orders/{order}', [TgOrderController::class, 'show']);
        Route::get('me', [TgOrderController::class, 'me']);
    });

    // #26: Telegram webhook — sirli kalit bilan himoyalangan, Telegram IP'laridan keladi
    Route::post('telegram/webhook/{bot}', TelegramWebhookController::class)
        ->whereNumber('bot')->middleware('throttle:600,1,tg-webhook');

    // Authenticated routes
    Route::middleware('auth:sanctum')->group(function () {

        // Auth / profile
        Route::prefix('auth')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me', [AuthController::class, 'me']);
            Route::put('me', [AuthController::class, 'updateProfile']);
            Route::put('change-password', [AuthController::class, 'changePassword']);
            Route::get('telegram', [AuthController::class, 'telegramStatus']); // #37
            Route::delete('telegram', [AuthController::class, 'unlinkTelegram']);
        });

        // Company-scoped routes (Menu & Tables)
        Route::middleware('company.active')->group(function () {

            // Branches - list is open to all company staff (KDS/waiter screens
            // need it even for staff with no branch_id assigned yet), writes
            // (and single-branch show) stay company_admin only.
            Route::middleware('role:company_admin,manager,waiter,cashier,chef')->group(function () {
                Route::apiResource('branches', BranchController::class)->only(['index']);
            });

            // Branches (write) & Staff (company_admin only)
            Route::middleware('role:company_admin')->group(function () {
                // #26: restoranning Telegram boti
                Route::get('telegram-bot', [TelegramBotController::class, 'show']);
                Route::post('telegram-bot', [TelegramBotController::class, 'store'])->middleware('throttle:10,1,tg-connect');
                Route::post('telegram-bot/reconnect', [TelegramBotController::class, 'reconnect'])->middleware('throttle:10,1,tg-connect');
                Route::delete('telegram-bot', [TelegramBotController::class, 'destroy']);
                // #27: restoranning ochiq menyu sahifasi (SEO)
                Route::get('public-page', [PublicPageController::class, 'show']);
                Route::put('public-page', [PublicPageController::class, 'update']);

                Route::apiResource('branches', BranchController::class)->except(['index']);
                Route::apiResource('users', UserController::class);
                Route::delete('users/{user}/telegram', [UserController::class, 'unlinkTelegram']); // #37
            });

            // Menu
            Route::middleware('role:company_admin,manager')->group(function () {
                Route::patch('categories/reorder', [CategoryController::class, 'reorder']);
                Route::apiResource('categories', CategoryController::class);
                Route::patch('menu-items/{menuItem}/availability', [MenuItemController::class, 'toggleAvailability']);
                Route::post('menu-items/{menuItem}/image', [MediaController::class, 'uploadMenuItem'])->middleware('throttle:30,1,media');
                Route::delete('menu-items/{menuItem}/image', [MediaController::class, 'deleteMenuItem']);
                Route::apiResource('menu-items', MenuItemController::class);
                Route::apiResource('modifiers', ModifierController::class);
                Route::apiResource('addons', AddonController::class);
                // Standart katalogdan tanlab qo'shish (#29)
                Route::get('menu/catalog', [MenuCatalogController::class, 'index']);
                Route::post('menu/catalog/import', [MenuCatalogController::class, 'import']);
                // Stol shablonlari (#24)
                Route::apiResource('table-templates', TableTemplateController::class)->except(['show']);
            });

            // Tables
            Route::middleware('role:company_admin,manager,waiter')->group(function () {
                Route::patch('tables/{table}/status', [TableController::class, 'updateStatus']);
                Route::post('tables/{table}/transfer', [TableController::class, 'transfer']);
                Route::post('tables/{table}/merge', [TableController::class, 'merge']);
                Route::post('tables/{table}/unmerge', [TableController::class, 'unmerge']);
                Route::apiResource('tables', TableController::class);
            });
        });

        // Orders - read + status transitions (chef included for the kitchen display)
        Route::middleware(['company.active', 'role:company_admin,manager,waiter,cashier,chef'])->group(function () {
            Route::get('orders', [OrderController::class, 'index']);
            Route::get('orders/{order}', [OrderController::class, 'show']);
            Route::patch('orders/{order}/status', [OrderController::class, 'updateStatus']);
        });

        // Orders - write actions (no chef)
        Route::middleware(['company.active', 'role:company_admin,manager,waiter,cashier'])->group(function () {
            Route::get('pos/menu', [OrderController::class, 'menu']);
            Route::post('orders', [OrderController::class, 'store']);
            Route::put('orders/{order}', [OrderController::class, 'update']);
            // Stol to'plami (#24): ishlatilgan narsalarni belgilash
            Route::get('orders/{order}/table-set', [TableSetController::class, 'show']);
            Route::put('orders/{order}/table-set', [TableSetController::class, 'update']);
            Route::post('orders/{order}/cancel', [OrderController::class, 'cancel']);
            Route::post('orders/{order}/discount', [OrderController::class, 'applyDiscount']);
        });

        // Payments
        Route::middleware(['company.active', 'role:company_admin,manager,cashier'])->group(function () {
            Route::post('payments', [PaymentController::class, 'store']);
            Route::get('payments/{payment}', [PaymentController::class, 'show']);
        });

        // Cash Shifts
        Route::middleware(['company.active', 'role:company_admin,cashier'])->group(function () {
            Route::post('cash-shifts/open', [CashShiftController::class, 'open']);
            Route::post('cash-shifts/close', [CashShiftController::class, 'close']);
            Route::get('cash-shifts/current', [CashShiftController::class, 'current']);
            Route::get('cash-shifts', [CashShiftController::class, 'index']);
            Route::get('cash-shifts/{cashShift}/report', [CashShiftController::class, 'report']);
        });

        // Super Admin routes
        Route::prefix('super')->middleware('role:super_admin')->group(function () {
            Route::get('dashboard', [DashboardController::class, 'index']);

            Route::apiResource('companies', CompanyController::class)->except('destroy');
            Route::patch('companies/{company}/toggle', [CompanyController::class, 'toggle']);
            Route::patch('companies/{company}/plan', [CompanyController::class, 'changePlan']);
            Route::post('companies/{company}/admin', [CompanyController::class, 'assignAdmin']);

            // Standart menyu katalogi (#23) — global, faqat super admin
            Route::get('catalog', [CatalogController::class, 'index']);
            Route::get('telegram-bots', [SuperTelegramBotController::class, 'index']); // #26
            Route::post('catalog/categories', [CatalogController::class, 'storeCategory']);
            Route::put('catalog/categories/{category}', [CatalogController::class, 'updateCategory']);
            Route::delete('catalog/categories/{category}', [CatalogController::class, 'destroyCategory']);
            Route::post('catalog/items', [CatalogController::class, 'storeItem']);
            Route::put('catalog/items/{item}', [CatalogController::class, 'updateItem']);
            Route::delete('catalog/items/{item}', [CatalogController::class, 'destroyItem']);
            Route::post('catalog/items/{item}/image', [MediaController::class, 'uploadCatalogItem']);
            Route::delete('catalog/items/{item}/image', [MediaController::class, 'deleteCatalogItem']);
            Route::post('catalog/addons', [CatalogController::class, 'storeAddon']);
            Route::put('catalog/addons/{addon}', [CatalogController::class, 'updateAddon']);
            Route::delete('catalog/addons/{addon}', [CatalogController::class, 'destroyAddon']);

            Route::get('plans', [PlanController::class, 'index']);
            Route::post('plans', [PlanController::class, 'store']);
            Route::put('plans/{plan}', [PlanController::class, 'update']);

            Route::get('audit-logs', [AuditLogController::class, 'index']);
        });
    });
});
