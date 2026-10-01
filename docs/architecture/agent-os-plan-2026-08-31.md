---
id: architecture.agent-os-plan-202608
title: Agent OS — orchestrátori, tímy, vault
type: plan
status: draft
owner: founder
created_at: 2026-08-31
review_by: 2026-10-01
confidentiality: internal
canonical: false
sources:
  - .ai/bus/AGENT_PROTOCOL.md
  - .claude/skills/task-loop/SKILL.md
  - .claude/skills/kontrolor/SKILL.md
  - brain/ENGINE.md
  - docs/AUTOMERGE-POLICY.md
depends_on: []
supersedes: []
---

# Agent OS — orchestrátori, tímy, vault

Plán štrukturálnej práce nad swarmom. Nočná vlna V5 je v
`docs/prompts/ruflo-swarm-vlna5-2026-09-01.md` a tento dokument ju nenahrádza —
rieši vrstvu **nad** lanami, ktorá sa dnes drží na konvencii a nie na kontrakte.

---

## 1. Diagnóza — čo dnes reálne bolí

Nie je to nedostatok agentov. Systém funguje: merge robí výhradne founder (overené v git logu
za posledný týždeň, každý merge commit je `onlinovosk-bit`), lanes pushujú vetvy, reporty
vznikajú. Bolia štyri konkrétne veci a všetky majú dôkaz.

**Priepustnosť review je úzke hrdlo, nie výroba.** `main` sa nehol od 28. 8. 10:27, kým agenti
každú noc pridávajú ďalšiu vetvu. Za ten čas sa nakopili tri kritické bezpečnostné fixy —
privilege escalation, owner takeover u referenčného zákazníka a cross-tenant PII.
Ich hodnota je nula, kým sú na vetve. Systém vyrába rýchlejšie, než founder stíha rozhodovať,
a nemá mechanizmus, ktorý by mu rozhodovanie zľahčil.

**Stav vlny nie je nikde strojovo čitateľný.** Ranný report dnes zlyhal na tom, že nedokázal
vypísať otvorené PR — volanie GitHub API čakalo na schválenie a v neobsluhovanej cloud session
ho nemal kto schváliť. Pritom orchestrátor v noci ten stav pozná. Chýba len súbor.

**Zdieľaný zápis plodí konflikty.** Dve z troch čakajúcich vetiev editujú
`memory/session-summary.md`, hoci s ním ich vecná zmena nesúvisí. Pri merge druhej vznikne
konflikt zadarmo. Rieši to V5-B.

**Governance ukazuje na neexistujúce veci.** `CLAUDE.md` direktíva 5 prikazuje spustiť skill
`gdpr-advisor` — v `.claude/skills/` sú len `kontrolor`, `task-loop`, `strategic-analysis`.
Direktíva 4 posiela agenta do `master-data-sourcing-map.md`, ktorý obsahuje nepravdivé
tvrdenie o katastri. Obe rieši V5 (lanes F a A), ale vzor je ten istý: **pravidlá sa píšu
rýchlejšie, než sa im stavajú opory.**

---

## 2. Orchestrátori

Orchestrátor dnes robí jednu vec — na konci vlny napíše `docs/reports/YYYY-MM-DD-nocna-vlna-report.md`.
Robí ju dobre; report z 26. 8. má poradie review, čo lanes spravili, testy, riziká a STOP.
Problém je, že tá práca je jednorazová a nikto ju ďalej nečíta strojovo.

### O1 — kontrakt stavu vlny (najvyššia priorita, malý diff)

Orchestrátor na konci vlny zapíše `.ai/bus/state/wave-YYYY-MM-DD.json`:

```json
{
  "wave": "V5",
  "date": "2026-09-01",
  "base_sha": "a66908a",
  "lanes": [
    {
      "id": "V5-D",
      "branch": "docs/v5-d-critical-pr-merge-dag",
      "pr": 493,
      "status": "open",
      "kind": "docs",
      "tests": "n/a",
      "tier": 2,
      "review_order": 1,
      "blocked_reason": null,
      "founder_action": "prečítať poradie merge pred prvým merge"
    }
  ],
  "pending_critical": ["cursor/critical-bug-management-4013"],
  "notes": "…"
}
```

