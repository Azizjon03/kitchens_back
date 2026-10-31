<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Global standart menyu kategoriyasi / sub-menyusi (#23). Kompaniyaga tegishli emas. */
class CatalogCategory extends Model
{
    protected $fillable = ['parent_id', 'name_uz', 'name_ru', 'icon', 'types', 'sort_order', 'is_active'];

    protected $casts = ['types' => 'array', 'sort_order' => 'integer', 'is_active' => 'boolean'];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }

    public function items(): HasMany
    {
        return $this->hasMany(CatalogItem::class)->orderBy('sort_order');
    }

    public function addons(): BelongsToMany
    {
        return $this->belongsToMany(CatalogAddon::class, 'catalog_addon_category');
    }

    /** Sub-menyuda turlar berilmagan bo'lsa — kategoriyanikidan meros */
    public function effectiveTypes(): array
    {
        return $this->types ?? $this->parent?->types ?? [];
    }
}
