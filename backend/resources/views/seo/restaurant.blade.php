@php
    $base = config('seo.site_url');
    $url = "$base/r/{$company->slug}";
    $city = $page['city'];
    $title = $company->name.($city ? " — $city" : '').', menyu va narxlar';
    $itemCount = collect($menu)->sum(fn ($c) => count($c['items']) + collect($c['children'])->sum(fn ($s) => count($s['items'])));
    $description = $page['description']
        ?: $company->name.($city ? " ($city)" : '').": to'liq menyu va narxlar — {$itemCount} ta taom. ".($telegram ? "Telegram orqali buyurtma bering." : 'Manzil va telefon.');
    $fmt = fn ($v) => number_format((float) $v, 0, '.', ' ');
    $offer = fn ($i) => ['@type' => 'MenuItem', 'name' => $i->name_uz]
        + ($i->description_uz ? ['description' => $i->description_uz] : [])
        + ['offers' => ['@type' => 'Offer', 'price' => (string) (float) $i->price, 'priceCurrency' => 'UZS']];
    $restaurant = array_filter([
        '@context' => 'https://schema.org',
        '@type' => 'Restaurant',
        'name' => $company->name,
        'url' => $url,
        'telephone' => $company->phone,
        'image' => $company->logo ?: null,
        'servesCuisine' => $page['cuisine'] ?: "O'zbek taomlari",
        'priceRange' => "so'm",
        'address' => array_filter(['@type' => 'PostalAddress', 'streetAddress' => $company->address, 'addressLocality' => $city, 'addressCountry' => 'UZ']),
        'geo' => $page['latitude'] !== null ? ['@type' => 'GeoCoordinates', 'latitude' => $page['latitude'], 'longitude' => $page['longitude']] : null,
        'openingHoursSpecification' => $page['opens'] && $page['closes'] ? [[
            '@type' => 'OpeningHoursSpecification',
            'dayOfWeek' => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            'opens' => $page['opens'], 'closes' => $page['closes'],
        ]] : null,
        'hasMenu' => [
            '@type' => 'Menu',
            'hasMenuSection' => collect($menu)->map(fn ($c) => array_filter([
                '@type' => 'MenuSection', 'name' => $c['name'],
                'hasMenuItem' => array_map($offer, $c['items']) ?: null,
                'hasMenuSection' => collect($c['children'])->map(fn ($s) => ['@type' => 'MenuSection', 'name' => $s['name'], 'hasMenuItem' => array_map($offer, $s['items'])])->all() ?: null,
            ]))->all(),
        ],
    ]);
    $mapUrl = $page['latitude'] !== null ? "https://maps.google.com/?q={$page['latitude']},{$page['longitude']}" : null;
@endphp
@extends('seo.layout', ['title' => $title, 'description' => \Illuminate\Support\Str::limit($description, 158), 'canonical' => $url, 'locale' => 'uz', 'ogType' => 'restaurant', 'jsonLd' => [$restaurant]])

@section('body')
<header class="top"><div class="wrap">
    <a class="brand" href="{{ $url }}"><img src="/favicon.svg" width="34" height="34" alt="">{{ $company->name }}</a>
    @if ($telegram)<a class="btn btn-blue" href="https://t.me/{{ $telegram }}">Telegram orqali buyurtma</a>@endif
</div></header>

<main class="wrap" style="padding-bottom:48px">
    <section style="padding-bottom:8px">
        <h1>{{ $company->name }}{{ $city ? ' — '.$city : '' }}</h1>
        @if ($page['description'])<p class="lead">{{ $page['description'] }}</p>@endif
        <div class="facts">
            @if ($company->address)<span>📍 {{ $company->address }}@if ($mapUrl) · <a href="{{ $mapUrl }}" rel="nofollow">Xaritada</a>@endif</span>@endif
            @if ($company->phone)<span>📞 <a href="tel:{{ $company->phone }}">{{ $company->phone }}</a></span>@endif
            @if ($page['opens'] && $page['closes'])<span>🕘 Har kuni {{ $page['opens'] }}–{{ $page['closes'] }}</span>@endif
        </div>
    </section>

    <h2>Menyu</h2>
    @forelse ($menu as $cat)
        <section class="menu-cat" style="padding:0">
            <h3 style="font-size:22px">{{ $cat['name'] }}</h3>
            @foreach ($cat['items'] as $item)
                @include('seo.partials.item', ['item' => $item, 'fmt' => $fmt])
            @endforeach
            @foreach ($cat['children'] as $sub)
                <h4 class="menu-sub">{{ $sub['name'] }}</h4>
                @foreach ($sub['items'] as $item)
                    @include('seo.partials.item', ['item' => $item, 'fmt' => $fmt])
                @endforeach
            @endforeach
        </section>
    @empty
        <p class="muted">Menyu tez orada qo'shiladi.</p>
    @endforelse
    <p class="muted small" style="margin-top:28px">Narxlar so'mda. Aniq narx va mavjudligini restorandan so'rang.</p>
</main>

<footer><div class="wrap">Menyu <a href="{{ $base }}/">Kitchens.uz</a> — restoran va kafe uchun dastur orqali yuritiladi.</div></footer>
@endsection
