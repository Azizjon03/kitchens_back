#!/usr/bin/env bash
# ui-lint.sh uchun regressiya testi: bash .claude/skills/ui-review/scripts/tests/ui-lint.test.sh
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
lint="$here/../ui-lint.sh"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
cp "$here/fixtures/bad.tsx.fixture" "$tmp/Bad.tsx"; cp "$here/fixtures/good.tsx.fixture" "$tmp/Good.tsx"
fail=0
expect() { if printf '%s' "$out" | grep -q "$1"; then echo "ok   $2"; else echo "FAIL $2"; fail=1; fi; }
out=$(cd "$here" && bash "$lint" "$tmp/Bad.tsx"); code=$?
[ "$code" -eq 1 ] && echo "ok   bad: chiqish kodi 1" || { echo "FAIL bad: chiqish kodi $code"; fail=1; }
expect '^K1 hard-color (xato)' 'K1 hex rang'
expect '^K2 api-error-detail (xato)' 'K2 data.detail'
expect '^K3 blocking-dialog (xato)' 'K3 confirm()'
expect '^K4 hardcoded-host (xato)' 'K4 localhost'
expect '^K5 manual-format' 'K5 toLocaleString'
expect '^K6 generic-error-only' 'K6 yolg'"'"'iz umumiy xato'
expect '^K7 low-contrast-button (xato)' 'K7 oq matn amber-500 da'
expect '^K8 low-contrast-text (xato)' 'K8 text-amber-600 havola'
out=$(cd "$here" && bash "$lint" "$tmp/Good.tsx"); code=$?
[ "$code" -eq 0 ] && echo "ok   good: chiqish kodi 0" || { echo "FAIL good: chiqish kodi $code"; fail=1; }
expect 'ui-lint: 0 xato, 0 ogohlantirish' 'good: toza'
exit $fail
