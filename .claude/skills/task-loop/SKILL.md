---
name: task-loop
description: >-
  Closed-loop next-task engine. Use at END of every task: rank backlog by
  Constitution value, propose ONE next task, classify GO gate. Swarm wave
  planning (DAG, disjoint proof, write-probe). Automates selection — NOT
  autonomous execution. Anti-drift, anti-doc. L99 Principal standard.
---

# Task Loop — Closed-Loop Next-Task Engine (L99)

> **Čo to NIE JE:** nekonečný autonómny loop, ktorý sám vykonáva ďalšiu úlohu.
> To viedlo k stealth-funnel incidentu. Agent **navrhne a pripraví**, ľudská
> **GO/NO-GO brána** rozhodne o vykonaní — najmä pre PROD, secrets, merge,
> scope mimo zadania.

> **Čo to JE:** na konci každej úlohy znížiť „čo ďalej?" trenie — jedna
> zoradená ďalšia úloha, jasná brána, žiadne chválenie namiesto práce.

---

## Kedy aktivovať

- **Vždy** na konci každej dokončenej (alebo zastavenej) úlohy v session.
- **Na začiatku** session: prečítaj `memory/session-summary.md`, `memory/open-tasks.md`,
  potom navrhni prvú úlohu podľa tohto skillu (stále s GO bránou ak treba).

---

## Krok 0 — Sync (30 s)

1. `memory/session-summary.md` — posledný stav
2. `memory/open-tasks.md` — fronta
3. `memory/decisions.md` — nedávne VETO/BUILD
4. Otvorené PR / CI (`gh pr list --state open` ak relevantné)
5. **Nepísať nový rozbor**, ak existuje nedokončená **vykonávacia** vec (merge, smoke, reconcile, fix CI)

---

## Krok 1 — Čo sa zmenilo (fakty, nie pocit)

Krátko (3–5 odrážok):

- Čo bolo **hotové** (súbor/PR/commit)
- Čo **odomklo** alebo **odhalilo** novú prácu
- Čo **ostáva otvorené** s dôkazom (log, CI, SQL), nie dojmom

**Zákaz:** „pozri ako ďaleko si sa dostal", „skvelý deň", „kompletná Vlna" — len ak user explicitne pýta retrospektívu.

---

## Krok 2 — Backlog ranking (Ústava + L99)

Zoradiť kandidátov podľa:

1. **Blokuje platiaceho klienta / retenciu?** (Smolko prod, deploy, dáta v CRM)
2. **Rozbehnuté nedokončené?** (PR čaká merge, smoke fail, 401 na PROD)
3. **1 PR = 1 logická zmena** — ďalší krok musí byť mergeable samostatne
4. **Ústava veto:** timing „príliš skoro" → BACKLOG; „nikto nezaplatí" → max VALIDATE
5. **Anti-drift:** nová scope len ak user explicitne schválil alebo je v `open-tasks.md` / briefe

Zdroje kandidátov (v tomto poradí):

- Nedokončené z aktuálnej úlohy
- `memory/open-tasks.md`
- `memory/decisions.md` (VALIDATE položky)
- CI / PR blockers
- **NIE** vymýšľaná nová feature bez Constitution check

---

## Krok 3 — Vyber JEDNU ďalšiu úlohu

Formát:

```
ĎALŠIA ÚLOHA: [jedna veta — konkrétna akcia]
PREČO TERAZ: [1 veta — hodnota / blocker]
BRÁNA: [AUTO-SAFE | GO REQUIRED | STOP]
```

---

## Krok 4 — Klasifikácia brány

### AUTO-SAFE (môžeš pokračovať v tej istej session bez explicitného GO)

- Read-only: grep, read, `gh pr view`, audit SQL SELECT
- Lokálny kód na vetve (nie merge do `main`)
- Testy/build na vlastnom repe
- Docs v scope aktuálnej úlohy
- Fix CI na **otvorenej** PR vetve

### GO REQUIRED (priprav, zastav, čakaj na „áno" / „merge" / „spusti")

- Merge do `main`
- PROD zásah (SQL write, cron, reconcile, delete)
- Secrets / credentials (Vercel, Supabase service role na PROD)
- Nová feature mimo aktuálneho briefu
- Scope > 1 logická zmena
- Externá komunikácia (klient, marketing)

#### PROD DELETE — anti-reflex (povinné pred každým DELETE)

Rovnaký `external_id` / `source_id` **≠** rovnaký záznam v čase. Vždy:

1. **SELECT obe strany** (audit + entita), nie jedna tabuľka:
   - `realsoft_import_logs` — `external_id`, `result_code`, `received_at`, `raw_payload`
   - `properties` — `source_id`, `title`, `created_at`
2. **Porovnaj timestamp** s posledným známym smoke/probe v session (10:42 ≠ 13:43 = iný beh).
3. **Identifikuj zdroj** z `raw_payload` (napr. `audit-fix-probe` vs app smoke) — nepopisuj „starý smoke" bez dôkazu.
4. **STOP** ak timestamp nečakaný, zdroj neznámy, alebo property existuje bez istoty o väzbe.
5. DELETE len ak: obe strany overené, žiadna aktívna väzba, user GO alebo explicitný cleanup scope.
6. **After:** before/after count na oboch tabuľkách; žiadna osirelá property.

**Príklad chyby:** `result_code=1` v audit logu neimplikuje property riadok — over SELECTom.

### STOP (nahlás blocker, nepokračuj)

