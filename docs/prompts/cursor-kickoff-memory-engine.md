# CURSOR KICKOFF — Revolis Memory Engine V1 (overnight)

**Cieľová cesta:** `docs/prompts/cursor-kickoff-memory-engine.md`

Vlož do Cursoru nasledovný text (medzi čiarami), spolu s priloženými súbormi
`overnight-brief-memory-engine-v1.md` a `memory-engine-sources-2026-07.md`:

---

Konaj ako koordinovaný tím principal architektov, staff inžinierov, QA,
DevOps, security, GDPR, dátových a produktových špecialistov.

Vstupy:
1. `docs/briefs/overnight/overnight-brief-memory-engine-v1.md` — ZÁVÄZNÝ
   scope fence pre túto noc (ulož priložený súbor na túto cestu).
2. `docs/architecture/inputs/memory-engine-sources-2026-07.md` — tri
   strategické texty (ulož priložený súbor na túto cestu). Obsahujú
   opakovania a prekrývajúce sa pomenovania — najprv ich normalizuj do
   kanonického modelu (`docs/architecture/memory-engine-canonical-model.md`,
   max 3 strany). Opakovaný text nie je ďalšia požiadavka ani vyššia priorita.

CIEĽ: implementuj V1 vertikálny rez presne podľa scope fence — register
(brain/registry/), Decision Memory (brain/decisions/, min. 15 reálnych
historických rozhodnutí zo skutočných zdrojov v repe), idempotentný ingest,
audit CLI s deltou (pnpm brain:audit), learning summary generátor
(pnpm brain:weekly), testy s fixtures, runbook, traceability matica.

POVINNÝ REPO-FIRST POSTUP: prečítaj .cursor/rules/*, docs/architecture/*,
memory/decisions.md, automation/n8n/*; skontroluj git status a nepoškoď
cudzie zmeny; hľadaj duplicity podľa správania; pre každú požiadavku vyber
REUSE | EXTEND | REPLACE | MIGRATE | NEW | DEPRECATE | REJECT.

TVRDÉ PRAVIDLÁ: žiadna nová DB ani graph store (repo súbory sú kanonické
úložisko); žiadny nový cron/scheduler (V1 = manuálne + CI report artifact,
nesmie zlyhať build); žiadne PII, zákaznícke dáta ani tajomstvá v Gite;
chýbajúci zdroj = stav `unavailable`, nie demo dáta; nevymýšľaj metriky;
Guardian/Librarian/atď. sú schopnosti, nie samostatné agentné shelly;
jeden kanonický vlastník každej schopnosti; rešpektuj ZAKÁZANÉ AKCIE
a všetky .cursor/rules.

MIMO SCOPE (zapíš do backlogu s bránami, neimplementuj): Observation agenti,
Recommendation dashboard UI, zákaznícke/marketingové metriky ingest,
Decision→Outcome loop v produkte, nočný scheduler.

NÁKLADY ČAKANIA: vyčísli v reporte baseline z 22.07.2026 — koľko minút
stála ručná rekonštrukcia stavu (status check, Gmail forenzika, tracker
sync) a extrapoluj na mesiac pri 2× zákazníkoch.

OTÁZKY: max 5, len skutočne blokujúce, každá s odporúčanou odpoveďou.
Nezastavuj sa pre pomenovania, kozmetiku ani reverzibilné rozhodnutia.

VERIFIKÁCIA: unit + integračné + regresné testy, lint, TypeScript, build.
Jeden branch + PR. STOP po zelenej CI — merge je founder brána.

REPORT RÁNO: ČO SA ZMENILO · TRACEABILITY MATICA (100 % V1) · DÔKAZ
(CI run, reálny výstup brain:audit, ukážka delta) · ODCHÝLKY · ČO ČAKÁ
NA FOUNDERA · commit ID. Nehlás dokončenie bez otestovania a commitu.

---
