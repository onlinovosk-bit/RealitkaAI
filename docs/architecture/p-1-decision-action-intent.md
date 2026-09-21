---
title: P-1 DECISION — kde bude ACTION INTENT durable
gate: GO P-1-DECISION (rozhodnutie, bez migrácie a bez kódu)
date: 2026-09-21
writes_to_prod: none
decision: B — `ai_jobs`, po legalizácii. `ai_action_audit` zostáva append-only audit vrstvou a neohýba sa.
---

## P-1

**A — `ai_action_audit`** · **B — `ai_jobs`**

Rozhodovacie kritérium (founderovo znenie): *ktorá cesta umožní splniť CP-P0-1A contract
**bez vytvorenia nového skrytého truth layer** a **bez porušenia repo/PROD parity**?*

### Rozdelenie, ktoré spor rozpúšťa

Founder navrhol oddeliť dve veci, ktoré P1-COMPARISON našlo v konflikte:

```
ACTION INTENT          = stavový durable objekt   (jeden riadok na idempotency_key, UPDATE)
AUDIT / EVENT HISTORY  = append-only história     (riadok na udalosť, INSERT)
```

Toto oddelenie **odstraňuje konflikt ⚠️ z P1-COMPARISON**. Konflikt vznikal len preto, že
sa obe roly tlačili do jednej tabuľky. Keď sú oddelené:

- `ai_action_audit` je **natívne audit vrstva** (append-only, `action_kind` enum, 2 views nad ňou). Zmena na stavový stroj ju rozbíja.
- `ai_jobs` je **natívne stavový stroj** (`status`, `retry_count`, `max_retries`, `run_after`, `last_error`, `started_at`, `completed_at`). Je to tvar intentu.

Nejde teda o „ktorá tabuľka je lepšia", ale o **ktorá tabuľka robí ktorú rolu**.

---

## P0-1A requirements → constraint-by-constraint fit

| # | Požiadavka | A ako INTENT | B ako INTENT |
|---|---|---|---|
| **R1** | intent durable pred externým volaním | ➕ | ➕ |
| **R2** | `UNIQUE (idempotency_key)`, retry = unique violation ako úspech | ⚠️ **vylučuje sa s append-only** — jeden kľúč nepustí intent-riadok aj execution-riadok | ✅ jeden riadok na kľúč, UPDATE cez stavy — presne to, čo UNIQUE chce |
| **R3** | `decision_id → decisions.id` NOT NULL | ➕ | ➕ |
| **R4** | tenant na každom riadku | ✅ má `agency_id` | ➕ `agency_id NOT NULL` na 0 riadkoch = zadarmo |
| **R5** | stavy `intended → executed \| failed` | ⚠️ treba pridať stavovosť tabuľke, ktorá ju nemá | ✅ `status` + časové značky existujú |
| **R6** | T1 atómicky cez plpgsql RPC | ➕ | ➕ |
| **R7** | čitateľné tým, kto audituje | ✅ má policy *(tvar rieši P-2)* | ➕ 0 policies, treba napísať *(P-2)* |
| **R8** | reconciler nájde visiace intenty | ➕ index treba doplniť | ✅ `ai_jobs_runner_poll WHERE status='pending'` už existuje |
| **R9** | bez PII, odkazy nie obsah | ✅ `body_hash` | ⚠️ `payload jsonb` treba obmedziť pravidlom |
| **R10** | P1 join cez FK | ➕ | ➕ |
| — | **žiadny nový skrytý truth layer** | ⚠️ intent by žil v tabuľke, ktorej deklarovaná (CI) a skutočná (PROD) schéma sa líšia v 4 stĺpcoch a 2 views | ✅ legalizácia **odstraňuje** existujúci nedeklarovaný objekt |
| — | **repo/PROD parita** | ⚠️ 4 migrácie, 0 aplikovaných, príčina neznáma (U-R) | ⛔ dnes porušená → ✅ po legalizácii, jedným deterministickým krokom |

---

## Unresolved issues

**Uzavreté počas tejto brány:**

- **U-P — writer `ai_jobs` mimo repa: NEEXISTUJE.** Na PROD je nasadených **0 Edge Functions** (`list_edge_functions` → `{"functions":[]}`). V `automation/` (n8n exporty), `scripts/`, `packages/`, `brain/`, `.ai/` ani v `apps/crm/supabase/functions/` nie je o `ai_jobs` zmienka. Túto kontrolu som urobil zámerne aj napriek zadaniu „žiadne ďalšie meranie" — bez nej by rozhodnutie stálo na neovereom predpoklade, a keby writer existoval, rozhodnutie by bolo **nesprávne**.

**Zostávajú otvorené, žiadne z nich neblokuje toto rozhodnutie:**

- **U-T** — kto a kedy vytvoril `ai_jobs` na PROD bez migrácie. Zaujímavé pre A8, nebráni legalizácii.
- **U-R** — prečo 4 migrácie `ai_action_audit` nikdy nepristáli. **Blokovalo by cestu A**, cestu B nie.
- **U-S** — či `logAiActionAudit` zlyháva naozaj na chýbajúcich stĺpcoch. Samostatná brána.
- **Reziduálne k U-P** — writer s `service_role` kľúčom úplne mimo tohto účtu (ručný psql, externá služba) sa odtiaľto vylúčiť nedá. Pravdepodobnosť nízka, dopad vysoký ⇒ legalizačná migrácia nesmie `ai_jobs` zužovať deštruktívne (žiadny DROP stĺpca).

