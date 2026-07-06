# RUFLO SWARM — AKTIVAČNÝ PROMPT (L99, úprimná verzia)

## ⛔ FÁZA 0 — WRITE-PROBE (POVINNÁ, INAK STRÁCAŠ NOC)
Minulé behy vrátili TEXT bez commitov (AP-009). Preto NAJPRV over, že agent vie zapísať:
1. Spusti JEDNÉHO agenta: vytvor vetvu `test/write-probe`, pridaj 1 riadok do
   `docs/audit/write-probe.md`, commitni, pushni na origin.
2. Over z hlavného procesu: `git branch -a | grep write-probe` + `git log --oneline -1`.
3. AK vetva + commit existujú → pokračuj na Fázu 1.
   AK NIE → **ZASTAV. Agent nemá write/git nástroje.** Hlás to a skonči.
   Toto je root cause, ktorý treba opraviť v Ruflo configu (write_file + git tooly
   pre agenta), NIE obísť ďalším promptom.

## ČO STAVIAME (úprimne: súbory, nie systémy)
NEAKTIVUJEME Engineering Genome, Simulation Engine, shared memory, auto-kalibráciu
ani Meta-Orchestrator — to NIE SÚ súbory, sú to systémy na týždne/mesiace kódu.
Prompt ich postaviť nevie; swarm by vrátil text. Sú v roadmape (pamäť: "viac
zákazníkov + čas").

STAVIAME to, čo je reálne staviteľné TERAZ ako kód, z dát ktoré máš (zákazka z UC):
**Vertical Pack Vlna 1** — viď `overnight-master-brief-15-vertical-pack-wave1.md`.

## ORCHESTRÁTOR + VLNY (závislostný graf, NIE paralelné všetko)
```
KROK 1 (sekvenčný, prvý):  Quality/Brand Guardian
KROK 2 (sekvenčný, po 1):  Listing Generator (vstup z UC zákazky)
KROK 3 (paralelný, po 2):  Microsite │ Banner Factory │ Presentation Builder
```
- Krok 1 a 2 NESMÚ bežať naraz (Krok 3 závisí od oboch).
- Krok 3: traja agenti paralelne, KAŽDÝ vlastná vetva (žiadne kolízie súborov).
- Orchestrátor: rozbije → priradí capability → human approval gate → výstup.

## ŽELEZNÉ PRAVIDLÁ (L99 kvalita)
- Done = ARTEFAKT (commit + zelené CI), NIKDY text (AP-009).
- Stavaj z REÁLNEJ zákazky z `properties` (UC), nie z mocku (AP-003).
- Žiadne vymyslené polia/čísla (AP-001). Chýbajúce pole → vynechaj, nevymýšľaj.
- Každá capability: workflow + audit log + human approval pred publish + cost log.
- 1 capability = 1 PR, vlastný Vercel preview, Kontrolór PASS pred merge.
- Žiadny auto-send navonok, žiadny scraping, žiadny stealth (zakázané akcie).

## OBSIDIAN VAULT
Vault `RealitkaAI-Memory` je oddelený repo, zálohuje ho Obsidian Git. Swarm doň
NEzapisuje priamo. Poznatky → `docs/audit/` v kódovom repe.

## TESTOVANIE + PUSH/COMMIT
- Unit testy každej capability na reálnej zákazke. Quality Guardian: FLAG blokuje publish.
- Integračné (ephemeral CI): RLS — capability vidí len vlastnú agentúru.
- `npm run build` + CI zelené. Commit + push len po zelenom CI. Žiadny bypass.

## AK ZLYHÁ
- Write-probe zlyhá → ZASTAV, hlás (Ruflo config problém).
- Capability nemá reálny vstup → preskoč, zaznamenaj, nestavaj na mocku.
- CI červené → nemerguj, oprav príčinu.

## ZHRNUTIE NA KONCI BEHU
Vypíš: ktoré capabilities majú reálny commit + vetvu + zelené CI (artefakt),
ktoré ostali ako text/nedokončené, a prečo. Žiadne "hotovo" bez `git` dôkazu.
