# Revolis OS — Tooling & architektúra 2026 (rozhodovací dokument)

**Cieľová cesta:** `docs/architecture/revolis-os-tooling-2026.md`
**Dátum:** 2026-07-22 · **Status:** platné rozhodnutie foundera
**Nahrádza:** ad-hoc diskusie o nástrojoch; NERUŠÍ odložený L99 roadmap
(brána 3 zákazníci) ani klasifikáciu v2.

## Princíp
Revolis nie je CRM s AI, ale AI-native operačný systém pre realitné
kancelárie. Tooling firmy kopíruje ten istý princíp: znalosti (Obsidian),
orchestrácia (n8n), exekúcia (Cursor + modely). Každý nástroj má jasnú
rolu — žiadne prekrývanie zodpovedností.

## Rozhodnutia (ADOPT / DEFER / gate)

| # | Nástroj | Verdikt | Rola | Poznámka / brána |
|---|---|---|---|---|
| 1 | **Obsidian** | ✅ ADOPT (beží) | Jediný zdroj pravdy: rozhodnutia, architektúra, Founder Brain | Git+Dataview+Templater nasadené. Rozšírenia (Smart Connections, Knowledge Graph…) zostávajú za bránou >1 zákazník — nemení sa. |
| 2 | **n8n** | ✅ ADOPT — NOVÉ | Orchestrácia procesov, ktoré nemusí robiť človek | Strategic Bet podľa pravidiel: timebox, kill kritériá, V1 scope v samostatnom briefe (`overnight-brief-n8n-foundation.md`). ZAKÁZANÉ AKCIE platia aj pre n8n — žiadny workflow neodosiela emaily prospektom bez ľudského kliku. |
| 3 | **NotebookLM** | ✅ ADOPT (ľahké) | Výskumník: podcasty, PDF, legislatíva, konkurencia | Zero engineering. Výstupy sa ukladajú do Obsidianu — NotebookLM nie je pamäť, je čítačka. |
| 4 | **VPS + lokálne modely** (Ollama, Whisper, OCR, embeddingy) | ⏸ DEFER | Zníženie nákladov, kontrola dát | Brána: mesačné API náklady > 200 € ALEBO zákaznícka požiadavka on-prem dáta. Pri 1 zákazníkovi je to ops záťaž bez návratnosti. n8n V1 beží na n8n Cloud alebo malom VPS len pre n8n — nie celá AI farma. |
| 5 | **Rolových agenti** (CEO/Sales/CTO/QA…) | ⏸ DEFER (nezmenené) | Dlhodobá konkurenčná výhoda | Už v odloženom L99 roadmape, brána 3 platiaci zákazníci. Dokument neprináša nový dôkaz na skoršie otvorenie. |
| 6 | **Hybridný model-mix** | ✅ ADOPT ako guidance | Cena/výkon | Lacné úlohy (klasifikácia, sumarizácia) → lacný model; architektúra + kód → špičkový model. Zapísané ako orientačná tabuľka nižšie, NIE ako proces s rolami (variant B zostáva zamietnutý auditom). |
| 7 | **Content automatizácia** | ⏸ DEFER čiastočne | Marketing z reálnych skúseností | Manuálne: 1 build-in-public post/týždeň je OK už teraz. Automatizácia cez n8n až vo Vlne 2 n8n (po V1). |

## Orientačná tabuľka výberu modelu (guidance, nie zákon)
- Architektúra, veľké analýzy, produktové rozhodnutia → špičkový reasoning model
- React/Next.js implementácia, refaktoring, testy → špičkový coding model (Cursor)
- Klasifikácia, extrakcia, sumarizácia, preklady → najlacnejší model, ktorý úlohu zvládne
- Rýchle UI prototypy → dizajnový nástroj podľa potreby
Pravidlo: nikdy neplatiť za špičkový model tam, kde lacný dosahuje rovnaký výsledok — a nikdy nešetriť na architektúre a produkčnom kóde.

## Štruktúra projektu — doplnenie (adresáre)
```
docs/
  architecture/     ← rozhodnutia (tento súbor, ADR štýl)
  briefs/overnight/ ← Ruflo/Cursor briefy
  prompts/          ← opakovane použiteľné prompty (status-check…)
  sales/            ← tracker, databázy RK, call skripty
automation/
  n8n/              ← exportované n8n workflowy (JSON, verzované!)
.cursor/rules/      ← 5 mdc pravidiel (hotové)
memory/decisions.md ← denník rozhodnutí (Obsidian sync)
```
Pravidlo: každý n8n workflow sa exportuje ako JSON do `automation/n8n/`
pri každej zmene — workflow bez verzie v gite neexistuje.

## Čo tento dokument explicitne NEROBÍ
Neotvára odložený L99 roadmap · nemení dvojotázkový filter ani klasifikáciu
· nezavádza rolovú orchestráciu modelov (audit verdikt platí) · neschvaľuje
žiadnu automatizáciu odosielania správ prospektom.
