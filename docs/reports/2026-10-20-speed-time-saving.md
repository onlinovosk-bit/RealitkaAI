# Report: speed / time-saving VP (20. 10. 2026)

**RAU route:** GO_REQUIRED BUILD revolis (slová merge / production / secrets / pricing v zadaní).  
**Čo som urobil:** draft PR, **bez merge**, **bez zmeny cien**, **bez zápisu env na PROD**.  
**Ústava v2:** BUILD — founder povedal, že AIRAmax vyhráva rýchlosťou; Phase 1 je EXTEND existujúceho listing generatora.

## OBJECTIVE

Zmeniť value proposition na rýchlosť a úsporu času: (A) roadmap audit, (B) jedna Phase 1 funkcia za flagom, (C) www copy len o LIVE funkciách.

## WHAT CHANGED

| Časť | Súbor |
|---|---|
| Roadmap | `docs/strategy/2026-10-20-speed-time-saving-roadmap.md` |
| Flag | `apps/crm/src/lib/ai/listing-from-photos-flag.ts` — `LISTING_FROM_PHOTOS_V0 === "1"` |
| Adapter | `listing-vision-provider.ts`, `anthropic-listing-vision.ts` |
| Validácia + prompt | `listing-from-photos.ts` |
| API | `POST /api/ai/listing-from-photos` |
| UI | `/inzerat-generator` — fotky len keď je flag ON |
| Copy | `apps/marketing/public/index.html` + layout / LandingPage / demo HTML |

Ceny v3 (25 / 65 / od 74 / od 116) a `palette.css` som nemenil.

## PHASE 1

**Čo:** text inzerátu z parametrov **a fotiek** (Claude vision).  
**Prečo toto:** jediná AIRAmax položka, ktorú vieme dodať komplet na existujúcom stacku. Staging / reel / pôdorys **nie sú feasible** bez nového image/video providera.

**Zapnutie (nie v tomto PR):**

```
LISTING_FROM_PHOTOS_V0=1
ANTHROPIC_API_KEY=<už používaný>
```

Voliteľne `CREDITS_ENFORCEMENT=enforce`. Testy: `LISTING_VISION_PROVIDER=mock`.

Bez flagu route vracia **404**. Bez kľúča (a bez mocku) **503**.

## COPY BEFORE / AFTER (LIVE `/`)

| | Predtým | Teraz |
|---|---|---|
| H1 | Kým iní ešte klikajú, vy už podpisujete. | Inzerát hotový za minúty. Dopyty v CRM samé. |
| Sub | …zavoláte prvý, skôr než konkurencia. | …AI pripraví text z parametrov. Menej písania. |
| Benefity H2 | Viac obchodov, viac náberov, menej klikania | Inzerát za minúty. Dopyty bez prepisovania. |

Netvrdím: staging, declutter, reel, pôdorys, text z fotiek, náhľad pred registráciou. Slovo `pilot` nie je na webe.

## ENV VARS

| Premenná | Účel | Default |
|---|---|---|
| `LISTING_FROM_PHOTOS_V0` | Zapne Phase 1 | unset = OFF |
| `ANTHROPIC_API_KEY` | Vision provider | už v stacku |
| `LISTING_VISION_PROVIDER=mock` | Testy | unset = Anthropic |
| `CREDITS_ENFORCEMENT=enforce` | Ostré strhávanie 1 kreditu | off |

## EVIDENCE / TESTS / CI

Merané v tomto turne:

| Beh | Výsledok |
|---|---|
| CRM vitest (bez `tests/rls/**` a valuation integration — v tomto VM nie je TEST Supabase) | **3591 passed**, 5 skipped, 6 todo |
| Marketing `npx vitest run` | **61/61 passed** |
| `apps/marketing` `npx next build` | zelený, Next 15.5.15 |
| `apps/crm` `npm run build` | zelený; route `/api/ai/listing-from-photos` v zozname |
| `node apps/crm/scripts/check-api-contract.mjs --ci` | **0 nových porušení** (523 = baseline; route má `incrementUsageMetric`) |
| listing-from-photos unit + route + verification | **17/17 passed** |
| CI required `Lint, test, build` na `4e4db514` | SUCCESS (run 39388101855) |
| CI `Zmluva kódu` na `4e4db514` | SUCCESS (run 39388101846) — predchádzajúci FAIL na `91d02da7` opravený `incrementUsageMetric` |
| CI PR #892 head `4e4db514` | 10 successful, 0 failed, 1 skipped (Preview Playwright — `cursor/*`) |

RLS súbory padli lokálne na chýbajúce `TEST_SUPABASE_*` (rovnaké ako pred touto zmenou). CI ich spúšťa po `supabase db reset`.

## RISKS

- Vision stojí viac tokenov ako text-only; sadzba ostáva 1 kredit, kým founder nerozhodne inak.
- URL fotiek ide do Anthropic (oni ich sťahujú) — preto len URL z `properties.images` tenanta.
- www preview pre `cursor/*` môže byť v marketing `vercel.json` vypnutý.

## NEXT ACTION

Founder review draft PR. Merge a `LISTING_FROM_PHOTOS_V0=1` na PROD len na výslovné GO.