Prečo to stojí za to: **ranný report prestane hádať.** Namiesto volania GitHub API, ktoré
v neobsluhovanej session zlyhá na schválení, prečíta súbor z repa. Rovnaký súbor vie čítať
`task-loop` Krok 0 a `kontrolor` bod 10 (artefakt, nie text). Jeden zápis, traja konzumenti.

Schéma patrí do `.ai/bus/state/wave.schema.md` vedľa existujúceho `message.schema.md`.

### O2 — šablóna nočného reportu

Report z 26. 8. definuje formát de facto: brána (čo je na `main`), tabuľka poradia review,
čo lanes spravili, tabuľka testov s príkazmi a výsledkom, riziká, STOP. Vytiahnuť to do
`docs/reports/_template-nocna-vlna.md`, aby sa štruktúra neodvodzovala odznova každú noc
a aby sa nedalo „zabudnúť" na sekciu rizík.

### O3 — kontrolór ako povinná brána orchestrátora

Dnes `kontrolor` existuje ako skill, ale nič nevynucuje jeho spustenie. Orchestrátor má pred
zápisom „done" k lane prejsť aspoň body 1, 2, 6 a 10 — teda či je každé tvrdenie označené
ako fakt/predpoklad/neznáme, či má dôkaz, či sa nezobrazuje vymyslené číslo, a či existuje
artefakt (commit, vetva, zelené CI), nie len text. Výsledok patrí do `wave-*.json` ako
`verified_by: kontrolor` na každej lane.

### O4 — čo orchestrátor robiť NEMÁ

Nemá mergovať (to platí a drží). Nemá zakladať novú scope mimo briefu. A nemá spúšťať ďalšiu
vlnu — `task-loop` 7.1 hovorí, že vlna N+1 nikdy nezačína pred merge vlny N, a dnes je presne
toto porušené v praxi: agenti pridávali vetvy tri noci po sebe, kým `main` stál.
**Návrh pravidla:** ak `pending_critical` v poslednom `wave-*.json` nie je prázdny, ďalšia
vlna smie obsahovať len docs/governance lanes s prázdnym prienikom ciest — presne tak,
ako je postavená V5. Kódové lanes čakajú.

---

## 3. Tímy agentov

Dnes je „tím" jeden agent typu *Cursor Agent* s prefixom vetvy `cursor/<name>-db1f`, ktorému
sa v prompte povie, čo má robiť. Roly nie sú nikde definované, takže sa dodržiavajú len
dovtedy, kým si ich prompt pamätá.

### T1 — roly ako súbory, nie ako odstavce v prompte

Založiť `.claude/agents/` s piatimi rolami. Každá dostane vlastný súbor s popisom a hlavne
s **obmedzením nástrojov**, lebo to je jediné, čo rolu naozaj vynúti:

| Rola | Smie | Nesmie |
|---|---|---|
| `builder` | písať kód a testy na vetve, push vetvy, otvoriť PR | merge, PROD, secrets, `.github/**`, migrácie aplikovať |
| `zistovac` | čítať, hľadať, WebSearch, písať do `docs/reports/` | akýkoľvek zápis do `apps/`, `packages/`, `supabase/` |
| `kontrolor` | čítať všetko, písať verdikt do PR/reportu | meniť kód, ktorý overuje |
| `orchestrator` | čítať vetvy a PR, písať report + `wave-*.json` | merge, meniť lane vetvy |
| `gdpr-advisor` | čítať, písať do `docs/legal/` a verdikt do PR | čokoľvek iné |

Rozdelenie `builder` / `kontrolor` je podstatné: kto kód napísal, nemá si ho odsúhlasiť.
Dnes to tak nie je a spolieha sa to na to, že agent bude na seba prísny.

### T2 — registry vlastníctva ciest

`.ai/bus/OWNERSHIP.md`: tabuľka adresár → rola → poznámka. Vďaka nej sa dôkaz neprekrytia
vo swarm pláne (task-loop 7.2) prestane písať ručne pre každú vlnu a začne sa odvodzovať.
Zároveň to dá jednoznačnú odpoveď na otázku „smie táto lane siahnuť sem?", ktorá sa dnes
rieši vetou v prompte.

