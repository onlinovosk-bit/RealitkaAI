# Setup karta — Night Operations (3 uzly)

**Dátum:** 2026-08-03 · **Timezone:** Europe/Bratislava (CEST = UTC+2 v lete)  
**Repo:** `RealitkaAI` · **Kde:** Cursor → Automations → New  
**SSOT:** `docs/architecture/2026-08-03-night-operations.md` · Center: `docs/architecture/2026-08-03-night-operations-center.md`  
**Paste-ready inštrukcie:** `a1-architecture-guardian.md` · `a2-strazca-vetiev.md` · `a3-ranny-brief.md`

---

## Cron: CEST ↔ UTC

Cursor Automations cron je typicky **UTC**. Okno behu: **02:00–03:00 CEST** = **00:00–01:00 UTC**.

| Uzol | Názov | CEST (UTC+2) | UTC (ak cron = UTC) | Poradie |
|---|---|---|---|---|
| **A1** | Architecture Guardian | **02:00** | **00:00** | 1. — audit `main` |
| **A2** | Strážca vetiev | **02:20** | **00:20** | 2. — vetvy / PR |
| **A3** | Ranný brief | **02:40** | **00:40** | 3. — musí byť posledný (číta A1+A2) |

Ak UI berie lokálny čas CEST, nastav stĺpec CEST. Ak berie UTC, stĺpec UTC. **A3 vždy posledný.**

---

## Hard constraints (všetky tri)

- Fáza 1 — **iba čítanie** (výnimka A1: append-only `docs/audit/guardian-history.jsonl` na vetve `reports/guardian-history`, nikdy do `main`)
- **Zákaz:** portal scrape · auto-deploy · prod DELETE · `CREDITS_ENFORCEMENT` on · commit/push/merge do `main`
- Branch v UI: `main` len ako **zdroj čítania**
- Report → Run History, nie commit do `main`
- MCP Supabase (ak vôbec): **nikdy `service_role`** — len read-only rola
- Každý report končí vetou: **`Verdikt (konal / vedel / zbytočné): ____`**

---

## Postup (≈20 min)

1. Otvor Cursor → Automations → New (repo `RealitkaAI`).
2. Vytvor **A1** — skopíruj celý blok z `docs/automations/a1-architecture-guardian.md`. Cron podľa tabuľky.
3. Vytvor **A2** — `docs/automations/a2-strazca-vetiev.md`.
4. Vytvor **A3** — `docs/automations/a3-ranny-brief.md` (posledný).
5. Po prvom behu každej: over `git status` na `main` čistý · štruktúra reportu · žiadne vymyslené nálezy · rozpočet · DB read-only.
6. Verdikt founder zapisuje do `docs/audit/nodes-value.jsonl` (append-only).

---

## Kill / review

| Dátum | Čo |
|---|---|
| **2026-08-08** (piatok) | Kill: čítal som reporty 5 rán? Ak nie → vypnúť A1–A3 |
| **2026-09-08** | Review ADR-001…005 + metriky 30 dní |
| **2026-09-02** | Rozhodnutie o 4. uzle (Profit Leak / brány) |
| **2026-11-02** | 90-dňové vyhodnotenie · orchestrátor? |

---

## Čo founder musí kliknúť ručne

1. Automations → New (3×) · vložiť inštrukcie · nastaviť cron · Save / Enable.
2. Po prvých behoch: jednoslovný verdikt do `nodes-value.jsonl`.
3. **Neaktívne automaticky** — agent len pripravil paste materiály + PR; Active = tvoj klik.
