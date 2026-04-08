<?php

namespace App\Models;

use App\Models\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class MenuItem extends Model
{
    use HasFactory, BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'company_id', 'category_id', 'name_uz', 'name_ru',
        'description_uz', 'description_ru', 'sell_type', 'price',
        'min_weight', 'weight_step', 'image', 'cooking_time',
        'is_available', 'is_popular', 'sort_order', 'allergens',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'min_weight' => 'decimal:3',
        'weight_step' => 'decimal:3',
        'cooking_time' => 'integer',
        'is_available' => 'boolean',
        'is_popular' => 'boolean',
        'sort_order' => 'integer',
        'allergens' => 'array',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function modifiers(): BelongsToMany
    {
        return $this->belongsToMany(Modifier::class, 'menu_item_modifiers');
    }

    public function addons(): BelongsToMany
    {
        return $this->belongsToMany(Addon::class, 'menu_item_addons');
    }
}
