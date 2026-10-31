<?php

/**
 * Standart menyu katalogining BOSHLANG'ICH ma'lumoti (#23). Migratsiya uni bir marta
 * catalog_* jadvallariga yuklaydi; keyin katalog super admin panelida boshqariladi
 * (bu fayl o'zgarsa, mavjud bazaga ta'sir qilmaydi).
 *
 * Narxlar TAXMINIY (2026-10-31): Chust/Namangan bozori, ochiq manbalarga kalibrlangan —
 * rasmiy "Osh indeksi" (Namangan 22 200–23 000 so'm/porsiya, 2024-12/2025-01 → +15%),
 * Oqtepa Lavash rasmiy menyusi, chakana suv/ichimlik narxlari × ~1.4. Manbalar va
 * hisob-kitob: GitHub issue #23. Restoran narxlarni o'zi o'zgartiradi.
 *
 * Tuzilma: kategoriya → sub-menyu → taomlar. `types` — qaysi restoran turlariga
 * kiradi (sub-menyuda berilsa, kategoriyanikidan ustun). Taom: [uz, ru, narx] yoki
 * vaznli: [uz, ru, kg narxi, 'weight' => [min, qadam]].
 */
$all = ['oshxona', 'fast_food', 'kafe', 'hammasi'];

return [
    'types' => [
        'oshxona' => 'Oshxona (milliy taomlar)',
        'fast_food' => 'Fast food',
        'kafe' => 'Kafe',
        'hammasi' => 'Hammasi',
        'bosh' => "Bo'sh menyu",
    ],

    'categories' => [
        'milliy' => [
            'uz' => 'Milliy taomlar', 'ru' => 'Национальные блюда', 'icon' => '🍲',
            'types' => ['oshxona', 'hammasi'],
            'children' => [
                'palov' => ['uz' => 'Palov', 'ru' => 'Плов', 'items' => [
                    ['Osh (to\'y oshi)', 'Плов (свадебный)', 27000],
                    ['Osh — yarim porsiya', 'Плов — полпорции', 16000],
                    ['Choyxona osh (kg)', 'Чайханский плов (кг)', 90000, 'weight' => [0.5, 0.5]],
                    ['Osh komplekt (qazi, bedana tuxumi, limon)', 'Плов комплект (казы, перепелиное яйцо, лимон)', 36000],
                    ['Qazili osh', 'Плов с казы', 38000],
                    ['Bedana tuxumli osh', 'Плов с перепелиными яйцами', 32000],
                ]],
                'suyuq' => ['uz' => 'Suyuq taomlar', 'ru' => 'Супы', 'items' => [
                    ['Sho\'rva', 'Шурпа', 25000],
                    ['Kosa sho\'rva', 'Шурпа в косе', 30000],
                    ['Mastava', 'Мастава', 22000],
                    ['Mashhurda', 'Машхурда', 20000],
                    ['Lag\'mon (suyuq)', 'Лагман (суп)', 26000],
                    ['Chuchvara (suyuq)', 'Чучвара (суп)', 24000],
                    ['Halim', 'Халим', 24000],
                ]],
                'ikkinchi' => ['uz' => 'Ikkinchi taomlar', 'ru' => 'Вторые блюда', 'items' => [
                    ['Norin', 'Нарын', 28000],
                    ['Qovurma lag\'mon', 'Жареный лагман', 30000],
                    ['Manti (4 dona)', 'Манты (4 шт)', 26000],
                    ['Dimlama', 'Димлама', 30000],
                    ['Qozon kabob', 'Казан-кабоб', 42000],
                    ['Qovurdoq', 'Ковурдак', 34000],
                    ['Dolma', 'Долма', 28000],
                    ['Xonim', 'Ханум', 22000],
                    ['Tandir go\'sht (kg)', 'Тандыр гушт (кг)', 220000, 'weight' => [0.25, 0.05]],
                ]],
                'somsa' => ['uz' => 'Somsa va xamir', 'ru' => 'Самса и выпечка', 'items' => [
                    ['Chust pichoq somsa', 'Чустская самса', 8000],
                    ['Tandir somsa', 'Тандырная самса', 8000],
                    ['Qovoq somsa', 'Самса с тыквой', 6000],
                    ['Ko\'k somsa', 'Самса с зеленью', 6000],
                    ['Gumma', 'Гумма', 3000],
                ]],
                'kabob' => ['uz' => 'Kaboblar', 'ru' => 'Шашлыки', 'items' => [
                    ['Go\'sht kabob (1 six)', 'Шашлык из мяса (1 шт)', 17000],
                    ['Qiyma kabob (1 six)', 'Люля-кебаб (1 шт)', 14000],
                    ['Jigar kabob (1 six)', 'Шашлык из печени (1 шт)', 14000],
                    ['Tovuq kabob (1 six)', 'Шашлык из курицы (1 шт)', 13000],
                    ['Qanot kabob (1 six)', 'Крылышки на мангале (1 шт)', 14000],
                    ['Charvi kabob (1 six)', 'Шашлык в сетке (1 шт)', 15000],
                    ['Assorti kabob (5 six)', 'Ассорти шашлыков (5 шт)', 75000],
                    ['Mol go\'shti kabob (kg)', 'Шашлык из говядины (кг)', 210000, 'weight' => [0.2, 0.1]],
                ]],
            ],
        ],

        'salatlar' => [
            'uz' => 'Salatlar', 'ru' => 'Салаты', 'icon' => '🥗',
            'children' => [
                'milliy_salat' => ['uz' => 'Milliy salatlar', 'ru' => 'Национальные салаты', 'types' => ['oshxona', 'hammasi'], 'items' => [
                    ['Achchiq-chuchuk', 'Аччик-чучук', 12000],
                    ['Anor va turp salati', 'Салат из редьки с гранатом', 15000],
                    ['Turp va tuxum salati', 'Салат из редьки с яйцом', 15000],
                    ['Karam salati', 'Салат из капусты', 10000],
                ]],
                'yevropa_salat' => ['uz' => 'Yevropa salatlari', 'ru' => 'Европейские салаты', 'types' => ['oshxona', 'fast_food', 'hammasi'], 'items' => [
                    ['Svejiy (bodring-pomidor)', 'Свежий (огурцы-помидоры)', 14000],
                    ['Olivye', 'Оливье', 20000],
                    ['Sezar', 'Цезарь', 28000],
                ]],
            ],
        ],

        'non' => [
            'uz' => 'Non va shirinliklar', 'ru' => 'Хлеб и сладости', 'icon' => '🍞',
            'children' => [
                'non_turlari' => ['uz' => 'Non', 'ru' => 'Хлеб', 'types' => ['oshxona', 'hammasi'], 'items' => [
                    ['Tandir non', 'Тандырная лепёшка', 5000],
                    ['Patir', 'Патир', 8000],
                    ['Buxanka', 'Буханка', 5000],
                ]],
                'milliy_shirinlik' => ['uz' => 'Milliy shirinliklar', 'ru' => 'Национальные сладости', 'types' => ['oshxona', 'kafe', 'hammasi'], 'items' => [
                    ['Paxlava', 'Пахлава', 15000],
                    ['Holva', 'Халва', 10000],
                    ['Nisholda', 'Нишалда', 10000],
                    ['Parvarda (100 g)', 'Парварда (100 г)', 8000],
                ]],
            ],
        ],

        'fastfood' => [
            'uz' => 'Fast food', 'ru' => 'Фастфуд', 'icon' => '🍔',
            'types' => ['fast_food', 'hammasi'],
            'children' => [
                'lavash' => ['uz' => 'Lavash', 'ru' => 'Лаваш', 'items' => [
                    ['Mini lavash', 'Мини лаваш', 30000],
                    ['Lavash', 'Лаваш', 35000],
                    ['Pishloqli lavash', 'Лаваш с сыром', 38000],
                    ['Tovuqli lavash', 'Куриный лаваш', 33000],
                    ['Tandir lavash', 'Тандыр лаваш', 37000],
                ]],
                'shaurma' => ['uz' => 'Shaurma va donar', 'ru' => 'Шаурма и донер', 'items' => [
                    ['Shaurma', 'Шаурма', 29000],
                    ['Katta shaurma', 'Большая шаурма', 33000],
                    ['Pita donar', 'Пита донер', 33000],
                    ['Big donar', 'Биг донер', 39000],
                    ['Donar mix', 'Донер микс', 52000],
                ]],
                'burger' => ['uz' => 'Burgerlar', 'ru' => 'Бургеры', 'items' => [
                    ['Gamburger', 'Гамбургер', 32000],
                    ['Chizburger', 'Чизбургер', 34000],
                    ['Tovuq burger', 'Чикенбургер', 32000],
                    ['Big burger', 'Биг бургер', 47000],
                    ['Klab sendvich', 'Клаб сэндвич', 39000],
                ]],
                'hotdog' => ['uz' => 'Hot-dog', 'ru' => 'Хот-дог', 'items' => [
                    ['Hot-dog', 'Хот-дог', 18000],
                    ['Pishloqli hot-dog', 'Хот-дог с сыром', 20000],
                    ['Qirollik hot-dog', 'Королевский хот-дог', 26000],
                ]],
                'pitsa' => ['uz' => 'Pitsa', 'ru' => 'Пицца', 'items' => [
                    ['Margarita', 'Маргарита', 80000],
                    ['Pepperoni', 'Пепперони', 90000],
                    ['Tovuqli pitsa', 'Куриная пицца', 100000],
                    ['Assorti pitsa', 'Пицца ассорти', 105000],
                    ['Qazili pitsa', 'Пицца с казы', 108000],
                    ['Go\'shtli pitsa', 'Мясная пицца', 113000],
                ]],
                'garnir' => ['uz' => 'Garnir va sneklar', 'ru' => 'Гарниры и снеки', 'items' => [
                    ['Fri — kichik', 'Фри — малый', 11000],
                    ['Fri — o\'rta', 'Фри — средний', 18000],
                    ['Fri — katta', 'Фри — большой', 24000],
                    ['Qishloqcha kartoshka', 'Картофель по-деревенски', 18000],
                    ['Naggets (5 dona)', 'Наггетсы (5 шт)', 14000],
                    ['Naggets (8 dona)', 'Наггетсы (8 шт)', 22000],
                    ['Strips (3 dona)', 'Стрипсы (3 шт)', 21000],
                    ['Strips (5 dona)', 'Стрипсы (5 шт)', 32000],
                ]],
                'sous' => ['uz' => 'Souslar', 'ru' => 'Соусы', 'items' => [
                    ['Ketchup', 'Кетчуп', 4000],
                    ['Sarimsoqli sous', 'Чесночный соус', 4000],
                    ['Pishloqli sous', 'Сырный соус', 4000],
                    ['Achchiq chili sous', 'Острый соус чили', 4000],
                ]],
            ],
        ],

        'kafe' => [
            'uz' => 'Kafe', 'ru' => 'Кафе', 'icon' => '☕',
            'types' => ['kafe', 'hammasi'],
            'children' => [
                'qahva' => ['uz' => 'Qahva', 'ru' => 'Кофе', 'items' => [
                    ['Espresso', 'Эспрессо', 13000],
                    ['Dabl espresso', 'Двойной эспрессо', 16000],
                    ['Amerikano', 'Американо', 15000],
                    ['Kapuchino', 'Капучино', 18000],
                    ['Latte', 'Латте', 20000],
                    ['Raf', 'Раф', 24000],
                    ['Issiq shokolad', 'Горячий шоколад', 20000],
                ]],
                'desert' => ['uz' => 'Desertlar', 'ru' => 'Десерты', 'items' => [
                    ['Chizkeyk', 'Чизкейк', 27000],
                    ['Tiramisu', 'Тирамису', 30000],
                    ['Napoleon', 'Наполеон', 24000],
                    ['Medovik', 'Медовик', 24000],
                    ['Muzqaymoq (3 shar)', 'Мороженое (3 шарика)', 18000],
                    ['Maffin', 'Маффин', 18000],
                    ['Donat', 'Донат', 18000],
                ]],
                'nonushta' => ['uz' => 'Nonushta', 'ru' => 'Завтраки', 'items' => [
                    ['Omlet', 'Омлет', 20000],
                    ['Quymoq', 'Блинчики', 18000],
                    ['Sirniki', 'Сырники', 22000],
                    ['Sutli bo\'tqa', 'Молочная каша', 15000],
                ]],
                'limonad' => ['uz' => 'Limonad va kokteyllar', 'ru' => 'Лимонады и коктейли', 'items' => [
                    ['Mohito klassik', 'Мохито классический', 17000],
                    ['Mohito qulupnay', 'Мохито клубничный', 17000],
                    ['Mohito mango', 'Мохито манго', 17000],
                    ['Ays-ti (stakan)', 'Айс-ти (стакан)', 17000],
                    ['Kivi-tarxun limonadi', 'Лимонад киви-тархун', 17000],
                ]],
            ],
        ],

        'suvlar' => [
            'uz' => 'Suvlar', 'ru' => 'Вода', 'icon' => '💧',
            'types' => $all,
            'children' => [
                'gazsiz' => ['uz' => 'Gazsiz suv', 'ru' => 'Вода без газа', 'items' => [
                    ['Hydrolife 0.5 l', 'Hydrolife 0.5 л', 5000],
                    ['Hydrolife 1.5 l', 'Hydrolife 1.5 л', 8000],
                    ['Nestlé Pure Life 0.5 l', 'Nestlé Pure Life 0.5 л', 5000],
                    ['BonAqua 0.5 l', 'BonAqua 0.5 л', 5000],
                    ['BonAqua 1.5 l', 'BonAqua 1.5 л', 8000],
                    ['Montella 0.5 l', 'Montella 0.5 л', 5000],
                    ['Silver Water 0.5 l', 'Silver Water 0.5 л', 5000],
                    ['Asu 0.5 l', 'Asu 0.5 л', 5000],
                    ['Asu 1.5 l', 'Asu 1.5 л', 8000],
                    ['Family 0.5 l', 'Family 0.5 л', 4000],
                    ['Biolife 0.5 l', 'Biolife 0.5 л', 4000],
                ]],
                'gazli_suv' => ['uz' => 'Gazli suv', 'ru' => 'Газированная вода', 'items' => [
                    ['Hydrolife gazli 0.5 l', 'Hydrolife газ. 0.5 л', 5000],
                    ['Hydrolife gazli 1.5 l', 'Hydrolife газ. 1.5 л', 8000],
                    ['BonAqua gazli 0.5 l', 'BonAqua газ. 0.5 л', 5000],
                    ['Nestlé gazli 1 l', 'Nestlé газ. 1 л', 7000],
                    ['Asu gazli 0.5 l', 'Asu газ. 0.5 л', 5000],
                    ['Asu gazli 1.5 l', 'Asu газ. 1.5 л', 8000],
                    ['Family gazli 0.5 l', 'Family газ. 0.5 л', 4000],
                ]],
                'mineral' => ['uz' => 'Mineral suv', 'ru' => 'Минеральная вода', 'items' => [
                    ['Chortoq 0.5 l', 'Чартак 0.5 л', 12000],
                    ['Chortoq yalpizli 0.33 l', 'Чартак с мятой 0.33 л', 10000],
                    ['Chortoq 1.5 l', 'Чартак 1.5 л', 14000],
                    ['Zangiota 1 l', 'Зангиота 1 л', 9000],
                    ['Omonxona 1.5 l', 'Омонхона 1.5 л', 10000],
                    ['Borjomi 0.5 l', 'Боржоми 0.5 л', 18000],
                    ['Yessentuki №17 0.45 l', 'Ессентуки №17 0.45 л', 18000],
                ]],
                'flavis' => ['uz' => 'Ta\'mli gazli suv (Flavis)', 'ru' => 'Вкусовая газ. вода (Flavis)', 'items' => array_merge(...array_map(
                    fn ($t) => [["Flavis {$t[0]} 0.5 l", "Flavis {$t[1]} 0.5 л", 9000], ["Flavis {$t[0]} 1.5 l", "Flavis {$t[1]} 1.5 л", 15000]],
                    [['Anor', 'гранат'], ['Mohito', 'мохито'], ['Qulupnayli mohito', 'клубничный мохито'], ['Nok', 'груша'], ['Limonad', 'лимонад'], ['Tarxun', 'тархун'], ['Ko\'k malina', 'голубая малина']]
                ))],
            ],
        ],

        'ichimliklar' => [
            'uz' => 'Ichimliklar', 'ru' => 'Напитки', 'icon' => '🥤',
            'types' => $all,
            'children' => [
                'issiq_choy' => ['uz' => 'Issiq choylar', 'ru' => 'Горячий чай', 'items' => [
                    ['Ko\'k choy (choynak)', 'Зелёный чай (чайник)', 6000],
                    ['Qora choy (choynak)', 'Чёрный чай (чайник)', 6000],
                    ['Limonli choy', 'Чай с лимоном', 10000],
                    ['Mevali choy', 'Фруктовый чай', 15000],
                ]],
                'gazli_ichimlik' => ['uz' => 'Gazli ichimliklar', 'ru' => 'Газированные напитки', 'items' => [
                    ['Coca-Cola 0.5 l', 'Coca-Cola 0.5 л', 10000],
                    ['Coca-Cola 1 l', 'Coca-Cola 1 л', 14000],
                    ['Coca-Cola 1.5 l', 'Coca-Cola 1.5 л', 18000],
                    ['Coca-Cola Zero 0.5 l', 'Coca-Cola Zero 0.5 л', 10000],
                    ['Fanta 0.5 l', 'Fanta 0.5 л', 10000],
                    ['Fanta 1.5 l', 'Fanta 1.5 л', 16000],
                    ['Sprite 0.5 l', 'Sprite 0.5 л', 10000],
                    ['Sprite 1.5 l', 'Sprite 1.5 л', 16000],
                    ['Pepsi 0.5 l', 'Pepsi 0.5 л', 10000],
                    ['Pepsi 1.5 l', 'Pepsi 1.5 л', 18000],
                    ['Mirinda 0.5 l', 'Mirinda 0.5 л', 10000],
                    ['7Up 0.5 l', '7Up 0.5 л', 10000],
                    ['RC Cola 0.5 l', 'RC Cola 0.5 л', 8000],
                    ['RC Cola 1.5 l', 'RC Cola 1.5 л', 14000],
                    ['Fensi 0.5 l', 'Fensi 0.5 л', 8000],
                    ['Fensi 1.5 l', 'Fensi 1.5 л', 14000],
                    ['Milliy Cola 0.5 l', 'Milliy Cola 0.5 л', 8000],
                    ['Milliy Cola 1.5 l', 'Milliy Cola 1.5 л', 14000],
                ]],
                'muzli_choy' => ['uz' => 'Muzli choy', 'ru' => 'Холодный чай', 'items' => [
                    ['Fuse Tea 0.5 l', 'Fuse Tea 0.5 л', 10000],
                    ['Fuse Tea 1 l', 'Fuse Tea 1 л', 15000],
                    ['Lipton 0.5 l', 'Lipton 0.5 л', 11000],
                    ['ArkTea 0.5 l', 'ArkTea 0.5 л', 6000],
                    ['Ays-ti 0.5 l', 'Айс-ти 0.5 л', 8000],
                ]],
                'energetik' => ['uz' => 'Energetik', 'ru' => 'Энергетики', 'items' => [
                    ['Flash Up 0.5 l', 'Flash Up 0.5 л', 12000],
                    ['Adrenaline Rush 0.5 l', 'Adrenaline Rush 0.5 л', 14000],
                    ['Red Bull 0.25 l', 'Red Bull 0.25 л', 22000],
                ]],
                'sharbat' => ['uz' => 'Sharbat va kompot', 'ru' => 'Соки и компот', 'items' => [
                    ['Dinay 1 l', 'Dinay 1 л', 18000],
                    ['Viko 1 l', 'Viko 1 л', 18000],
                    ['Sochnaya Dolina 0.2 l', 'Сочная долина 0.2 л', 6000],
                    ['Uy kompoti (stakan)', 'Домашний компот (стакан)', 6000],
                    ['Uy kompoti 1 l', 'Домашний компот 1 л', 15000],
                ]],
            ],
        ],
    ],

    // Osh qo'shimchalari — "milliy.palov" sub-menyusidagi barcha taomlarga biriktiriladi
    'addons' => [
        ['Qazi (bo\'lak)', 'Казы (ломтик)', 6000],
        ['Bedana tuxumi (dona)', 'Перепелиное яйцо (шт)', 1500],
        ['Qaynatilgan tuxum (dona)', 'Варёное яйцо (шт)', 2500],
        ['Limon (bo\'lak)', 'Лимон (долька)', 2000],
        ['Qo\'shimcha go\'sht', 'Дополнительное мясо', 18000],
        ['Achchiq-chuchuk (kichik)', 'Аччик-чучук (малый)', 6000],
    ],
    'addon_targets' => ['milliy.palov'],
];
