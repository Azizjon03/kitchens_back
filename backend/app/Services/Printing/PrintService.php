<?php

namespace App\Services\Printing;

use App\Models\KitchenStation;
use App\Models\Order;
use App\Models\PrintJob;
use App\Models\Printer;
use Illuminate\Support\Collection;

/**
 * #53: oshxona printerlariga vazifalar. Har bo'lim (printeri biriktirilgan) uchun
 * faqat o'z taomlari bilan alohida qog'oz — narxsiz, yirik.
 */
class PrintService
{
    /**
     * @param  array<int, int>|null  $stationIds  null — barcha printerli bo'limlar
     * @return Collection<int, PrintJob>
     */
    public function kitchenJobs(Order $order, ?array $stationIds = null): Collection
    {
        $order->loadMissing(['table', 'user', 'orderItems.menuItem', 'orderItems.modifiers', 'orderItems.addons']);
        $items = $order->orderItems->reject(fn ($it) => $it->is_table_set)->filter(fn ($it) => $it->kitchen_station_id !== null);
        if ($items->isEmpty()) {
            return collect();
        }

        $stations = KitchenStation::withoutGlobalScopes()->with('printer')
            ->where('company_id', $order->company_id)
            ->whereIn('id', $items->pluck('kitchen_station_id')->unique())
            ->when($stationIds !== null, fn ($q) => $q->whereIn('id', $stationIds))
            ->get();
        $names = KitchenStation::withoutGlobalScopes()->whereIn('id', $items->pluck('kitchen_station_id')->unique())->pluck('name', 'id');

        $jobs = collect();
        foreach ($stations as $station) {
            $printer = $station->printer;
            if (! $printer || ! $printer->is_active || $printer->branch_id !== $order->branch_id) {
                continue;
            }
            $mine = $items->where('kitchen_station_id', $station->id);
            $others = $names->except($station->id)->only($items->pluck('kitchen_station_id')->unique()->all())->values()->all();
            $jobs->push(PrintJob::withoutGlobalScopes()->create([
                'company_id' => $order->company_id,
                'branch_id' => $order->branch_id,
                'printer_id' => $printer->id,
                'order_id' => $order->id,
                'kind' => 'kitchen',
                'payload' => base64_encode($this->kitchenTicket($order, $station->name, $mine, $others, $printer->paper_width)),
            ]));
        }

        return $jobs;
    }

    public function testJob(Printer $printer): PrintJob
    {
        $p = (new EscPos($printer->paper_width))
            ->align('center')->bold()->size(2)->line('SINOV CHEKI')->size(1)
            ->line($printer->name)->bold(false)
            ->line($printer->ip.':'.$printer->port.' - '.$printer->paper_width.' mm')
            ->line(now()->format('d.m.Y H:i'))->rule()
            ->line("Printer Kitchens'ga ulandi")->feed(3)->cut();

        return PrintJob::withoutGlobalScopes()->create([
            'company_id' => $printer->company_id, 'branch_id' => $printer->branch_id, 'printer_id' => $printer->id,
            'kind' => 'test', 'payload' => base64_encode($p->bytes()),
        ]);
    }

    /** @param  Collection<int, \App\Models\OrderItem>  $items @param array<int, string> $others */
    public function kitchenTicket(Order $order, string $station, Collection $items, array $others, int $width = 80): string
    {
        $table = $order->getRelationValue('table');
        $where = $table ? 'STOL '.$table->number : ($order->type === 'delivery' ? 'YETKAZISH' : 'OLIB KETISH');
        $p = (new EscPos($width))
            ->align('center')->bold()->invert()->line(' '.mb_strtoupper($station).' ')->invert(false)
            ->size(2)->wrap($where, 2)->size(1)
            ->align('left')->row('#'.$order->id.($order->user ? ' - '.$order->user->name : ''), optional($order->created_at)->format('H:i') ?? '')
            ->rule('=');

        foreach ($items->values() as $i => $it) {
            if ($i > 0) {
                $p->rule();
            }
            $qty = $it->weight_kg ? rtrim(rtrim(number_format((float) $it->weight_kg, 3, '.', ''), '0'), '.').' kg' : rtrim(rtrim((string) $it->quantity, '0'), '.');
            $p->bold()->size(2)->wrap("{$qty} x ".($it->menuItem?->name_uz ?? 'Taom'), 2)->size(1);
            foreach ($it->addons as $a) {
                $q = (int) ($a->pivot->quantity ?? 1);
                $p->wrap('  + '.mb_strtoupper($a->name_uz).($q > 1 ? " x{$q}" : ''), 1, '    ');
            }
            foreach ($it->modifiers as $m) {
                $p->wrap('  '.mb_strtoupper($m->name_uz), 1, '  ');
            }
            if ($it->note) {
                $p->wrap('  Izoh: '.$it->note, 1, '  ');
            }
            $p->bold(false);
        }
        if ($order->note) {
            $p->rule()->bold()->wrap('Izoh: '.$order->note)->bold(false);
        }
        $p->rule('=');
        if ($others) {
            $p->wrap("Boshqa bo'limlar: ".implode(', ', $others));
        }

        return $p->feed(4)->cut()->bytes();
    }
}
