<?php

namespace App\Models;

use App\Models\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

/** #53: oshxona LAN printeri (ESC/POS) */
class Printer extends Model
{
    use BelongsToCompany;

    protected $fillable = ['company_id', 'branch_id', 'name', 'ip', 'port', 'paper_width', 'is_active', 'status', 'last_error', 'last_checked_at'];

    protected $casts = ['port' => 'integer', 'paper_width' => 'integer', 'is_active' => 'boolean', 'last_checked_at' => 'datetime'];
}
