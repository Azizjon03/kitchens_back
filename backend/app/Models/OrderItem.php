<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id', 'menu_item_id', 'quantity', 'weight_kg',
        'unit_price', 'total_price', 'note',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'weight_kg' => 'decimal:3',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class);
    }

    public function modifiers(): BelongsToMany
    {
        return $this->belongsToMany(Modifier::class, 'order_item_modifiers');
    }

    public function addons(): BelongsToMany
    {
        return $this->belongsToMany(Addon::class, 'order_item_addons')->withPivot('price');
    }
}
