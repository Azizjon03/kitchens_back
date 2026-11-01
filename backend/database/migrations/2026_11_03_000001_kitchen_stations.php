<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * #40: oshxona bo'limlari (Kabob, Somsa, Salatlar, Osh...). Taom bo'limi — taomning
 * o'zida yoki kategoriyasida; buyurtma qatoriga yaratilganda yoziladi (keyin menyu
 * o'zgarsa ham eski buyurtma ko'chmaydi). Har qator alohida «tayyor» bo'ladi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kitchen_stations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name', 60);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['company_id', 'sort_order']);
        });

        Schema::create('kitchen_station_user', function (Blueprint $table) {
            $table->foreignId('kitchen_station_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->primary(['kitchen_station_id', 'user_id']);
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->foreignId('kitchen_station_id')->nullable()->constrained()->nullOnDelete();
        });
        Schema::table('menu_items', function (Blueprint $table) {
            $table->foreignId('kitchen_station_id')->nullable()->constrained()->nullOnDelete();
        });
        Schema::table('order_items', function (Blueprint $table) {
            $table->foreignId('kitchen_station_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('ready_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('kitchen_station_id');
            $table->dropColumn('ready_at');
        });
        Schema::table('menu_items', fn (Blueprint $table) => $table->dropConstrainedForeignId('kitchen_station_id'));
        Schema::table('categories', fn (Blueprint $table) => $table->dropConstrainedForeignId('kitchen_station_id'));
        Schema::dropIfExists('kitchen_station_user');
        Schema::dropIfExists('kitchen_stations');
    }
};
