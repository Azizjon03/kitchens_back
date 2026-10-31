<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CatalogItem extends Model
{
    protected $fillable = ['catalog_category_id', 'name_uz', 'name_ru', 'sell_type', 'price', 'min_weight', 'weight_step', 'sort_order', 'is_active', 'image'];

    protected $casts = [
        'price' => 'decimal:2', 'min_weight' => 'decimal:3', 'weight_step' => 'decimal:3',
        'sort_order' => 'integer', 'is_active' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(CatalogCategory::class, 'catalog_category_id');
    }
}
