<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Standart menyu katalogi (#23) — super admin boshqaradigan GLOBAL jadval (kompaniyaga
 * tegishli emas). Kompaniya ochilganda tanlangan restoran turi bo'yicha shu yerdan
 * nusxa olinadi; keyin restoran o'z nusxasini mustaqil boshqaradi.
 *
 * Boshlang'ich ma'lumot: app/Services/MenuTemplate/catalog.php (bir marta yuklanadi).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('catalog_categories')->cascadeOnDelete();
            $table->string('name_uz');
            $table->string('name_ru');
            $table->string('icon', 16)->nullable();
            // Restoran turlari: oshxona, fast_food, kafe, hammasi. Sub-menyuda null — kategoriyanikidan meros
            $table->json('types')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('catalog_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('catalog_category_id')->constrained('catalog_categories')->cascadeOnDelete();
            $table->string('name_uz');
            $table->string('name_ru');
            $table->enum('sell_type', ['portion', 'weight'])->default('portion');
            $table->decimal('price', 12, 2);
            $table->decimal('min_weight', 8, 3)->nullable();
            $table->decimal('weight_step', 8, 3)->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('catalog_addons', function (Blueprint $table) {
            $table->id();
            $table->string('name_uz');
            $table->string('name_ru');
            $table->decimal('price', 12, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Qo'shimcha qaysi sub-menyu taomlariga biriktiriladi (masalan osh qo'shimchalari → Palov)
        Schema::create('catalog_addon_category', function (Blueprint $table) {
            $table->foreignId('catalog_addon_id')->constrained('catalog_addons')->cascadeOnDelete();
            $table->foreignId('catalog_category_id')->constrained('catalog_categories')->cascadeOnDelete();
            $table->primary(['catalog_addon_id', 'catalog_category_id']);
        });

        $this->seedFromFile();
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_addon_category');
        Schema::dropIfExists('catalog_addons');
        Schema::dropIfExists('catalog_items');
        Schema::dropIfExists('catalog_categories');
    }

    private function seedFromFile(): void
    {
        $catalog = require app_path('Services/MenuTemplate/catalog.php');
        $now = now();
        $keyToId = [];
        $catSort = 0;

        foreach ($catalog['categories'] as $catKey => $cat) {
            $catId = DB::table('catalog_categories')->insertGetId([
                'name_uz' => $cat['uz'], 'name_ru' => $cat['ru'], 'icon' => $cat['icon'] ?? null,
                'types' => isset($cat['types']) ? json_encode($cat['types']) : null,
                'sort_order' => $catSort++, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
            ]);
            $subSort = 0;

            foreach ($cat['children'] as $subKey => $sub) {
                $subId = DB::table('catalog_categories')->insertGetId([
                    'parent_id' => $catId, 'name_uz' => $sub['uz'], 'name_ru' => $sub['ru'],
                    'types' => isset($sub['types']) ? json_encode($sub['types']) : null,
                    'sort_order' => $subSort++, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
                ]);
                $keyToId["{$catKey}.{$subKey}"] = $subId;

                foreach (array_values($sub['items']) as $i => $item) {
                    [$uz, $ru, $price] = $item;
                    $weight = $item['weight'] ?? null;
                    DB::table('catalog_items')->insert([
                        'catalog_category_id' => $subId, 'name_uz' => $uz, 'name_ru' => $ru, 'price' => $price,
                        'sell_type' => $weight ? 'weight' : 'portion',
                        'min_weight' => $weight[0] ?? null, 'weight_step' => $weight[1] ?? null,
                        'sort_order' => $i, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
                    ]);
                }
            }
        }

        foreach ($catalog['addons'] as [$uz, $ru, $price]) {
            $addonId = DB::table('catalog_addons')->insertGetId([
                'name_uz' => $uz, 'name_ru' => $ru, 'price' => $price, 'is_active' => true,
                'created_at' => $now, 'updated_at' => $now,
            ]);
            foreach ($catalog['addon_targets'] as $target) {
                DB::table('catalog_addon_category')->insert(['catalog_addon_id' => $addonId, 'catalog_category_id' => $keyToId[$target]]);
            }
        }
    }
};
