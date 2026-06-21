# Overnight Report — #231 + tests + docs
**Dátum:** 2026-06-21  
**Vetvy:** feat/capabilities-strip-html-description, test/capabilities-coverage, docs/capabilities  
**Výsledok reťazca:** KOMPLETNÝ (všetky 3 vlny dokončené)

---

## Tabuľka vlny

| Vlna | Úloha | Vetva | Commit | CI (lokálne) | Artefakt |
|------|-------|-------|--------|--------------|----------|
| FÁZA 0 | Write-probe | test/write-probe-night | e235a2c2a | n/a | ✅ `docs/audit/write-probe.md` |
| 1 | PR #231 — listing-generator testy na 13303557 | feat/capabilities-strip-html-description | b2a88e754 | ✅ 18/18 | ✅ PR #231 updated |
| 2 | Edge case test coverage | test/capabilities-coverage | b02d61cfd | ✅ 35/35 | ✅ vetva pushnutá |
| 3 | Docs capabilities | docs/capabilities | 228f7594f | n/a | ✅ 9 md súborov |

---

## FÁZA 0 — write-probe

- Vetva: `test/write-probe-night`
- Súbor: `docs/audit/write-probe.md`
- Commit: `e235a2c2a` — pushed na origin ✅
- Záver: agent má write + git push nástroje — reťazec mohol pokračovať

---

## VLNA 1 — PR #231 HTML sanitizácia

**Čo bolo hotové pred nocou (commit 2791f4929):**
- `stripHtmlToPlainText()` v `apps/crm/src/lib/capabilities/_shared/strip-html.ts`
- Použitá v `realviaRowToUcListing()` — description stripnutý pred mapovaním
- `listing-generator`: `price > 0` podmienka — "Cena 0 EUR" sa nevygeneruje
- `listing-score`: `stripHtmlToPlainText()` na description pred meraním dĺžky
- 16 testov zelených

**Pridané v noci (commit b2a88e754):**
- `listing-generator/__tests__/generate.test.ts` — 2 nové testy:
  - Guardian PASS na REALVIA_SMOLKO_13303557 + body neobsahuje "0 EUR"
  - HTML tagy/entity stripnuté pred draft generáciou → Guardian PASS
- Celkovo: 18/18 zelených

**Brief requirements splnené:**
- ✅ `stripHtmlToPlainText` v `realviaRowToUcListing` — HTML zmizne pred renderom
- ✅ Fixture 13303557 — Guardian PASS (nie FLAG)
- ✅ Skip "Cena 0 EUR" pri `price=0`
- ✅ Popis bez tagov (test overený)

---

## VLNA 2 — Test coverage (stacked na Vlne 1)

**Vetva:** `test/capabilities-coverage`  
**Commit:** `b02d61cfd`

Pridaných 17 edge-case testov (+1 nový strip-html test = 4 celkovo v strip-html):

| Capability | Nové testy | Edge cases |
|---|---|---|
| strip-html | +3 | entity, whitespace collapse, plain text passthrough |
| listing-score | +3 | HTML description → krátka, missing GPS, missing price null |
| banner-factory | +3 | price=0 no "0 EUR", missing location → "" subline, single state |
| presentation-builder | +2 | HTML stripped from slides, price=0 no "Cena 0" |
| property-microsite | +3 | HTML stripped from body, no images, micrositeGuardianCheck |
| export-diagnostics | +3 | empty arrays, all-success, repeated error accumulation |

**Celkový count:** 35/35 zelených

**Poznámka:** Fixture `2772732443` nie je dostupná → edge cases postavené na override spreads z 13303557.
Zodpovedá AP-001 (reálny základ, nie mock ID).

---

## VLNA 3 — Dokumentácia capabilities (stacked na Vlne 2)

**Vetva:** `docs/capabilities`  
**Commit:** `228f7594f`

Vytvorených 9 súborov v `docs/capabilities/`:

| Súbor | Obsah |
|---|---|
| `_overview.md` | Stav tabuľka, HTML fix kontext, test coverage súhrn |
| `quality-guardian.md` | Validačné pravidlá, vstupy/výstupy, príklad 13303557 |
| `listing-generator.md` | Price=0 správanie, HTML pipeline, Guardian závislosť |
| `listing-score.md` | 9 sledovaných polí, HTML length check, 44% score 13303557 |
| `banner-factory.md` | Stavové banery, missing location/price správanie |
| `presentation-builder.md` | Owner/buyer deck štruktúra, slide layout |
| `property-microsite.md` | Human approval gate, micrositeGuardianCheck, publishBlocked |
| `export-diagnostics.md` | Webhook klasifikácia, reason extraction, edge cases |
| `vertical-pack-demo.md` | Demo agregátor, príklad 13303557 |

---

## Kde reťazec zastal

Reťazec **nekončí predčasne** — všetky 3 vlny sú dokončené.

---

## Čo čaká na ranný GO (Andy)

| Akcia | Dôvod čakania |
|---|---|
| Merge PR #231 (`feat/capabilities-strip-html-description`) | Andy ranný review |
| PR pre Vlnu 2 (`test/capabilities-coverage`) | Andy ranný review — stacked na #231 |
| PR pre Vlnu 3 (`docs/capabilities`) | Andy ranný review — stacked na Vlne 2 |
| A3 processed=false cleanup | PROD write — vylúčené z noci |
| Smolko Dopyty CSV import | Čaká na CSV súbor |
| Merge do main | Ranný review (žiadny auto-merge) |

---

## Git dôkaz (AP-009)

```
# FÁZA 0
branch: test/write-probe-night  commit: e235a2c2a  pushed: ✅

# VLNA 1
branch: feat/capabilities-strip-html-description  commit: b2a88e754  pushed: ✅
tests: 18/18 pass (apps/crm)

# VLNA 2
branch: test/capabilities-coverage  commit: b02d61cfd  pushed: ✅
tests: 35/35 pass (apps/crm)

# VLNA 3
branch: docs/capabilities  commit: 228f7594f  pushed: ✅
files: docs/capabilities/ (9 súborov)
```
