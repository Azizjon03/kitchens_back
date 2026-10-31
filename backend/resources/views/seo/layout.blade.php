<!doctype html>
<html lang="{{ $locale ?? 'uz' }}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{ $title }}</title>
<meta name="description" content="{{ $description }}">
<link rel="canonical" href="{{ $canonical }}">
@yield('alternates')
<meta name="theme-color" content="#b45309">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="{{ $ogType ?? 'website' }}">
<meta property="og:site_name" content="Kitchens.uz">
<meta property="og:title" content="{{ $title }}">
<meta property="og:description" content="{{ $description }}">
<meta property="og:url" content="{{ $canonical }}">
<meta property="og:image" content="{{ $ogImage ?? config('seo.site_url').'/og-image.png' }}">
<meta property="og:locale" content="{{ ($locale ?? 'uz') === 'ru' ? 'ru_RU' : 'uz_UZ' }}">
<meta name="twitter:card" content="summary_large_image">
@if (config('seo.google_verification'))<meta name="google-site-verification" content="{{ config('seo.google_verification') }}">@endif
@if (config('seo.yandex_verification'))<meta name="yandex-verification" content="{{ config('seo.yandex_verification') }}">@endif
@foreach ($jsonLd ?? [] as $ld)
<script type="application/ld+json">{!! json_encode($ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!}</script>
@endforeach
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#111827;background:#fff;line-height:1.55}
a{color:#b45309}img{max-width:100%}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
header.top{border-bottom:1px solid #e5e7eb;background:#fff;position:sticky;top:0;z-index:5}
header.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:64px}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:20px;color:#111827;text-decoration:none}
.brand img{display:block}
nav.links{display:flex;gap:18px;align-items:center;flex-wrap:wrap}nav.links a{color:#374151;text-decoration:none;font-size:15px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border-radius:10px;font-weight:600;text-decoration:none;border:1px solid transparent}
.btn-primary{background:#b45309;color:#fff}.btn-primary:hover{background:#92400e}
.btn-ghost{border-color:#d1d5db;color:#111827;background:#fff}
.btn-blue{background:#2563eb;color:#fff}
.hero{padding:64px 0 48px;background:linear-gradient(180deg,#fffbeb,#fff)}
h1{font-size:clamp(28px,4.4vw,46px);line-height:1.15;margin:0 0 16px;letter-spacing:-.02em}
h2{font-size:clamp(22px,3vw,30px);margin:0 0 20px;letter-spacing:-.01em}
h3{font-size:18px;margin:0 0 6px}
.lead{font-size:18px;color:#374151;max-width:680px}
.muted{color:#4b5563}.small{font-size:14px}
section{padding:48px 0}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.card{border:1px solid #e5e7eb;border-radius:14px;padding:20px;background:#fff}
.pill{display:inline-block;border:1px solid #fde68a;background:#fffbeb;color:#92400e;border-radius:999px;padding:6px 14px;margin:4px;font-size:15px}
.price{font-size:28px;font-weight:700;margin:6px 0}
details{border:1px solid #e5e7eb;border-radius:12px;padding:14px 18px;margin-bottom:10px}summary{cursor:pointer;font-weight:600;min-height:28px}
footer{border-top:1px solid #e5e7eb;padding:28px 0;color:#4b5563;font-size:14px}
.menu-cat{margin-top:28px}.menu-sub{margin:18px 0 6px;font-size:16px;color:#92400e}
.item{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px dashed #e5e7eb}
.item .p{white-space:nowrap;font-weight:600}
.facts{display:flex;flex-wrap:wrap;gap:10px 22px;margin:16px 0}
</style>
</head>
<body>
@yield('body')
</body>
</html>
