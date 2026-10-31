<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Ilova vaqt zonasi UTC → Asia/Tashkent (UTC+5) ga o'tdi (config/app.php).
 *
 * Barcha `timestamp without time zone` ustunlari shu paytgacha UTC "devor vaqti"
 * bilan yozilgan. Endi ular Toshkent vaqti sifatida o'qiladi — shuning uchun
 * mavjud qiymatlar +5 soatga ko'chiriladi, aks holda har bir sana 5 soat
 * oldinga siljib ko'rinardi (buyurtma, smena, token muddati...).
 *
 * Toshkentda yozgi vaqt yo'q (doim +05:00), shuning uchun qat'iy 5 soat to'g'ri.
 * Faqat PostgreSQL: testlardagi sqlite :memory: har safar bo'sh yaratiladi.
 * Migratsiya har bir bazada bir marta ishlaydi (migrations jadvali) — takroriy siljish yo'q.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->shift('+');
    }

    public function down(): void
    {
        $this->shift('-');
    }

    private function shift(string $sign): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $columns = DB::select(
            "SELECT table_name, column_name
               FROM information_schema.columns
              WHERE table_schema = current_schema()
                AND data_type = 'timestamp without time zone'
              ORDER BY table_name, column_name"
        );

        DB::transaction(function () use ($columns, $sign) {
            foreach ($columns as $col) {
                DB::statement(sprintf(
                    'UPDATE "%s" SET "%s" = "%s" %s interval \'5 hours\' WHERE "%s" IS NOT NULL',
                    $col->table_name, $col->column_name, $col->column_name, $sign, $col->column_name
                ));
            }
        });
    }
};
