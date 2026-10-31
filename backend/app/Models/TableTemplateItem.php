<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TableTemplateItem extends Model
{
    public $timestamps = false;

    protected $fillable = ['table_template_id', 'menu_item_id', 'quantity'];

    protected $casts = ['quantity' => 'integer'];

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class)->withoutGlobalScopes();
    }
}
