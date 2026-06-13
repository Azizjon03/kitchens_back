<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Allow fractional portions (e.g. 0.7 osh) for portion-priced items.
        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal('quantity', 8, 2)->default(1)->change();
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->integer('quantity')->default(1)->change();
        });
    }
};