Zapísať tam aj tri veci, ktoré nesmie meniť **nikto okrem foundera**: `.github/**`,
`apps/crm/supabase/migrations/**` a čokoľvek s `*smolko*` v ceste — to už denylist
v `docs/AUTOMERGE-POLICY.md` obsahuje, len to nie je viditeľné z pohľadu agenta.

### T3 — merge guard v CI (BACKLOG, nie teraz)

Pravidlo „agent nikdy nemerguje" dnes drží, ale nič ho nevymáha — drží preto, že agenti
nemajú credentials. Workflow, ktorý zlyhá, keď autor merge commitu do `main` nie je
`onlinovosk-bit`, by z konvencie urobil invariant. Je to lacné, ale nič nehorí a `.github/**`
je Tier 3, takže to aj tak vyžaduje founder merge. **Zaradiť ako BACKLOG**, nie do V5.

### T4 — jeden zápis, jeden vlastník

Pravidlo, ktoré vyplýva z konfliktu na `memory/session-summary.md` a má platiť všeobecne:
**žiadny súbor nemá dvoch pisateľov v jednej vlne.** Ak dva lanes potrebujú zapísať to isté,
buď sa zlúčia do jednej lane, alebo sa súbor rozdelí. V5-B to rieši pre `memory/`,
T2 to zovšeobecňuje na celý repozitár.

---

## 4. Obsidian Vault

### 4.1 Čestný stav

`.obsidian/app.json` obsahuje presne toto: `vaultName: RealitkaAI`,
`activatedBy: L99-Ruflo-Orchestrator`, `activatedAt: 2026-06-14`, poznámka
„Vault bootstrap for project documentation sync." Nič viac. Vault bol bootstrapnutý pred
dva a pol mesiacom a odvtedy sa doň neinvestovalo.

Čísla, ktoré k tomu patria: repozitár má **463 markdown súborov**, z toho **33 má frontmatter
s `id:`** (7 %) a **dva** sú označené `canonical: true` — `brain/ENGINE.md` a
`docs/architecture/engineering-constitution.md`. Konvencia teda existuje, ale je aplikovaná
na sedmine dokumentov.

Podľa PRIME DIRECTIVE v `CLAUDE.md` má vault buď zvýšiť pravdepodobnosť získania alebo
udržania platiaceho klienta, alebo je to zlá investícia. Poznámkovanie tú latku nespĺňa.
**Vault teda dostane jednu konkrétnu úlohu, alebo sa `.obsidian/` zmaže.** Tretia možnosť —
nechať ho ležať ako doteraz — je najhoršia, lebo predstiera, že systém existuje.

### 4.2 Úloha, ktorú si vault zaslúži: detekcia zhnitej pravdy

`brain/ENGINE.md` sám definuje svoj účel: „nájsť relevantnú pravdu bez čítania celého
repozitára" a „zabrániť opakovaniu chyby". To je presne to, čo dnes zlyháva, a máme na to
dôkaz priamo v repe:

- `brain/ENGINE.md` má `review_by: 2026-08-19` — **12 dní po termíne**.
- `docs/architecture/seller-trust-event-reliability-contract.md` má `review_by: 2026-08-21` —
  **10 dní po termíne**.
- `master-data-sourcing-map.md` obsahoval nepravdivé tvrdenie o katastri, ktoré sa dostalo
  do podkladu pre rozhodnutie. Nikto si to nevšimol, lebo dokument nemal `review_by` vôbec.
- Existuje vetva `chore/brain-registry-drift-2026-07-27` — drift registra je známy problém.

Vault teda nie je na písanie poznámok. **Je na to, aby bolo vidieť, ktorý kanonický dokument
klame alebo je po expirácii.** To je hodnota, ktorá sa dá zmerať, a je to jediná verzia
vaultu, ktorú viem obhájiť voči PRIME DIRECTIVE — pretože rozhodnutie postavené na zhnitom
dokumente stojí peniaze, a jedno také sa práve stalo.

### 4.3 Rozsah — čo do vaultu patrí a čo nie

