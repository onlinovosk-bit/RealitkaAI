# Spoločný inžiniersky kontrakt pre agentov (Cursor · Claude Code · Grok)

> Stav: v1.0 · zadanie foundera „REVOLIS CROSS-AGENT ENGINEERING SYSTEM v1.0" · 2026-10-21.
> Tento súbor je jediný zdroj pravidiel pre všetkých agentov. `AGENTS.md` a `.cursor/rules/revolis-cross-agent.mdc`
> sú tenké adaptéry, ktoré naň len odkazujú. Pri rozpore platí `CLAUDE.md` a Decision Memory (`memory/decisions.md`).

## 1. Cieľ a miera úspechu

Skrátiť čas a cenu overeného výsledku a znížiť regresie, bezpečnostné diery a nepravdivé „hotovo".
Rátajú sa **overené úlohy**, nie počet promptov, agentov alebo súborov. Zlepšenie sa netvrdí, kým ho nepotvrdí meranie (§8).

## 2. Autorita (najmenšie oprávnenia)

Bez samostatného GO foundera sa nesmie: **merge**, **LIVE nasadenie**, **migrácia alebo zápis do PROD DB**,
zmena tajomstiev a oprávnení, deštruktívna operácia, **nový opakovaný náklad** alebo platená infraštruktúra,
externá správa s materiálnym dopadom. Zelené CI nestačí ani na merge, ani na nasadenie. Povolené v schválenej úlohe:
čítanie repozitára, zmeny na vyhradenej vetve, relevantné testy, dokumentácia a Skills, draft PR.
Tajomstvá sa nikdy nezapisujú do promptov, logov, pamäte, commitov ani BUS správ.

## 3. Role

| Rola | Robí | Nesmie |
|---|---|---|
| Architekt / plánovač | rozsah, kritériá, závislosti, riziká (`revolis-review-plan`) | kódovať mimo schváleného plánu |
| Implementátor | najmenšia zmena v rozsahu, relevantné testy | prepísať cudzie neuložené zmeny |
| Nezávislý recenzent | číta skutočný diff a dôkazy (`kontrolor`) | prijať sebahodnotenie implementátora ako dôkaz |
| Verifikátor vydania | nezávisle overí pripravenosť a stav po nasadení | udeliť si sám povolenie na PROD |

Agent hlási len to, čo naozaj spustil. Nárok na nástroj, model alebo agenta, ktorý nebol dostupný, je nepravdivý výrok.

## 4. Stavy dôkazu

`PASS` · `FAIL` · `BLOCKED` (nedalo sa spustiť) · `NOT_VERIFIED` (nespustené alebo bez dôkazu).
Preskočený test nie je PASS. „Hotovo" smie padnúť iba pri PASS všetkých povinných kontrol aj akceptačných kritérií.
Nástroj: `node scripts/ci/revolis-verify.mjs completion … --run`. Správa patrí do popisu PR.

## 5. Audit existujúceho (zmerané v repozitári 2026-10-21, `origin/main` 63cc804d)

