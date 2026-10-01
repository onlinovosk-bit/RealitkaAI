# Realvia číselník mapping — PR notes

**Branch:** `fix/realvia-ciselnik-mapping`  
**Prompt:** `docs/prompts/2026-09-04-realvia-ciselnik-mapping.md`  
**Merge:** founder only. **Backfill:** founder only (agent did not run).

Zdroj mapovania: https://dev.realvia.sk/doc/export/index.php#ciselniky  
Dry-run backfillu NEBOL spustený agentom (spúšťa founder).

Očakávaný dopad podľa analýzy foundera zo 4.9.2026:
  typ sa zmení       102 / 132
  transakcia         64 / 132
  bez zmeny          4 / 132
  rooms fallback     16 bytov

Opravené živé chyby: 124 Prenájom→Podnájom, 125 Dražba→Výmena.

## Scope
- Official 20 categories + 5 transactions in `map-taxonomy.ts`
- Chata / Záhradný domček as distinct types; wizard option „Chata a rekreačné”
- Dopyt excluded from `/nehnutelnosti` via `partitionPublicListings.demand`
- Backfill script: `--dry-run` default, `--agency-id` required, `--apply` + stdin yes

## Founder next
1. Merge this PR after CI green  
2. Dry-run: `npx tsx scripts/backfill-realvia-taxonomy.ts --agency-id <smolko-uuid>`  
3. Apply with confirmation  
4. Only then: pairing / `/hladame`