| Vrstva | Do vaultu | Prečo |
|---|---|---|
| `brain/**` | áno | governance, kanonické |
| `docs/architecture/**` | áno | rozhodnutia, kontrakty |
| `memory/decisions.md`, `open-tasks.md` | áno | živý stav |
| `.ai/bus/decisions/**` | áno | prijaté rozhodnutia agentov |
| `docs/briefs/**` | áno | zadania, majú životný cyklus |
| `docs/reports/**` | **nie** | append-only história, 44 súborov a rastie; neexpiruje, len starne |
| `docs/prompts/**` | **nie** | jednorazové zadania vĺn |
| `apps/`, `packages/` | nie | kód je vlastný zdroj pravdy |

Rozdiel medzi „kanonické" a „historické" je celý trik. Report z augusta nie je zastaraný —
je to záznam. Architektonický dokument z augusta, ktorý tvrdí nepravdu, **je** zastaraný
a musí kričať.

### 4.4 Postup

**Krok 1 — frontmatter na kanonické dokumenty.** Rozšíriť konvenciu z `brain/ENGINE.md`
(`id`, `status`, `canonical`, `review_by`, `sources`, `depends_on`, `supersedes`)
na ~30 dokumentov v rozsahu podľa 4.3. Nie na všetkých 463.

**Krok 2 — staleness check.** Skript, ktorý vypíše kanonické dokumenty s `review_by`
v minulosti alebo bez `review_by` vôbec. Zaradiť do ranného reportu ako jeden riadok —
tam ho founder uvidí bez toho, aby ho hľadal.

**Krok 3 — registry ako mapa obsahu.** `brain/registry/index.json` už dnes nesie
`id`, `dependencies`, `evidence` s commit SHA a digest. Generovať z neho `brain/MOC.md`
s odkazmi `[[wiki-style]]`, ktorý je zároveň vstupným bodom vaultu aj čitateľný na GitHube.

**Krok 4 — žiadne pluginy.** Vault ostáva na stock Obsidiane. Dataview a spol. by znamenali,
že obsah je čitateľný len v Obsidiane — a to je presne opak toho, čo chceme, lebo hlavný
konzument týchto dokumentov je agent čítajúci repozitár, nie človek s appkou.

**Ak sa krok 1 do dvoch týždňov neurobí, zmaž `.obsidian/`.** Prázdny vault je horší než
žiadny, lebo vyzerá ako systém, ktorý funguje.

---

## 5. Poradie a brány

| # | Práca | Kam | Horizont | Brána |
|---|---|---|---|---|
| 1 | Merge troch kritických fixov + ručná migrácia cez Supabase Dashboard | `main` | dnes | **GO REQUIRED** — founder |
| 2 | V5-A..F nočná vlna | vetvy + PR | dnes v noci | AUTO-SAFE (docs/governance, prienik ciest prázdny) |
| 3 | O1 kontrakt `wave-*.json` + O2 šablóna reportu | `.ai/bus/state/`, `docs/reports/` | vlna V6 | AUTO-SAFE |
| 4 | T1 roly v `.claude/agents/` + T2 `OWNERSHIP.md` | `.claude/`, `.ai/bus/` | vlna V6 | AUTO-SAFE |
| 5 | O3 kontrolór ako povinná brána | prompt orchestrátora | vlna V6 | AUTO-SAFE |
| 6 | Vault krok 1–3 (frontmatter, staleness, MOC) | `brain/`, `docs/architecture/` | 2 týždne | AUTO-SAFE |
| 7 | T3 merge guard v CI | `.github/workflows/` | BACKLOG | GO REQUIRED — Tier 3 |
| 8 | Branch cleanup delete podľa V5-C balíka | `origin` | po review balíka | **GO REQUIRED** — nezvratné |

Body 1 a 8 sú jediné nezvratné. Všetko ostatné je vetva a PR, ktorý sa dá zavrieť.

---

## 6. Otvorené neznáme

- Účinnosť novely katastrálneho zákona (1. 7. 2026 vs. 1. 1. 2027) — mení, čo smie
  `gdpr-advisor` povoliť.
- Či `gh` v cloud agentoch je autentifikované — od toho závisí, či V5-D vie čítať PR,
  alebo bude pracovať len s vetvami.
- Či founder chce vault vôbec udržať — bod 4 je napísaný ako „job or delete" práve preto,
  že to rozhodnutie som neurobil za neho.
