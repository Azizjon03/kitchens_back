#!/usr/bin/env bash
# ui-lint.sh — Kitchens.uz frontend'idagi UI standart buzilishlarini topadi (ui-review skill'i).
#
# Foydalanish (repo ildizidan yoki istalgan joydan):
#   ui-lint.sh                  # origin/main dan beri o'zgargan frontend/src/**/*.tsx
#   ui-lint.sh fayl1.tsx ...    # aniq fayllar
#   ui-lint.sh --all            # butun frontend/src
#
# Chiqish kodi: 0 — xato yo'q; 1 — kamida bitta xato; 2 — ishga tushirib bo'lmadi.
# Ogohlantirishlar chiqish kodiga ta'sir qilmaydi — ularni reviewer baholaydi.
#
# Qoidalar:
#   K1 hard-color          (xato)  Tailwind'da qattiq hex rang: bg-[#f59e0b] — palitra klassi ishlatilsin
#   K2 api-error-detail    (xato)  `data?.detail` — backend bunday maydon qaytarmaydi; xabar
#                                  `data.error.message` (ApiResponse) yoki `data.errors` (422) da
#   K3 blocking-dialog     (xato)  alert()/confirm()/prompt() — Telegram WebView va KDS'da bloklaydi
#   K4 hardcoded-host      (xato)  'http://localhost' / IP — API faqat nisbiy `/api/v1` orqali
#   K5 manual-format       (ogohlantirish, lib/format.ts paydo bo'lsa — xato)
#                                  toLocaleString / Intl.* sahifada qo'lda
#   K6 generic-error-only  (ogohlantirish) 'Xatolik yuz berdi' server xabarisiz yolg'iz ishlatilgan
set -uo pipefail

root=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "ui-lint: git repo emas" >&2; exit 2; }
files=()

if [ "${1:-}" = "--all" ]; then
    while IFS= read -r f; do files+=("$f"); done < <(cd "$root" && find frontend/src -name '*.tsx' | sort | sed "s#^#$root/#")
elif [ "$#" -gt 0 ]; then
    for f in "$@"; do
        if [ -f "$f" ]; then files+=("$f"); else echo "ui-lint: $f topilmadi, o'tkazib yuborildi" >&2; fi
    done
    if [ "${#files[@]}" -eq 0 ]; then
        echo "ui-lint: berilgan fayllarning hech biri topilmadi" >&2
        exit 2
    fi
else
    cd "$root" || exit 2
    if ! git rev-parse --verify -q origin/main >/dev/null; then
        echo "ui-lint: origin/main topilmadi — 'git fetch origin main' qiling yoki fayllarni argument bilan bering" >&2
        exit 2
    fi
    while IFS= read -r f; do
        [ -f "$f" ] && files+=("$f")
    done < <(
        {
            git diff --name-only --diff-filter=ACMR origin/main...HEAD
            git diff --name-only --diff-filter=ACMR HEAD
            git ls-files --others --exclude-standard
        } | grep -E '^frontend/src/.*\.tsx$' | sort -u
    )
fi

if [ "${#files[@]}" -eq 0 ]; then
    echo "ui-lint: 0 xato, 0 ogohlantirish (0 fayl)"
    exit 0
fi

# Markaziy formatter paydo bo'lsa, qo'lda formatlash xatoga aylanadi
if [ -f "$root/frontend/src/lib/format.ts" ]; then k5_level=xato; else k5_level=ogohlantirish; fi

# grep_rule <id> <nom> <daraja> <regex> [chiqarib tashlanadigan yo'l regex'i]
grep_rule() {
    local id=$1 name=$2 level=$3 pat=$4 excl=${5:-} f hit
    for f in "${files[@]}"; do
        if [ -n "$excl" ] && printf '%s' "$f" | grep -qE "$excl"; then continue; fi
        grep -nE "$pat" "$f" | while IFS= read -r hit; do
            printf '%s %s (%s)  %s:%s\n' "$id" "$name" "$level" "${f#"$root"/}" \
                "$(printf '%s' "$hit" | sed -E 's/^([0-9]+):[[:space:]]*/\1  /')"
        done
    done
}

out=$(
    grep_rule K1 hard-color xato '(bg|text|border|fill|stroke|ring|from|to|via)-\[#[0-9a-fA-F]{3,8}\]'
    grep_rule K2 api-error-detail xato 'data\??\.detail'
    grep_rule K3 blocking-dialog xato '(^|[^.a-zA-Z_])(window\.)?(alert|confirm|prompt)\('
    grep_rule K4 hardcoded-host xato "['\"\`]https?://(localhost|127\.0\.0\.1|[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)" '/lib/echo\.ts$'
    grep_rule K5 manual-format "$k5_level" 'toLocale(Date|Time)?String|Intl\.(NumberFormat|DateTimeFormat)' '/lib/format\.ts$'
    for f in "${files[@]}"; do
        grep -n "Xatolik yuz berdi" "$f" | grep -vE 'error\??\.message|message \|\||getErrorMessage|errors' | while IFS= read -r hit; do
            printf 'K6 generic-error-only (ogohlantirish)  %s:%s\n' "${f#"$root"/}" \
                "$(printf '%s' "$hit" | sed -E 's/^([0-9]+):[[:space:]]*/\1  /')"
        done
    done
)

[ -n "$out" ] && printf '%s\n' "$out"
errors=$(printf '%s\n' "$out" | grep -c ' (xato)  ' || true)
warns=$(printf '%s\n' "$out" | grep -c ' (ogohlantirish)  ' || true)
echo "ui-lint: $errors xato, $warns ogohlantirish (${#files[@]} fayl)"
[ "$errors" -gt 0 ] && exit 1
exit 0
