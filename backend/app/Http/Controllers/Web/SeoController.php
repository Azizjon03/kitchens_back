<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Company;
use App\Models\MenuItem;
use App\Models\Plan;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * #27: qidiruv tizimlari uchun serverda tayyor HTML — platforma bosh sahifasi
 * (uz/ru), restoran menyu sahifasi va sitemap. SPA (panel) noindex.
 */
class SeoController extends Controller
{
    public function landing(string $locale = 'uz'): Response
    {
        $html = Cache::remember("seo:landing:{$locale}:".$this->landingVersion(), now()->addHour(), function () use ($locale) {
            app()->setLocale($locale);

            return view('seo.landing', [
                'locale' => $locale,
                'plans' => Plan::where('is_active', true)->orderBy('price_monthly')->get(),
                'restaurants' => $this->publicCompanies()->take(30),
            ])->render();
        });

        return $this->html($html);
    }

    public function restaurant(string $slug): Response
    {
        $company = Company::where('slug', $slug)->where('is_active', true)->first();
        abort_unless($company && $company->publicPage()['enabled'], 404);

        $html = Cache::remember("seo:r:{$company->id}:".$this->menuVersion($company), now()->addDay(), function () use ($company) {
            app()->setLocale('uz');

            return view('seo.restaurant', [
                'company' => $company,
                'page' => $company->publicPage(),
                'menu' => $this->menuTree($company),
                'telegram' => $this->telegramUsername($company),
            ])->render();
        });

        return $this->html($html);
    }

    public function sitemap(): Response
    {
        $base = config('seo.site_url');
        $urls = [
            ['loc' => "{$base}/", 'lastmod' => null, 'priority' => '1.0'],
            ['loc' => "{$base}/ru", 'lastmod' => null, 'priority' => '0.9'],
        ];
        foreach ($this->publicCompanies() as $c) {
            $urls[] = ['loc' => "{$base}/r/{$c->slug}", 'lastmod' => $c->updated_at?->toDateString(), 'priority' => '0.8'];
        }

        return response()->view('seo.sitemap', ['urls' => $urls])->header('Content-Type', 'application/xml; charset=UTF-8');
    }

    /** @return Collection<int, Company> */
    private function publicCompanies(): Collection
    {
        return Company::where('is_active', true)->orderBy('name')->get()
            ->filter(fn (Company $c) => $c->publicPage()['enabled'])->values();
    }

    /**
     * Kategoriya → sub-menyu → taom. Taom bevosita asosiy kategoriyada bo'lsa ham ko'rsatiladi.
     *
     * @return array<int, array{name: string, items: array<int, MenuItem>, children: array<int, array{name: string, items: array<int, MenuItem>}>}>
     */
    private function menuTree(Company $company): array
    {
        $cats = Category::withoutGlobalScopes()->where('company_id', $company->id)->where('is_active', true)
            ->orderBy('sort_order')->get();
        $items = MenuItem::withoutGlobalScopes()->where('company_id', $company->id)->where('is_available', true)
            ->orderBy('sort_order')->get()->groupBy('category_id');

        $tree = [];
        foreach ($cats->whereNull('parent_id') as $top) {
            $children = [];
            foreach ($cats->where('parent_id', $top->id) as $sub) {
                $subItems = ($items[$sub->id] ?? collect())->all();
                if ($subItems) {
                    $children[] = ['name' => $sub->name_uz, 'items' => $subItems];
                }
            }
            $own = ($items[$top->id] ?? collect())->all();
            if ($own || $children) {
                $tree[] = ['name' => $top->name_uz, 'items' => $own, 'children' => $children];
            }
        }

        return $tree;
    }

    /** Menyu yoki sozlama o'zgarsa — kesh kaliti o'zgaradi, sahifa yangilanadi */
    private function menuVersion(Company $company): string
    {
        $stamp = fn (string $table) => (string) \DB::table($table)->where('company_id', $company->id)->max('updated_at');

        return md5($company->updated_at.'|'.$stamp('categories').'|'.$stamp('menu_items')
            .'|'.\DB::table('menu_items')->where('company_id', $company->id)->count());
    }

    private function landingVersion(): string
    {
        return md5((string) Plan::max('updated_at').'|'.Company::max('updated_at'));
    }

    /** #26 (Telegram bot) merge qilingach bot username'i; undan oldin — yo'q */
    private function telegramUsername(Company $company): ?string
    {
        return method_exists($company, 'telegramBot') ? $company->telegramBot?->username : null;
    }

    private function html(string $html): Response
    {
        return response($html)->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Cache-Control', 'public, max-age=300');
    }
}
