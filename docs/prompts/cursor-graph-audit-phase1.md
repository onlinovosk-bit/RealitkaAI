# CURSOR: Graph Audit — Fáza 1 (read-only + baseline)

**Cieľová cesta:** `docs/prompts/cursor-graph-audit-phase1.md`
**Kategória:** výkonová príprava (nie Core Platform — bez dokázaného
prevádzkového problému). Overnight slot. ŽIADEN refaktor v tejto fáze.

## STOP IMPLEMENTATION — len audit a meranie

Nevykonávaj žiadne zmeny tracked súborov okrem vytvorenia výstupného
reportu `docs/architecture/graph-audit-2026-07.md`.

## Úloha A — Graph Audit kritických workflowov
Prejdi tieto (a ďalšie, ktoré nájdeš podľa vzoru async funkcií s >2
sekvenčnými await na nezávislých dátach):
- apps/crm/src/lib/research-agent/build-dossier.ts
- apps/crm/src/lib/ai/dashboard-insights-cron.ts
- apps/crm/src/lib/ai/lead-triage-batch.ts
- apps/crm/src/lib/db/enterprise-intelligence-store.ts
- apps/crm/src/app/api/cron/* (všetky)
- apps/crm/src/lib/ai/dashboard-insights-gather.ts (referenčný správny vzor)

Pre každý uzol každého workflowu označ:
`SEQUENTIAL-NUTNÉ (dátová závislosť) | SEQUENTIAL-ZBYTOČNÉ (paralelizovateľné)
| PARALLEL (už OK) | CONDITIONAL | SIDE-EFFECT (DB write/email/API —
neparalelizovať bez transakčnej analýzy)`
s dôkazom (cesta:riadok) a odhadom usporeného času.

## Úloha B — Baseline meranie (bez zmien kódu)
Zmeraj a zapíš do reportu p50/p95 trvanie pre: research dossier build,
dashboard insights cron, triage batch (na dev/lokálnych dátach alebo
z existujúcich logov — ak logy trvania neexistujú, napíš `unavailable`
a navrhni najmenší logging krok). Bez baseline žiadny refaktor nemá
merateľný úspech.

## Úloha C — Návrh 2 quick winov
Z nálezov vyber DVA s najlepším pomerom (usporený čas × bezpečnosť):
kandidáti build-dossier Promise.all a dashboard-insights 3 vetvy.
Pre každý: presný diff plán (nie patch), test plán vrátane zlyhania
jednej vetvy, tenant izolácie a — pri AI volaniach — simulovaného 429
s backoff. enterprise-intelligence-store je explicitne MIMO quick winov
(SIDE-EFFECT, vyžaduje transakčnú analýzu).

## Výstup reportu
1. Tabuľka uzlov s klasifikáciou a dôkazmi
2. Baseline čísla (alebo unavailable + logging návrh)
3. Quick win 1+2 plán s testami
4. Čo NEROBIŤ a prečo (side-effect zóny)
5. Odporúčanie pre Fázu 2 s kill kritériom: ak quick winy nezrýchlia
   p95 aspoň o 30 %, spoločný ExecutionGraph modul sa NESTAVIA.

Founder brány: implementácia quick winov (samostatné GO po reporte),
akýkoľvek zásah do SIDE-EFFECT zón, ExecutionGraph modul.
