<?php

namespace App\Models;

use App\Models\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Stol shablonu (#24): stolga oldindan qo'yiladigan narsalar ro'yxati. */
class TableTemplate extends Model
{
    use BelongsToCompany;

    protected $fillable = ['company_id', 'name'];

    public function items(): HasMany
    {
        return $this->hasMany(TableTemplateItem::class);
    }

    public function tables(): HasMany
    {
        return $this->hasMany(Table::class);
    }
}
