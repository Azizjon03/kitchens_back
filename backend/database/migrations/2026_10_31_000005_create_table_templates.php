<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stol shablonlari (#24): stolga oldindan qo'yiladigan narsalar (masalan 3 sharbat, 4 mohito).
 * Hisob yopilishidan oldin faqat ishlatilgani buyurtmaga `is_table_set` qator sifatida tushadi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('table_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('table_template_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('table_template_id')->constrained()->cascadeOnDelete();
            $table->foreignId('menu_item_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('quantity');
            $table->unique(['table_template_id', 'menu_item_id']);
        });

        Schema::table('tables', function (Blueprint $table) {
            $table->foreignId('table_template_id')->nullable()->after('zone')->constrained()->nullOnDelete();
        });

        Schema::table('order_items', function (Blueprint $table) {
            // Stol to'plamidan ishlatilgan narsa: KDS'ga bormaydi, buyurtma tahririda saqlanadi
            $table->boolean('is_table_set')->default(false)->after('note');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', fn (Blueprint $table) => $table->dropColumn('is_table_set'));
        Schema::table('tables', function (Blueprint $table) {
            $table->dropConstrainedForeignId('table_template_id');
        });
        Schema::dropIfExists('table_template_items');
        Schema::dropIfExists('table_templates');
    }
};
