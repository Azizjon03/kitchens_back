<?php

namespace App\Models;

use App\Models\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory, BelongsToCompany;

    protected $fillable = [
        'company_id', 'branch_id', 'table_id', 'user_id', 'customer_id',
        'type', 'status', 'subtotal', 'discount_type', 'discount_value',
        'discount_amount', 'service_charge_pct', 'service_charge_amount',
        'delivery_fee', 'total', 'promo_id', 'note',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount_value' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'service_charge_pct' => 'decimal:2',
        'service_charge_amount' => 'decimal:2',
        'delivery_fee' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(Table::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Compact payload used for KDS / waiter real-time broadcasts.
     */
    public function toBroadcastArray(): array
    {
        $this->loadMissing(['table', 'orderItems.menuItem', 'orderItems.modifiers', 'orderItems.addons']);

        // NB: inside the model `$this->table` is the protected table-name string,
        // so the relation must be read via getRelationValue().
        $tableRel = $this->getRelationValue('table');

        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'branch_id' => $this->branch_id,
            'type' => $this->type,
            'status' => $this->status,
            'note' => $this->note,
            'total' => $this->total,
            'created_at' => optional($this->created_at)->toIso8601String(),
            'table' => $tableRel ? [
                'id' => $tableRel->id,
                'number' => $tableRel->number,
            ] : null,
            'items' => $this->orderItems->map(fn (OrderItem $item) => [
                'id' => $item->id,
                'name_uz' => $item->menuItem?->name_uz,
                'name_ru' => $item->menuItem?->name_ru,
                'quantity' => $item->quantity,
                'weight_kg' => $item->weight_kg,
                'note' => $item->note,
                'modifiers' => $item->modifiers->map(fn (Modifier $m) => [
                    'id' => $m->id,
                    'name_uz' => $m->name_uz,
                    'name_ru' => $m->name_ru,
                ])->values(),
                'addons' => $item->addons->map(fn (Addon $a) => [
                    'id' => $a->id,
                    'name_uz' => $a->name_uz,
                    'name_ru' => $a->name_ru,
                ])->values(),
            ])->values(),
        ];
    }
}