| Oblasť | Čo existuje | Stav | Dôkaz |
|---|---|---|---|
| Audit výrokov a plánov | Skill `kontrolor` (10 bodov + meta režimy, PASS/FLAG/RETURN/STOP) | používaný | `.claude/skills/kontrolor/SKILL.md` |
| Merge a uzavretie bloku | Skills `merge-gate`, `wall-close`, `prod-migration`, `task-loop`, `rau` | používané | `.claude/skills/` |
| Rýchle lokálne brány | `scripts/ci/prepush-gate.sh` (hlási PASS/FAIL/NEOVERENÉ), `classify-diff.sh` | CODE-RUNNING (CI volá `classify-diff`) | `.github/workflows/saas-grade-pipeline.yml:87,208` |
| Brány vydania | CI job-y `ci`, `control-contract`, `bus`; Playwright smoke na preview | CODE-RUNNING v CI | `saas-grade-pipeline.yml`, `preview-playwright-smoke.yml` |
| Ústavy | `engineering-constitution.md` (Builder/Judge), `revolis-constitution-v2.md` | v platnosti | `docs/architecture/` |
| Pravidlá pre Cursor | 12 pravidiel `.cursor/rules/*.mdc`, `.cursor/mcp.json` | v platnosti | `.cursor/` |
| Pravidlá pre Claude Code | `CLAUDE.md`, hooky v `.claude/settings.json` | CODE-RUNNING | `.claude/hooks/` |
| Pravidlá pre Grok | **nič** (neexistuje `AGENTS.md` ani adaptér) | **medzera** | repo root |
| Inter-Agent BUS transport | `packages/bus-core`, CI job `bus` | IMPLEMENTED (L0+L1 kód), **NOT DEPLOYED** | ADR 2026-09-18 |
| BUS identita a runner v2 | ADR-y | **SPECIFICATION ONLY** | ADR 2026-09-21 (obe) |
| Control Contract | `packages/control-contract`, CI job | IMPLEMENTED AND TESTED v CI | `saas-grade-pipeline.yml:378` |
| RAU | `docs/rau/` (registry, routing-rules) | špecifikácia + registre | `docs/rau/README.md` |
| Identita nasadenia | `/api/healthz` vracia statické `{ok:true}` bez SHA či ID nasadenia | **medzera** | `apps/crm/src/app/api/healthz/route.ts` |
| Dáta o cene modelov | počítadlá `ai_openai_tokens` v kóde; agregát nákladov na úlohu | **UNKNOWN** (PROD nečítaný) | grep v `apps/crm/src` |

**Duplicity, ktorým som sa vyhol:** žiadny nový MCP server (GitHub, BUS, súborový systém aj CI už existujú),
žiadny paralelný log rozhodnutí (ostáva `memory/decisions.md`), žiadny druhý pred-push skript.

## 6. Potvrdené medzery a ich riešenie

| Medzera | Riešenie v tomto balíku | Priorita |
|---|---|---|
| Nič neprepája diff → kontroly → akceptačné kritériá → štyri stavy | `scripts/ci/revolis-verify.mjs completion` + Skill `revolis-verify-completion` | P0 |
| Plán sa pred kódovaním nekontroluje strojovo | `revolis-verify.mjs plan-lint` + Skill `revolis-review-plan` | P0 |
| Výber testov podľa zmenených súborov a kritických tokov | súčasť `completion` (vitest related + toky billing/inbound/tenant/auth) | P0 |
| Grok a ostatné nástroje nemajú pokyny | `AGENTS.md` (adaptér), Cursor pravidlo | P0 |
| Overenie vydania: identita nasadenia, zdravie, smoke | **neimplementované**, návrh nižšie | P1 |
| Smerovanie modelov podľa ceny | **neimplementované**, najprv meranie | P1 |

## 7. P1 — odporúčaný ďalší krok (nič z toho sa nestalo)

**Overenie vydania.** `/api/healthz` by mal vracať `VERCEL_GIT_COMMIT_SHA`, aby verifikátor vedel porovnať nasadený
commit s očakávaným. Je to zmena verejného endpointu, preto je to samostatná úloha s vlastným GO. Kritériá: odpoveď
obsahuje SHA; test zamyká tvar; verifikátor odmietne „nasadené", ak SHA nesedí; rollback = `request_rollback` na predošlý
deployment. Nasadenie do PROD ostáva rozhodnutím foundera.

**Cena modelov.** Najprv zmerať, čo existuje: koľko tokenov a v akých modeloch za týždeň, koľko overených úloh. Router
sa nestaví, kým tieto dve čísla neexistujú. Pravidlá smerovania v `CLAUDE.md` (Haiku/Sonnet) sú zatiaľ jediný mechanizmus.

## 8. Základná línia a meranie (ešte nezmerané)

Medián času do overeného dokončenia · podiel prvého prijatia · opakované zlyhania · cena na úspešnú úlohu · počet
nepravdivých „hotovo". Východiskové číslo pre cyklus CI je v `docs/reports/2026-09-26-baseline-benchmark.md`
(27 % červených behov, 586 s). Ostatné metriky dnes nemajú zber. Nákladové ani časové zlepšenie sa preto **netvrdí**.
