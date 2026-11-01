<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * #37: xodimlar boti — xodimning Telegram akkaunti. Bir odam bir nechta restoranda
 * ishlashi mumkin (users.phone faqat company ichida unique), shuning uchun telegram_id
 * ham unique emas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('telegram_id', 32)->nullable()->index();
            $table->timestamp('telegram_linked_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['telegram_id']);
            $table->dropColumn(['telegram_id', 'telegram_linked_at']);
        });
    }
};
