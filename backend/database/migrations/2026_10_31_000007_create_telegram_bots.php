<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * #26: restoranning o'z Telegram boti — token (shifrlangan), webhook holati,
 * restoran guruhi va rahbar chati; mijoz ro'yxatdan o'tishi (telefon, F.I.SH,
 * joylashuv); TG buyurtmada yetkazish manzili va takrorlanmaslik kaliti.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('telegram_bots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->unique()->constrained()->cascadeOnDelete();
            $table->text('token');                       // encrypted cast
            $table->string('token_hash', 64)->unique();  // bir token ikki restoranga ulanmasin
            $table->unsignedBigInteger('bot_id')->nullable();
            $table->string('username')->nullable();
            $table->string('name')->nullable();
            $table->string('webhook_secret', 64);
            $table->string('status', 20)->default('connected'); // connected | disconnected
            $table->timestamp('last_checked_at')->nullable();
            $table->text('last_error')->nullable();
            $table->unsignedInteger('pending_updates')->default(0);
            $table->string('connect_code', 16);
            $table->string('group_chat_id')->nullable();
            $table->string('group_title')->nullable();
            $table->string('owner_chat_id')->nullable();
            $table->timestamp('alerted_at')->nullable();
            $table->timestamps();
        });

        Schema::create('telegram_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('telegram_bot_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('update_id');
            $table->timestamp('created_at')->nullable();
            $table->unique(['telegram_bot_id', 'update_id']);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('address')->nullable();
            $table->timestamp('registered_at')->nullable();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('delivery_address')->nullable();
            $table->decimal('delivery_lat', 10, 7)->nullable();
            $table->decimal('delivery_lng', 10, 7)->nullable();
            $table->string('client_key', 64)->nullable();
            $table->unique(['company_id', 'client_key']);
        });

        // Avval tinker orqali settings_json ga yozilgan tokenlar — yangi jadvalga
        foreach (DB::table('companies')->get(['id', 'settings_json']) as $c) {
            $settings = json_decode((string) $c->settings_json, true) ?: [];
            $token = $settings['telegram_bot_token'] ?? null;
            if (! $token || DB::table('telegram_bots')->where('token_hash', hash('sha256', $token))->exists()) {
                continue;
            }
            DB::table('telegram_bots')->insert([
                'company_id' => $c->id,
                'token' => encrypt($token, false),
                'token_hash' => hash('sha256', $token),
                'webhook_secret' => bin2hex(random_bytes(24)),
                'status' => 'disconnected',
                'last_error' => "Panel orqali qayta ulang (\"Qayta ulash\")",
                'connect_code' => strtoupper(bin2hex(random_bytes(3))),
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'client_key']);
            $table->dropColumn(['delivery_address', 'delivery_lat', 'delivery_lng', 'client_key']);
        });
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude', 'address', 'registered_at']);
        });
        Schema::dropIfExists('telegram_updates');
        Schema::dropIfExists('telegram_bots');
    }
};
