<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * #29: kompaniya menyusidagi nusxa katalogdagi qaysi yozuvdan olinganini biladi —
 * "Qo'shilgan" belgisi va takror qo'shmaslik uchun. Katalog yozuvi o'chsa bog'lanish bo'shaydi,
 * restoran nusxasi saqlanadi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->foreignId('catalog_category_id')->nullable()->after('parent_id')->constrained('catalog_categories')->nullOnDelete();
        });
        Schema::table('menu_items', function (Blueprint $table) {
            $table->foreignId('catalog_item_id')->nullable()->after('category_id')->constrained('catalog_items')->nullOnDelete();
        });
        Schema::table('addons', function (Blueprint $table) {
            $table->foreignId('catalog_addon_id')->nullable()->after('company_id')->constrained('catalog_addons')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('addons', fn (Blueprint $t) => $t->dropConstrainedForeignId('catalog_addon_id'));
        Schema::table('menu_items', fn (Blueprint $t) => $t->dropConstrainedForeignId('catalog_item_id'));
        Schema::table('categories', fn (Blueprint $t) => $t->dropConstrainedForeignId('catalog_category_id'));
    }
};
