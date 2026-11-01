<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Table;
use App\Models\TableGroup;
use Illuminate\Support\Facades\DB;

/**
 * #49: zal stollari holatini moslashtiradi.
 * - «Butun zal» stoli faqat zal butun zalga buyurtmaga ruxsat bersa bor; nomi — zal
 *   nomi, sig'imi — ichidagi stollar yig'indisi.
 * - Butun zalda faol buyurtma bo'lsa — ichidagi stollar band; ichidagi biror stolda
 *   faol buyurtma bo'lsa — «butun zal» band. Faqat free ↔ occupied almashtiriladi
 *   (bron, tozalash, birlashtirilgan holatlarga tegilmaydi).
 */
class TableGroupService
{
    public function syncWholeTable(TableGroup $group): void
    {
        $whole = Table::withoutGlobalScopes()->where('table_group_id', $group->id)->where('is_whole_group', true)->first();
        $members = Table::withoutGlobalScopes()->where('table_group_id', $group->id)->where('is_whole_group', false);

        if (! $group->allow_whole) {
            // Faol buyurtmasi bo'lmasa — olib tashlanadi
            if ($whole && ! $this->hasActiveOrder($whole->id)) {
                $whole->delete();
            }

            return;
        }

        $attrs = [
            'company_id' => $group->company_id,
            'branch_id' => $group->branch_id,
            'number' => mb_substr($group->name, 0, 20),
            'seats' => max(1, (int) (clone $members)->sum('seats')),
            'zone' => $group->name,
        ];
        if ($whole) {
            $whole->update($attrs);
        } else {
            Table::withoutGlobalScopes()->create($attrs + ['table_group_id' => $group->id, 'is_whole_group' => true, 'status' => 'free']);
        }
        $this->syncStatuses($group->id);
    }

    /** Zal ichidagi band/bo'sh holatlarni faol buyurtmalarga qarab moslaydi. */
    public function syncStatuses(?int $groupId): void
    {
        if (! $groupId) {
            return;
        }
        $tables = Table::withoutGlobalScopes()->where('table_group_id', $groupId)->get();
        $whole = $tables->firstWhere('is_whole_group', true);
        if (! $whole) {
            return;
        }
        $active = Order::withoutGlobalScopes()->whereIn('table_id', $tables->pluck('id'))
            ->whereNotIn('status', OrderService::TERMINAL_STATUSES)->pluck('table_id')->unique()->all();
        $wholeBusy = in_array($whole->id, $active, true);
        $anyMemberBusy = $tables->where('is_whole_group', false)->contains(fn ($t) => in_array($t->id, $active, true));

        DB::transaction(function () use ($tables, $active, $wholeBusy, $anyMemberBusy) {
            foreach ($tables as $t) {
                if (! in_array($t->status, ['free', 'occupied'], true)) {
                    continue;
                }
                $busy = $t->is_whole_group
                    ? ($wholeBusy || $anyMemberBusy)
                    : (in_array($t->id, $active, true) || $wholeBusy);
                $status = $busy ? 'occupied' : 'free';
                if ($t->status !== $status) {
                    $t->update(['status' => $status]);
                }
            }
        });
    }

    public function syncForTable(?int $tableId): void
    {
        if ($tableId) {
            $this->syncStatuses(Table::withoutGlobalScopes()->whereKey($tableId)->value('table_group_id'));
        }
    }

    private function hasActiveOrder(int $tableId): bool
    {
        return Order::withoutGlobalScopes()->where('table_id', $tableId)->whereNotIn('status', OrderService::TERMINAL_STATUSES)->exists();
    }
}