---

## EXPLICIT DECISION

> **P-1 = B.** `ai_jobs` sa stáva úložiskom **ACTION INTENT**, po legalizácii svojho
> skutočného produkčného tvaru. `ai_action_audit` **zostáva tým, čím je** — append-only
> audit / event history — a do stavového stroja sa neohýba.

**Prečo nie A, hoci je živá:** pri A by fail-closed záruka control plane stála na tabuľke,
ktorej deklarovaná a skutočná schéma sa rozchádzajú z dôvodu, ktorý nikto nevysvetlil (U-R).
To je presne „skrytý truth layer" z founderovho kritéria. Navyše by sa buď rozbil
append-only model, alebo oslabil význam `UNIQUE` — a tým I-009.

**Prečo nie nová tabuľka (C):** koncovým stavom by bolo to isté, čo B, **plus** `ai_jobs`
by zostalo nedeklarovaným produkčným objektom navždy. CP-P0-1A by postavilo čistú vrstvu
a obišlo pritom objekt tej istej triedy problému meter vedľa. B dominuje C.

**Prečo je B bezpečné napriek dormancii:** vzor `lead_events` je „tabuľka bez writera, ktorú
považujeme za funkčnú". Tu writer vzniká ako súčasť CP-P0-1A a dormancia sa nikde nevydáva
za dôkaz funkčnosti. Prázdnota je naopak výhoda — nie sú historické riadky, konzumenti ani
spätná kompatibilita.

### Záväzné predpoklady, v tomto poradí

1. **Znovu odmerať presný PROD tvar `ai_jobs`** — defaulty, CHECK constrainty, nie len stĺpce a indexy. Merané mám stĺpce a indexy, **nie defaulty a CHECKy**.
2. **Legalizačná migrácia** deklaruje presne ten tvar. Až potom aditívne `ALTER`y: `agency_id NOT NULL`, `decision_id`, `correlation_id`, `run_id`, `action`, `idempotency_key` + `UNIQUE`, `provider_ref`, `authority_verdict_snapshot`.
3. **Zápis do `tenant-table-registry.ts`**, aby CI RLS izolačný test tabuľku pokrýval.
4. **Voliteľne premenovať `ai_jobs → action_intents`** — na 0 riadkoch a 0 calleroch je to zadarmo a názov `ai_jobs` nehovorí „action intent". Dotaz P1 v persistence definícii už `action_intents` pomenúva. **Founderovo rozhodnutie, nepredpokladám ho.**

---

## Consequences for A1–A8

| | Dôsledok |
|---|---|
| **A1** kanonická v2 schéma | Nezmenená v tvare, ale musí explicitne povedať, že slučka má **dve úložiská**: `ai_jobs` (stavové intenty) a event spine (append-only). Intent **nie je** event. |
| **A2** `scope` diskriminátor | Platí **len pre spine**. Intenty sú vždy tenant-scoped ⇒ `agency_id NOT NULL`, žiadny `scope`, žiadne platformové intenty. A2 to môže zamknúť ako zjednodušenie. |
| **A3** tenant isolation | `ai_jobs` má dnes 0 policies a nie je v CI registri. Treba oboje. **Blokované na P-2.** |
| **A4** correlation / causation / run | Intent nesie `correlation_id`, `run_id`, `decision_id`. **`causation_id` zostáva výhradne na eventoch** — kauzalita je event→event. Čisté rozdelenie. |
| **A5** idempotency model | **Konflikt ⚠️ zmizol.** `UNIQUE (idempotency_key)` nad stavovým jedno-riadkovým objektom je presne to, čo I-009 žiada; precedens `credit_ledger_idem_uq`. A5 sa dá navrhnúť hneď po legalizácii. |
| **A6** schema versioning | `schema_version` patrí eventom, nie intentom. Intent je aktuálny stav; verzuje sa migráciou, nie stĺpcom. |
| **A7** invariant enforcement | I-009 cez UNIQUE. I-006 cez reconciler nad `status='intended'` staršími než SLA — **použije existujúci partial index `ai_jobs_runner_poll`**. I-004/I-005 cez FK NOT NULL. **Blokované na P-3** v časti, ktorá sa týka spine, nie intentov. |
| **A8** migration ownership | **Zlepšené týmto rozhodnutím** — legalizácia odstraňuje jeden nedeklarovaný produkčný objekt. Samostatne zaznamenať, že 4 migrácie `ai_action_audit` sú neaplikované (U-R); nie je to úloha tejto brány. |

**Navrhnuteľné hneď po P-1:** A1, A2, A4, A5, A6, A8.
**Stále blokované:** A3 (P-2), A7 (P-3).

---

## Čo táto brána neurobila

Žiadna migrácia, kód, schema change, RLS change, deployment, merge. Jedna read-only
kontrola navyše (Edge Functions + grep), zdôvodnená vyššie. P-2 ani P-3 nerozhodnuté.
