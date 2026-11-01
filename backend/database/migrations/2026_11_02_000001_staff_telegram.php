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

        // Xodimlar boti sozlamasi — bitta qator, super admin panelidan boshqariladi
        Schema::create('staff_bot_settings', function (Blueprint $table) {
            $table->id();
            $table->text('token')->nullable(); // shifrlangan
            $table->string('username')->nullable();
            $table->unsignedBigInteger('bot_id')->nullable();
            $table->string('status', 20)->default('disconnected');
            $table->text('last_error')->nullable();
            $table->timestamp('last_checked_at')->nullable();
            $table->unsignedInteger('pending_updates')->default(0);
            $table->boolean('login_code')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_bot_settings');
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['telegram_id']);
            $table->dropColumn(['telegram_id', 'telegram_linked_at']);
        });
    }
};
