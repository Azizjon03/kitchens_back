<?php

namespace App\Models;

use App\Models\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** #49: zal — stollar guruhi; xohlasa butun zalga bitta buyurtma olinadi. */
class TableGroup extends Model
{
    use BelongsToCompany;

    protected $fillable = ['company_id', 'branch_id', 'name', 'allow_whole', 'sort_order'];

    protected $casts = ['allow_whole' => 'boolean', 'sort_order' => 'integer'];

    public function tables(): HasMany
    {
        return $this->hasMany(Table::class);
    }
}
