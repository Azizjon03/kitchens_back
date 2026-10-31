@php
    $t = fn ($k) => __("landing.$k", [], $locale);
    $base = config('seo.site_url');
    $canonical = $locale === 'ru' ? "$base/ru" : "$base/";
    $fmt = fn ($v) => number_format((float) $v, 0, '.', ' ');
    $jsonLd = [
        ['@context' => 'https://schema.org', '@type' => 'Organization', 'name' => 'Kitchens.uz', 'url' => "$base/", 'logo' => "$base/apple-touch-icon.png"]
            + (config('seo.contact_phone') ? ['telephone' => config('seo.contact_phone')] : []),
        ['@context' => 'https://schema.org', '@type' => 'SoftwareApplication', 'name' => 'Kitchens.uz',
            'applicationCategory' => 'BusinessApplication', 'operatingSystem' => 'Web, Android, iOS',
            'description' => $t('description'), 'inLanguage' => $locale,
            'offers' => $plans->map(fn ($p) => ['@type' => 'Offer', 'name' => $p->display_name, 'price' => (string) (float) $p->price_monthly, 'priceCurrency' => 'UZS'])->values()->all()],
        ['@context' => 'https://schema.org', '@type' => 'FAQPage',
            'mainEntity' => collect($t('faq'))->map(fn ($f) => ['@type' => 'Question', 'name' => $f[0], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f[1]]])->all()],
    ];
@endphp
@extends('seo.layout', ['title' => $t('title'), 'description' => $t('description'), 'canonical' => $canonical, 'locale' => $locale, 'jsonLd' => $jsonLd])

@section('alternates')
<link rel="alternate" hreflang="uz" href="{{ $base }}/">
<link rel="alternate" hreflang="ru" href="{{ $base }}/ru">
<link rel="alternate" hreflang="x-default" href="{{ $base }}/">
{{-- Panelga kirgan foydalanuvchi — o'z ish ekraniga --}}
<script>try{if(localStorage.getItem('access_token')){location.replace('/home')}}catch(e){}</script>
@endsection

@section('body')
<header class="top"><div class="wrap">
    <a class="brand" href="{{ $canonical }}"><img src="/favicon.svg" width="34" height="34" alt="">Kitchens.uz</a>
    <nav class="links" aria-label="Asosiy">
        <a href="#imkoniyatlar">{{ $t('nav_features') }}</a>
        <a href="#narxlar">{{ $t('nav_pricing') }}</a>
        <a href="#savollar">{{ $t('nav_faq') }}</a>
        <a href="{{ $locale === 'ru' ? $base.'/' : $base.'/ru' }}" hreflang="{{ $locale === 'ru' ? 'uz' : 'ru' }}">{{ $locale === 'ru' ? "O'zbekcha" : 'Русский' }}</a>
        <a class="btn btn-ghost" href="/login">{{ $t('login') }}</a>
    </nav>
</div></header>

<main>
<section class="hero"><div class="wrap">
    <h1>{{ $t('hero_title') }}</h1>
    <p class="lead">{{ $t('hero_text') }}</p>
    <p style="margin-top:24px">
        @if (config('seo.contact_telegram'))
            <a class="btn btn-primary" href="https://t.me/{{ config('seo.contact_telegram') }}">{{ $t('cta') }}</a>
        @elseif (config('seo.contact_phone'))
            <a class="btn btn-primary" href="tel:{{ config('seo.contact_phone') }}">{{ $t('cta') }}</a>
        @else
            <a class="btn btn-primary" href="/login">{{ $t('cta') }}</a>
        @endif
        <a class="btn btn-ghost" href="/login" style="margin-left:8px">{{ $t('login') }}</a>
    </p>
    <p class="muted small">{{ $t('cta_note') }}</p>
</div></section>

<section id="imkoniyatlar"><div class="wrap">
    <h2>{{ $t('features_title') }}</h2>
    <div class="grid">
        @foreach ($t('features') as [$name, $text])
            <article class="card"><h3>{{ $name }}</h3><p class="muted" style="margin:0">{{ $text }}</p></article>
        @endforeach
    </div>
</div></section>

<section style="background:#fafaf9"><div class="wrap">
    <h2>{{ $t('audience_title') }}</h2>
    <div>@foreach ($t('audience') as $a)<span class="pill">{{ $a }}</span>@endforeach</div>
</div></section>

@if ($plans->isNotEmpty())
<section id="narxlar"><div class="wrap">
    <h2>{{ $t('pricing_title') }}</h2>
    <div class="grid">
        @foreach ($plans as $plan)
            <article class="card">
                <h3>{{ $plan->display_name }}</h3>
                <p class="price">{{ (float) $plan->price_monthly > 0 ? $fmt($plan->price_monthly).' '.$t('per_month') : $t('free') }}</p>
                <p class="muted small" style="margin:0">{{ $plan->max_branches }} {{ $t('branches') }} · {{ $plan->max_staff }} {{ $t('staff') }}</p>
            </article>
        @endforeach
    </div>
    <p class="muted small">{{ $t('pricing_note') }}</p>
</div></section>
@endif

<section id="savollar" style="background:#fafaf9"><div class="wrap">
    <h2>{{ $t('faq_title') }}</h2>
    @foreach ($t('faq') as [$q, $a])
        <details><summary>{{ $q }}</summary><p class="muted" style="margin:10px 0 0">{{ $a }}</p></details>
    @endforeach
</div></section>

@if ($restaurants->isNotEmpty())
<section><div class="wrap">
    <h2>{{ $t('restaurants_title') }}</h2>
    <div class="grid">
        @foreach ($restaurants as $r)
            <a class="card" style="text-decoration:none;color:inherit" href="{{ $base }}/r/{{ $r->slug }}">
                <h3>{{ $r->name }}</h3>
                <p class="muted small" style="margin:0">{{ $r->publicPage()['city'] ?? '' }}</p>
            </a>
        @endforeach
    </div>
</div></section>
@endif

@if (config('seo.contact_phone') || config('seo.contact_telegram'))
<section id="bog-lanish"><div class="wrap">
    <h2>{{ $t('contact_title') }}</h2>
    <p class="muted">{{ $t('contact_text') }}</p>
    <p>
        @if (config('seo.contact_phone'))<a class="btn btn-ghost" href="tel:{{ config('seo.contact_phone') }}">{{ config('seo.contact_phone') }}</a>@endif
        @if (config('seo.contact_telegram'))<a class="btn btn-blue" href="https://t.me/{{ config('seo.contact_telegram') }}" style="margin-left:8px">Telegram</a>@endif
    </p>
</div></section>
@endif
</main>

<footer><div class="wrap">© {{ date('Y') }} Kitchens.uz — {{ $t('footer') }}</div></footer>
@endsection
