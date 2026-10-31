---
name: ui-review
description: Use after any change under Kitchens.uz frontend/src/pages or frontend/src/components, before committing. Runs ui-lint, then ui-ux-reviewer (score /10) and kitchens-qa-expert (PASS/FAIL + veto); accepts only at score >= 8.0 with QA PASS, otherwise writes requirements to docs/ui-reviews/ and loops (max 3 rounds). Triggers - "tayyor", "commit qil" with page changes, "UI tekshir", "review qil", "ui ux".
---

# UI review sikli (Kitchens.uz)

## Qabul qoidasi

**UI bali ≥ 8.0 va QA PASS (veto yo'q).** Boshqa hech qanday holatda qabul
yo'q — "deyarli 8", "faqat estetika qoldi", "foydalanuvchi shoshyapti" ham.
Rubrika: `.claude/skills/ui-review/rubric.md`.

## Jarayon

### 1. Qamrov

```bash
git fetch -q origin main
{ git diff --name-only origin/main...HEAD; git diff --name-only HEAD; git ls-files --others --exclude-standard; } \
  | grep -E '^frontend/src/(pages|components)/.*\.tsx$' | sort -u
```

- `pages/**` — baholanadigan sahifalar.
- Faqat `components/**` (`Layout.tsx`) o'zgargan bo'lsa — uni ishlatadigan
  sahifalardan rollar bo'yicha eng ko'p ishlatiladigan 3 tasi.
- Foydalanuvchi aniq sahifalarni aytsa — o'shalar.
- URL va rol — `kitchens-qa-expert.md` §4 (`frontend/src/App.tsx` dan). Taxmin qilinmaydi.

### 2. Lint

```bash
bash .claude/skills/ui-review/scripts/ui-lint.sh <qamrovdagi fayllar>
```

Natijani to'liq saqlang — reviewer promptiga beriladi.

### 3. Tekshiruv

- `ui-ux-reviewer` — prompt: sahifalar (fayl + URL + rol), lint natijasi,
  raund raqami, review fayl yo'li (`docs/ui-reviews/<sahifa>.md`), oldingi
  raund talablari.
- `kitchens-qa-expert` — prompt boshida **"UI sikli"**; o'zgargan fayllar, URL'lar.

**Brauzer bitta** (Playwright MCP umumiy): ikki agent bir vaqtda brauzer
ishlatsa bir-birining sahifasini almashtirib yuboradi. Shuning uchun:
QA'ning 1–2-fazasi (PHPUnit, API skripti) reviewer bilan **parallel**,
QA'ning brauzer fazasi — reviewer tugagach. Bir nechta sahifa bo'lsa —
bitta reviewer ularni ketma-ket baholaydi (har sahifaga alohida fayl).

Agent turi sessiyada ro'yxatda bo'lmasa (yangi qo'shilgan fayl) —
`general-purpose` agentga "`.claude/agents/<nom>.md` ni o'qib, unga to'liq amal qil" deb bering.

### 4. Qaror

| UI | QA | Natija |
| --- | --- | --- |
| ≥ 8.0 | PASS, veto yo'q | **QABUL** → commit |
| ≥ 8.0 | FAIL yoki veto | **RAD** (QA sababi bilan) |
| < 8.0 | istalgan | **RAD** |
| tekshirilmadi (≤ 7.5 cheklov) | istalgan | **QAROR FOYDALANUVCHIDA** — sabab va fayl bilan to'xtang |

Bir nechta sahifa — **har biri** alohida ≥ 8.0 (o'rtacha hisoblanmaydi).

Review fayliga raund sarlavhasidan keyin:
`**Qaror: QABUL | RAD** — UI <X.X>, QA <PASS|FAIL> <veto bo'lsa toifa>`.
QA buglarini o'sha raund "Talablar" ro'yxatiga **[QA]** belgisi bilan qo'shing.

### 5. Rad bo'lsa

1. Talablarni tartib bilan bajaring (`[QA]` va "jiddiy" birinchi). Rozi
   bo'lmasangiz — review fayliga "E'tiroz: <sabab>", keyingi raundda reviewer ko'radi.
2. Kerakli skill'larni qayta o'qing.
3. 2-qadamdan qayta, raund + 1.

### 6. Chegara — 3 raund

3-raunddan keyin ham qabul bo'lmasa — **to'xtang**: review fayli, har raund
bali, qolgan talablar. Qaror foydalanuvchida.

## Foydalanuvchiga hisobot

```
UI review — <sahifa>: QABUL | RAD | QAROR SIZDA
Raundlar: 1) 6.4 RAD  2) 7.6 RAD  3) 8.3 QABUL
QA: PASS (veto yo'q)
Fayl: docs/ui-reviews/<nom>.md
```

Review fayllari ish bilan birga commit qilinadi.

## Qizil bayroqlar

| Fikr | Haqiqat |
| --- | --- |
| "7.9 — yaxlitlasak 8" | Formula bir xonagacha; 7.9 < 8.0 → RAD |
| "QA'ni keyin chaqiraman" | Qaror ikkalasisiz chiqmaydi |
| "Docker o'chiq, kod bo'yicha 9 — qabul" | Vizual tekshirilmagan → ≤ 7.5 → qaror foydalanuvchida |
| "Reviewer xato qilyapti, o'tkazib yuboraman" | E'tirozni faylga yozing |
| "Ikki agent brauzerni parallel ishlatsin, tezroq" | Bitta Playwright brauzer — natijalar aralashadi |
