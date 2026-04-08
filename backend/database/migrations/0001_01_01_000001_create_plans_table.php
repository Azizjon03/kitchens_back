<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->string('display_name', 100);
            $table->decimal('price_monthly', 12, 2)->default(0);
            $table->integer('max_branches')->default(1);
            $table->integer('max_staff')->default(5);
            $table->boolean('has_inventory')->default(false);
            $table->boolean('has_full_reports')->default(false);
            $table->boolean('has_branding')->default(false);
            $table->boolean('has_subdomain')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