- Chýba zdroj dát (data-sourcing map unknown)
- Constitution REJECT / timing veto bez schválenia
- CI červené na `main` bez plánu rollbacku
- Nejasný user intent — použi `AskQuestion`

**Pravidlo AP-004:** lokálny secret **nikdy** na PROD. Ak 401 → STOP, nie obchádzka.

---

## Krok 5 — Anti-drift & anti-doc checklist

Pred návrhom ďalšej úlohy over:

| Check | Ak zlyhá |
|-------|----------|
| Je to v scope posledného user príkazu / briefu? | STOP alebo explicitne označ drift |
| Existuje konkrétnejšia **vykonávacia** vec? | Tá má prednosť pred novým dokumentom |
| Vytváram len ďalší .md namiesto fixu? | Prepni na fix |
| Je to VALIDATE bez dát? | BACKLOG + jedna otázka pre foundera |

---

## Krok 6 — Výstup na konci úlohy (povinná šablóna)

```markdown
## Task-loop

**Hotovo:** [max 3 bullets, cesty]

**Otvorené:** [max 3 bullets]

**Ďalšia úloha:** [1 veta]

**Brána:** AUTO-SAFE | GO REQUIRED | STOP — [dôvod]

**Ak GO REQUIRED:** [presný príkaz / čo user má urobiť]
```

Ak **AUTO-SAFE** a user v poslednej správe nezastavil prácu → **môžeš začať** ďalšiu úlohu v tom istom turne.
Ak **GO REQUIRED** → **nezačínaj** — len priprav (branch, príkaz, diff preview).

---

## Integrácia s pamäťou

Po session (alebo po väčšom bloku):

- Aktualizuj `memory/session-summary.md` (formát v `CLAUDE.md`)
- Posun v `memory/open-tasks.md` — `[x]` hotové, nové `[ ]` len s dôvodom
- Nové BUILD/BACKLOG/VETO → `memory/decisions.md`

---

## Príklad (správne)

```
Hotovo: #222 merged, reconcile scanned=13 updated=5 skipped=8
Otvorené: decisions.md commit ahead 1 (nepushnuté); K3 UI route chýba
Ďalšia úloha: push decisions.md + otvoriť PR pre banner UI route (VALIDATE s Smolko)
Brána: GO REQUIRED — nová UI scope, Constitution otázka 1
```

## Proti príklad (zakázané)

```
Skvelá práca! Vlna 1 kompletná! Automaticky začínam enrichment engine pre 439 leadov...
```
→ chválenie + autonómna nová scope + ignoruje BRI VETO backfill.

---

## Krok 7 — Swarm plánovanie (Ruflo / paralelné vlny)

Keď user požiada o **dávku úloh**, **overnight swarm** alebo **paralelné PR**, loop rozšíri výber na **plán vĺn** — stále s GO bránou na každú úlohu, **nie** autonómne vykonávanie celej dávky.

### 7.1 Postav DAG

- Každá úloha = uzol s explicitnými **závislosťami** (napr. K3b → K3a merged).
- **Vlna N+1 nikdy pred merge Vlny N** do `main`.
- Jedna vetva = jedna logická zmena = jeden PR = jeden Preview.

### 7.2 Dôkaz nekrižovateľnosti (pred paralelizáciou)

Paralelizovať smieš len ak pre každý pár v rovnakej vlne:

| Kontrola | Požiadavka |
|----------|------------|
| Súbory | Disjunktné cesty (`git diff --name-only` na vetvách sa neprekrývajú) |
| Dáta | Žiadna závislosť na tom istom riadku/tabuľke v PROD |
| Migrácie | Žiadny zdieľaný migračný zásah v jednej vlne |
| Konfig | Žiadna zmena rovnakého flagu/env bez koordinácie |

**Pochybnosť = sekvenčne.** Nepreukázaná paralelizácia plodí konflikty a slop (stealth-funnel drift).

### 7.3 Zoskup do vĺn

```
Vlna 1: [A, B] — paralelne len ak 7.2 prešlo
         ↓ merge + CI + smoke
Vlna 2: [C] — stacked na A alebo B ak DAG vyžaduje
```

Výstup plánu:

```markdown
## Swarm plán
| Úloha | Vetva | Vlna | Paralel s | Závisí na | Brána |
```

### 7.4 Fáza 0 — write-probe

Pred každou dávkou (ak swarm zapisuje do repa):

- Krátky **write-probe** commit/branch overí, že agent vie pushnúť a CI beží.
- Bez zeleného probe → **STOP**, nespúšťaj 6 agentov naraz.

### 7.5 Brána v paralelizme

- Každá úloha vo vlne má vlastnú **GO / AUTO-SAFE / STOP** klasifikáciu.
- Merge každého PR = samostatné GO (alebo automerge policy Tier 1/2).
- PROD/cron/secrets = **nikdy** v swarm batch bez explicitného foundera.

### 7.6 Anti-drift vo swarme

- Swarm **nevymýšľa** novú scope mimo briefu v `docs/briefs/overnight/`.
- Ak agent pridá súbor mimo zadania (napr. enrichment engine pri K3 briefe) → **drift**, zastav vetvu.
- Po vlne: task-loop Krok 1 — čo reálne merged vs. čo ostalo OPEN.

---

## Súvisiace skills

- `kontrolor` — pred merge / PROD / odporúčaním „BUILD"
- `gdpr-advisor` — externé/personal data
- `docs/architecture/revolis-constitution-v2.md` — ranking
