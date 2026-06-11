<?php

use App\Http\Controllers\Api\V1\AddonController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BranchController;
use App\Http\Controllers\Api\V1\CashShiftController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\MenuItemController;
use App\Http\Controllers\Api\V1\ModifierController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\SuperAdmin\AuditLogController;
use App\Http\Controllers\Api\V1\SuperAdmin\CompanyController;
use App\Http\Controllers\Api\V1\SuperAdmin\DashboardController;
use App\Http\Controllers\Api\V1\SuperAdmin\PlanController;
use App\Http\Controllers\Api\V1\TableController;
use App\Http\Controllers\Api\V1\Tg\MenuController as TgMenuController;
use App\Http\Controllers\Api\V1\Tg\OrderController as TgOrderController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // Public auth routes (rate-limited)
    Route::middleware('throttle:60,1')->group(function () {
        Route::post('auth/login', [AuthController::class, 'login']);
        Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('auth/reset-password', [AuthController::class, 'resetPassword']);
    });

    // Telegram Mini App (customer-facing, authenticated via Telegram initData)
    Route::prefix('tg')->middleware('telegram')->group(function () {
        Route::get('menu', [TgMenuController::class, 'index']);
        Route::post('orders', [TgOrderController::class, 'store']);
        Route::get('orders/{order}', [TgOrderController::class, 'show']);
    });

    // Authenticated routes
    Route::middleware('auth:sanctum')->group(function () {

        // Auth / profile
        Route::prefix('auth')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me', [AuthController::class, 'me']);
            Route::put('me', [AuthController::class, 'updateProfile']);
            Route::put('change-password', [AuthController::class, 'changePassword']);
        });

        // Company-scoped routes (Menu & Tables)
        Route::middleware('company.active')->group(function () {

            // Branches & Staff (company_admin only)
            Route::middleware('role:company_admin')->group(function () {
                Route::apiResource('branches', BranchController::class);
                Route::apiResource('users', UserController::class);
            });

            // Menu
            Route::middleware('role:company_admin,manager')->group(function () {
                Route::patch('categories/reorder', [CategoryController::class, 'reorder']);
                Route::apiResource('categories', CategoryController::class);
                Route::patch('menu-items/{menuItem}/availability', [MenuItemController::class, 'toggleAvailability']);
                Route::apiResource('menu-items', MenuItemController::class);
                Route::apiResource('modifiers', ModifierController::class);
                Route::apiResource('addons', AddonController::class);
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

            Route::get('plans', [PlanController::class, 'index']);
            Route::post('plans', [PlanController::class, 'store']);
            Route::put('plans/{plan}', [PlanController::class, 'update']);

            Route::get('audit-logs', [AuditLogController::class, 'index']);
        });
    });
});
