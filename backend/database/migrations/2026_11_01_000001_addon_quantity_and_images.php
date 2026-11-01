<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * #35: qo'shimcha soni (oshga 2× go'sht) va standart katalogdagi taom rasmi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_item_addons', function (Blueprint $table) {
            $table->unsignedSmallInteger('quantity')->default(1);
        });
        Schema::table('addons', function (Blueprint $table) {
            $table->unsignedSmallInteger('max_quantity')->default(5);
        });
        Schema::table('catalog_items', function (Blueprint $table) {
            $table->string('image')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('catalog_items', fn (Blueprint $t) => $t->dropColumn('image'));
        Schema::table('addons', fn (Blueprint $t) => $t->dropColumn('max_quantity'));
        Schema::table('order_item_addons', fn (Blueprint $t) => $t->dropColumn('quantity'));
    }
};
