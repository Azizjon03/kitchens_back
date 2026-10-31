<?php

use App\Http\Controllers\Web\SeoController;
use Illuminate\Support\Facades\Route;

// #27: qidiruv tizimlari uchun serverda tayyor sahifalar (nginx shu yo'llarni Laravel'ga yuboradi)
Route::get('/', [SeoController::class, 'landing'])->name('landing');
Route::get('/ru', fn (SeoController $c) => $c->landing('ru'))->name('landing.ru');
Route::get('/r/{slug}', [SeoController::class, 'restaurant'])->where('slug', '[a-z0-9-]+')->name('restaurant');
Route::get('/sitemap.xml', [SeoController::class, 'sitemap'])->name('sitemap');
