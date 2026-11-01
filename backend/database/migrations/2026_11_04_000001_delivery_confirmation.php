<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * #39: botdan kelgan yetkazib berish / olib ketish buyurtmalari avval «pending»
 * (tasdiqlash kutilmoqda) — menejer mijozga qo'ng'iroq qilib tasdiqlaydi, keyin
 * oshxonaga tushadi. Mijozning saqlangan manzillari (Uy, Ish, ...).
 */
return new class extends Migration
{
    private const STATUSES = ['pending', 'preparing', 'ready', 'served', 'paid', 'closed', 'cancelled', 'delivering', 'delivered'];

    public function up(): void
    {
        // Holatlar ro'yxatiga 'pending' — enum (CHECK) ni oddiy satrga almashtiramiz
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check');
        }
        Schema::table('orders', function (Blueprint $table) {
            $table->string('status', 20)->default('preparing')->change();
            $table->timestamp('confirmed_at')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
        });
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('".implode("','", self::STATUSES)."'))");
        }

        Schema::create('customer_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('label', 40);
            $table->string('address', 255)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
            $table->index(['customer_id', 'last_used_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_addresses');
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('confirmed_by');
            $table->dropColumn('confirmed_at');
        });
    }
};
