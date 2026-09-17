# Nočná vlna 2.→3. 9. — ingest + brána

**Date:** 2026-09-02  
**Prompt:** `docs/prompts/ruflo-swarm-nocna-vlna-2026-09-02.md`

## Vstupná brána

```
origin/main = bcf7fcb  (#496 onboarding MVP gate)  ✓
```

## Tri vedomé hranice (potvrdené)

| Lane | Hranica |
|---|---|
| **L1** | Ak RLS neumožní INSERT do `agencies` user-scoped klientom a v repe nie je existujúci mechanizmus → **navrhni v PR, nestavaj**. Role: prvý user vo vlastnej agentúre = `owner` (nie globálny count). |
| **L3** | Len audit. Ak Architecture Guardian neexistuje → jedna veta a STOP. Nič nestavať podľa neverifikovaného „2/3 hotové". |
| **L4** | Len inventúra `preview-*.html` podľa rizika. **Nemaže.** Mazanie = founder. |

**Kill order:** L4 → L3 → L2 → L1. **L1 je P0** (`DEFAULT_AGENCY_ID` = Smolko tenant).

## Blocker — L2

Plán sa odvoláva na `task-strazca-zakaznikov.md`.  
**Súbor v Downloads nie je** (`Test-Path` = false; žiadny `*strazca*.md`).

Bez neho L2 **nespúšťam** (Zákon noci bod 6 — nerekonštruovať zadanie z pamäte).

Nájdené, ale **nie** to isté:
- `overnight-brief-guardian-v1.md` — Guardian v1 (obchodný proces / leady), iný produkt
- `w1-follow-up-strazca.json` — n8n workflow

## Stav lanes

| Lane | Stav |
|---|---|
| L1 register own agency | čaká na GO spustenia |
| L2 customer-health | **STOP** — chýba `task-strazca-zakaznikov.md` |
| L3 Architecture Guardian audit | čaká na GO |
| L4 public preview audit | čaká na GO |

## Ďalší krok

1. Founder pošle / potvrdí cestu k `task-strazca-zakaznikov.md`
2. GO: spustiť L1 (+ L3/L4 paralelne); L2 až so súborom
