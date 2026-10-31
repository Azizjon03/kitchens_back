<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class CatalogAddon extends Model
{
    protected $fillable = ['name_uz', 'name_ru', 'price', 'is_active'];

    protected $casts = ['price' => 'decimal:2', 'is_active' => 'boolean'];

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(CatalogCategory::class, 'catalog_addon_category');
    }
}
