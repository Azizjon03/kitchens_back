<?php

namespace App\Models;

use App\Models\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** #40: oshxona bo'limi — o'z oshpazlari va kategoriyalari bilan. */
class KitchenStation extends Model
{
    use BelongsToCompany;

    protected $fillable = ['company_id', 'name', 'sort_order', 'is_active', 'printer_id'];

    protected $casts = ['is_active' => 'boolean', 'sort_order' => 'integer'];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    /** #53: bo'lim printeri */
    public function printer(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Printer::class);
    }
}
