<?php

namespace App\Models;

use App\Models\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Table extends Model
{
    use HasFactory, BelongsToCompany;

    protected $table = 'tables';

    protected $fillable = [
        'company_id', 'branch_id', 'number', 'seats', 'zone',
        'status', 'qr_code', 'qr_token', 'assigned_waiter_id',
        'merged_with_table_id',
    ];

    protected $casts = [
        'number' => 'integer',
        'seats' => 'integer',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function assignedWaiter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_waiter_id');
    }
}
