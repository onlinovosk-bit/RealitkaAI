---
title: CP-P0-1A-PERSISTENCE-DEF — zamknutá definícia durable persistence pre acceptance #4/#5
gate: GO CP-P0-1A-PERSISTENCE-DEF (read/analysis only, spec only)
date: 2026-09-21
writes_to_prod: none
method: 9 read-only SELECTov na PROD `ypgajkhqtbriqqmyawyv` + čítanie repa
verdict: CONDITIONAL GO pre CP-P0-1A — tri rozhodnutia musia byť zamknuté v rámci brány
---

## 0. Prečo táto brána existuje

CP-P0-4 skončil s acceptance **#4 a #5 čiastočne splnenými**: uzavretá slučka je dokázaná
v procese a v testoch, nie je perzistovaná. Bez presnej definície, čo „perzistovaná"
znamená, by sa A1–A8 navrhovali proti pohyblivému cieľu.

Zadanie brány: **najprv zmerať, čo už existuje**, a až potom povedať, či to stačí.
Nezavádzať tabuľku len preto, aby zaplnila medzeru.

---

## 1. Inventár existujúcich persistence primitív (merané, nie predpokladané)

| Primitívum | Riadky | Najnovší záznam | Callery v `apps/crm/src` | Verdikt |
|---|---|---|---|---|
| `credit_ledger` + `credit_ledger_idem_uq` | 6 | 2026-09-01 | áno (`spend_credits` RPC) | **LIVE** — deterministický `idempotency_key` + `UNIQUE` index |
| `realvia_processing_queue` | 196 | 2026-09-16 | áno (`webhookStore.ts`) | **LIVE** — outbox so `status`/`retry_count`/`next_retry_at` |
| `ai_action_audit` | 170 | **2026-09-21 06:24** | áno | **LIVE** — jediný per-akciový záznam, ktorý dnes reálne vzniká |
| `platform_events` | 1 418 | 2026-09-19 | áno (DB trigger) | **LIVE** — eventový spine v1 |
| `decisions` | 240 | **2026-06-25** | áno, ale nepíše sa | **MŔTVE od júna** |
| `exclusivity_outcomes` | 0 | — | áno, nedosiahnuteľné | **NIKDY NESPUSTENÉ** |
| `ai_jobs` | **0** | — | **0 callerov** | **DORMANT** — tabuľka bez writera |
| `lead_triage_idempotency` | **0** | — | **0 callerov** | **DORMANT** — tabuľka bez writera |

**Nález I-A — dve dormantné tabuľky s presne tým tvarom, ktorý potrebujeme.**
`ai_jobs` (`job_type, payload, status, retry_count, max_retries, run_after, last_error,
started_at, completed_at` + partial index `WHERE status='pending'`) je učebnicový outbox.
`lead_triage_idempotency` (`PRIMARY KEY (lead_id, day_utc)`, `state`,
`processing_started_at`) je učebnicový claim/lease. **Ani jedna nemá writera a ani jedna
nemá `agency_id`.** Je to presne vzor `lead_events` — schéma existuje, cesta zápisu nie.
Nesmú byť v CP-P0-1A prezentované ako „už to máme".

**Nález I-B — jediná živá outbox cesta nie je atómická.**
`webhookStore.ts` zapíše webhook log a **potom samostatným INSERTom** enqueue-ne job
(`enqueueProcessingJob`, každý s vlastnou error vetvou). Keď druhý INSERT zlyhá, log
existuje a intent je stratený — ticho. Toto je produkčný precedens, ktorý Control Contract
**nesmie zopakovať**.

**Nález I-C — `decisions` už má stĺpce na celú slučku a nepoužívajú sa.**
Tabuľka nesie `alternatives`, `rationale`, `expected_outcome`, `actual_outcome`,
`actual_value_eur`, `outcome_recorded_at`, `lesson`, `what_evidence_failed`,
`what_would_change`, `status CHECK IN ('open','resolved','rejected')`.
Merané: **240 open · 0 s `outcome_recorded_at` · 0 s `lesson` · 0 s `alternatives`.**
Schéma slučku podporuje; writer ju nevyužíva.

**Nález I-D — `credit_ledger_idem_uq` je UNIQUE na `idempotency_key` samotnom**, nie per
agentúra. Pre kľúč odvodený ako `sha256(agentId:action:tenantId:entityId:decisionId)` to
stačí (tenant je súčasťou hashu), ale je to globálny menný priestor — kolízia naprieč
doménami je možná, ak niekto pridá nedeterministický kľúč.

---

## 2. Merané blokéry, ktoré sa netýkajú tvaru dát

**B-1 — `decisions`, `exclusivity_outcomes`, `credit_ledger`, `ai_jobs`,
`lead_triage_idempotency` majú `rowsecurity = true` a ZERO policies.**
RLS zapnuté bez policy = **deny-all** pre `anon` aj `authenticated`. Číta a píše ich len
`service_role`. Pre izoláciu je to fail-closed a správne, ale **znamená to, že žiadny
nájomca nikdy neuvidí vlastnú slučku cez bežného klienta**. Ak má byť PROOF dotaz
spustiteľný tenantom alebo foundrom cez UI, tieto tabuľky ako durable úložisko slučky
**dnes nefungujú**.

**B-2 — obe živé „tenantné" policy majú `agency_id IS NULL` OR-vetvu.**
Merané znenie na `platform_events_select_tenant`, `ai_action_audit_select_tenant`
aj `ai_action_audit_insert_tenant`:

```
((agency_id IS NULL) OR (agency_id IN (SELECT p.agency_id FROM profiles p
  WHERE p.auth_user_id = auth.uid() AND p.agency_id IS NOT NULL)))
```

Riadok s `agency_id IS NULL` je čitateľný **každým prihláseným používateľom každej
agentúry**. Dnes je diera prázdna (`platform_events` 0 NULL, `ai_action_audit` 0 NULL),
ale je otvorená. Toto je presne to, čo mal `scope` diskriminátor (D-06 / OD-4) zavrieť —
teraz je to zmerané, nie hypotéza.

**B-3 — `platform_events` nemá žiadny UNIQUE okrem PK na `id`.**
Bez unique indexu nad idempotency kľúčom nevie byť I-009 vynútené na tejto tabuľke.

**B-4 — korekcia CP-EVIDENCE (18. 9.): cost telemetria už na PROD pristáva.**
CP-EVIDENCE zaznamenal „0 riadkov s cost kdekoľvek". Merané 21. 9.: **140 zo 170**
riadkov `ai_action_audit.meta` obsahuje `costEur`, `model`, `latencyMs`, `creditsSpent`.
**Ale `lead_id` je stále 0/170.** Reťaz cost → outcome teda nie je zlomená na cost
článku, ale na **atribúcii k entite**. To je spresnenie pre CP-P0-3a, nie pre túto bránu.

---

## 3. Štyri články a kde by dnes mohli žiť

Dôkaz uzavretej slučky vyžaduje nájsť pod jedným korelačným reťazcom:

```
DECISION → ACTION INTENT → EXECUTION / ACK → OUTCOME
```

| Článok | Existujúci kandidát | Čo chýba | Nová tabuľka nutná? |
|---|---|---|---|
| **DECISION** | `decisions` | `correlation_id`, `action`, `actor`, `run_id`, `policy_ref`, `idempotency_key` | **NIE** — aditívne stĺpce |
| **ACTION INTENT** | **žiadny živý** | celý záznam: musí vzniknúť **pred** externým volaním, s `state='intended'` a UNIQUE nad idempotency kľúčom | **rozhodnutie vlastníka** — viď §5 |
| **EXECUTION / ACK** | `ai_action_audit` (živé, 170 riadkov) | `state`, `decision_id`, `correlation_id`, `idempotency_key`, `provider_ref`; `lead_id` sa nepíše | **NIE** — aditívne stĺpce |
| **OUTCOME** | `decisions.actual_outcome` + `outcome_recorded_at`, `exclusivity_outcomes` | `reason` pre `unknown`, `recheck_after`, 7 stavov namiesto 3 | **NIE** — aditívne stĺpce + rozšírený CHECK |

**Tri zo štyroch článkov sa dajú pokryť aditívnymi stĺpcami na existujúcich tabuľkách.
Chýba práve jeden: ACTION INTENT.**

---

## 4. Deväť odpovedí

### WHAT — čo presne musí byť durable

Durable musí byť **záznam o zámere pred jeho vykonaním** a **záznam o jeho výsledku**.
Konkrétne, minimálna množina:

1. **Decision** — `decision_id`, `correlation_id`, `tenant_id`, `actor`, `action`,
   `entity_type`, `entity_id`, `confidence`, `expected_outcome`, `observations[]`,
   `policy_ref`, `decided_at`.
2. **Action intent** — `intent_id`, `decision_id`, `correlation_id`, `run_id`,
   `tenant_id`, `action`, `idempotency_key`, `state`, `authority_verdict_snapshot`,
   `intended_at`.
3. **Execution / ack** — prechod stavu intentu + `provider_ref` (id, ktoré vrátil
   provider), `cost_eur`, `model`, `latency_ms`, `error_code`, `executed_at`.
4. **Outcome** — `outcome_id`, `decision_id`, `correlation_id`, `status` (7 hodnôt),
   `reason` (povinný práve pri `unknown`), `value_eur`, `measured_at`, `recheck_after`.

**Nie je durable a nesmie byť:** obsah draftu, meno, e-mail, telefón (I-011). Payload
nesie odkazy, nie obsah.

### WHERE — kde to musí byť perzistované

V **PostgreSQL na PROD**, v tabuľkách čitateľných tým, kto má slučku auditovať.
`ControlEventSink` z CP-P0-4 dostane druhú implementáciu vedľa `createInMemorySink`.

**Nie `platform_events` vo v1 podobe** — B-3 (žiadny unique) a B-2 (NULL-agency vetva).
**Nie výlučne tabuľky s deny-all RLS** — B-1: záznam, ktorý nikto okrem `service_role`
neprečíta, nespĺňa účel „vieme dokázať, že slučka existuje".

### WHEN — v ktorom okamihu vzniká durable record

| Okamih | Vzniká |
|---|---|
| po DECIDE, pred AUTHORIZE | Decision |
| po AUTHORIZE s verdiktom `AUTONOMOUS`, **pred** prvým externým volaním | Action intent, `state='intended'` |
| po návrate providera (úspech aj chyba) | prechod na `executed` / `failed` + `provider_ref` |
| keď je výsledok pozorovateľný, alebo keď uplynie SLA | Outcome |

**Záväzné pravidlo:** ak intent nie je durable **pred** externým volaním, jeho zlyhanie je
nerozlíšiteľné od toho, že sa nikdy nestalo. To je presne diera I-B.

### TRANSACTION — čo musí byť v jednej DB transakcii

Tri atómové bloky, medzi nimi sieťová hranica:

```
T1 (atómicky):  Decision + Action intent(state='intended')   ── INSERT ... UNIQUE(idempotency_key)
      │
      ├─ externý side effect (NIE atómický, NIE opakovateľný zadarmo)
      │
T2 (atómicky):  intent → executed|failed + provider_ref + cost/model/latency
      │
T3 (atómicky):  Outcome + prepojenie na decision
```

**T1 musí byť jedno volanie plpgsql funkcie cez `supabase.rpc()`.** Supabase JS klient
neposkytuje multi-statement transakciu — to je overené, nie predpokladané: v repe je
**17 `.rpc(` call sites** a produkčný precedens `public.spend_credits` (SECURITY DEFINER,
EXISTS-idempotency check → `SELECT ... FOR UPDATE` → 2× INSERT → UPDATE) spravuje peniaze.
**Navrhovaný T1 nie je nový vzor — je to vzor, na ktorom stojí účtovanie kreditov.**

**Čo v jednej transakcii byť nemôže:** externý side effect. Exactly-once cez sieť je
nedosiahnuteľné; najlepšie možné je effectively-once (CP-SPEC §3.8).

### CORRELATION — ako sa články prepoja

`correlation_id` na všetkých štyroch záznamoch + **explicitné FK reťazenie**:

```
action_intent.decision_id  → decisions.id     (NOT NULL)
outcome.decision_id        → decisions.id     (NOT NULL)
outcome.intent_id          → action_intent.id (NULL = slučka sa uzavrela pred ACT)
```

**`correlation_id` sám osebe nie je dôkaz uzavretej slučky** — je to len spoločný
štítok. Dôkazom je **existencia riadkov v štyroch článkoch s FK väzbou medzi nimi**.
Práve preto `outcome.intent_id` smie byť NULL, ale `outcome.decision_id` nie: to
rozlišuje „akcia sa nevykonala a vieme prečo" od „akcia sa stratila".

### RETRY — čo sa stane pri retry

- Retry = **nový `run_id`, rovnaký `correlation_id`, rovnaký `idempotency_key`**.
- Retry sa robí **len na ACT** a len pri `errorCode ∈ {TRANSIENT, TIMEOUT, RATE_LIMIT}`,
  exponenciálne 2/4/8/16 s, max 4 (CP-SPEC §3.7).
- `DECIDE` a `AUTHORIZE` sa **neretryujú nikdy** — vyrobili by druhé rozhodnutie nad tou
  istou observáciou.
- T1 pri retry narazí na UNIQUE a **je to úspech, nie chyba** (vzor
  `starter-pack/redemption.ts:148`: unique-violation-ako-úspech).

### IDEMPOTENCY — čo zabráni duplicitnému výsledku

Dve vrstvy, lebo jedna nestačí:

1. **Platformová (vynútiteľná).** `UNIQUE (idempotency_key)` nad action intentom.
   Kľúč je deterministický: `sha256(agentId:action:tenantId:entityId:decisionId)`.
   Precedens: `credit_ledger_idem_uq`, merané, živé.
2. **Providerská (nevynútiteľná nami).** Zapísaná v `ActionMetadata.providerIdempotency`
   z CP-P0-4: Resend `probable` s **24 h retenciou**, Twilio Messages `unknown`.
   **Retry po 24 h nebude u Resendu deduplikovaný** — chytí to len vrstva 1.

Preto: duplicitnému **záznamu** zabráni UNIQUE; duplicitnému **e-mailu** nezabráni nič
s istotou. Tento rozdiel musí byť v CP-P0-1A napísaný, nie zamlčaný.

### FAILURE — čo pri partial / external failure

| Situácia | Durable stav | Kto ju uzavrie |
|---|---|---|
| T1 zlyhá | nič nevzniklo, nič sa nevykonalo | — (fail-closed, správne) |
| externé volanie zlyhá s retryable chybou | intent `intended`, `retry_count++` | runner |
| externé volanie zlyhá trvalo | intent `failed` + `error_code` | T2 |
| **externé volanie prešlo, T2 zlyhal** | intent zostal `intended` | **reconciler** — jediný prípad, keď nevieme, či sa efekt stal |
| approval nedorazil / vypršal | outcome `rejected` / `expired` | runner alebo SLA |
| výsledok nie je pozorovateľný | outcome `unknown` + `reason` + `recheck_after` | runner |

**Riadok „externé volanie prešlo, T2 zlyhal" je jadro problému.** Fail-closed sa za
sieťovou hranicou vynútiť nedá. Jediná odpoveď je **reconciler**: periodický dotaz na
intenty v stave `intended` staršie než SLA, ktorý ich označí `outcome_unknown` a
vyžiada ľudské alebo providerské overenie. Reconciler **je súčasťou definície**, nie
neskorší doplnok — bez neho invariant I-006 nie je vynútiteľný.

### PROOF — akým dotazom dokážeme, že closed loop existuje

Dôkazom **nie je** `SELECT * WHERE correlation_id = ?`. Dôkazom je dotaz, ktorý pre každú
koreláciu vráti stav všetkých štyroch článkov a **pomenuje chýbajúci**:

```sql
-- P1: stav slučky + presné pomenovanie chýbajúceho článku
SELECT d.correlation_id,
       d.id                                   AS decision_id,
       i.id                                   AS intent_id,
       i.state                                AS intent_state,
       o.id                                   AS outcome_id,
       o.status                               AS outcome_status,
       CASE
         WHEN i.id IS NULL AND o.id IS NULL           THEN 'OPEN_NO_INTENT'
         WHEN i.id IS NULL AND o.id IS NOT NULL       THEN 'CLOSED_WITHOUT_ACT'
         WHEN i.state = 'intended' AND o.id IS NULL   THEN 'LOST_OR_IN_FLIGHT'
         WHEN i.state = 'executed' AND o.id IS NULL   THEN 'ACTED_NO_OUTCOME'
         WHEN i.state = 'failed'   AND o.id IS NULL   THEN 'FAILED_NO_OUTCOME'
         WHEN i.state = 'executed' AND o.id IS NOT NULL THEN 'CLOSED'
         ELSE 'UNCLASSIFIED'
       END AS loop_state
FROM decisions d
LEFT JOIN action_intents i ON i.decision_id = d.id
LEFT JOIN outcomes      o ON o.decision_id = d.id
WHERE d.correlation_id = $1;
```

**Acceptance #4 je splnená**, keď jeden reálny beh migrovaného agenta nad jedným leadom
vráti z P1 práve jeden riadok s `loop_state = 'CLOSED'` alebo
`'CLOSED_WITHOUT_ACT'` — a nič iné.

**Acceptance #5 je splnená**, keď P1 beží nad `correlation_id` a nevyžaduje žiadny ďalší
dotaz, žiadne spájanie v aplikácii a žiadny výklad.

```sql
-- P2: regresný dotaz na dnešné porušenie I-006
SELECT loop_state, count(*) FROM ( /* P1 bez WHERE */ ) x GROUP BY 1;
```
Dnešný stav (240 decisions / 0 outcomes / 0 intentov) musí P2 vrátiť ako
**240× `OPEN_NO_INTENT`** — nie ako nulu, nie ako chybu. Ak to tak nevráti, definícia
nie je správna.

```sql
-- P3: I-003, korelácia nesmie spájať dvoch nájomcov
SELECT correlation_id FROM decisions
GROUP BY correlation_id HAVING count(DISTINCT agency_id) > 1;
```
Musí vrátiť 0 riadkov. Dnes nevynútené — CP-P0-1A má rozhodnúť, či CHECK alebo detekcia.

---

## 5. Odpoveď na zadanú otázku: stačia existujúce primitíva?

**Pre tri články áno, pre jeden nie — a ten jeden nevyžaduje novú tabuľku nutne, ale
vyžaduje rozhodnutie vlastníka.**

Dve cesty pre ACTION INTENT, obe bez vynálezu na zelenej lúke:

**Cesta A — rozšíriť `ai_action_audit`.**
Je živá (170 riadkov, zápis dnes ráno), má `agency_id`, `meta jsonb`, FK na `leads`.
Pridať: `state`, `decision_id`, `correlation_id`, `run_id`, `idempotency_key`,
`provider_ref` + `UNIQUE (idempotency_key)`.
*Cena:* tabuľka dnes znamená „čo AI navrhla" (jediný `action_kind = 'ai_suggested'`).
Pridaním intent/execution stavu sa jej význam mení a 170 historických riadkov zostane
s `state = NULL`. Prekrytie dvoch významov v jednej tabuľke je presne AP-006.

**Cesta B — oživiť `ai_jobs` ako intent/outbox.**
Má presne správny tvar (`status`, `retry_count`, `max_retries`, `run_after`,
`last_error`, `started_at`, `completed_at`, partial index na `pending`).
*Cena:* **nemá `agency_id`** a **nemá žiadneho writera ani riadok**. Pridanie tenanta je
povinné (I-002). Oživovanie dormantnej tabuľky je lacnejšie než nová, ale nesmie sa
vydávať za „už to funguje".

**Neodporúčam tretiu cestu (nová tabuľka) bez toho, aby founder odmietol A aj B.**

---

## 6. Verdikt

### **CONDITIONAL GO → CP-P0-1A**

Persistence definícia je zamknuteľná. A1–A8 sa dajú navrhnúť proti nej. Podmienky nie sú
neznáme vyžadujúce ďalšie dôkazy — sú to **tri rozhodnutia vlastníka**, ktoré musia padnúť
vnútri CP-P0-1A, skôr než sa navrhne A7 (invariant enforcement):

| # | Rozhodnutie | Prečo founder, nie agent |
|---|---|---|
| **P-1** | ACTION INTENT: cesta A (rozšíriť `ai_action_audit`) vs cesta B (oživiť `ai_jobs`) | mení význam živej tabuľky alebo kriesi dormantnú; oboje je architektonický dlh, ktorý niekto musí vlastniť |
| **P-2** | RLS model pre slučkové tabuľky | dnes deny-all (B-1) ⇒ slučku nevidí nikto okrem `service_role`. Kto ju má vidieť — nájomca, founder, alebo len servis? |
| **P-3** | Či sa `agency_id IS NULL` OR-vetva (B-2) odstraňuje v CP-P0-1A alebo samostatnou bránou | je to zmena živej bezpečnostnej policy na dvoch tabuľkách |

### Čo NIE je blokér (a prečo)

- **T1 atomicita** — vyriešené, produkčný precedens `spend_credits`. U-K RESOLVED.
- **Idempotency** — vyriešené, `credit_ledger_idem_uq` je živý dôkaz.
- **Zdroj `reversible`** — vyriešené, `ActionMetadata` registry z CP-P0-4. U-L RESOLVED.
- **Providerská idempotencia** — **nie je blokér tejto brány**, pretože platformová vrstva
  chráni záznam aj bez nej. U-J zostáva otvorený pre Twilio a je zapísaný v registry.

### Čo by bolo NO-GO, keby to platilo

Pre úplnosť, aby sa dalo overiť, že verdikt nie je automatický: NO-GO by nastalo, keby
(a) neexistoval produkčný dôkaz atómického multi-row zápisu — neplatí, `spend_credits`,
(b) neexistoval produkčný dôkaz vynútenej idempotencie — neplatí, `credit_ledger_idem_uq`,
(c) `correlation_id` sa nedal odvodiť deterministicky — neplatí, odvodzuje sa z entity.

---

## 7. UNKNOWN — REQUIRES VERIFICATION

- **U-O** — či `decisions` možno rozširovať bez rizika. Tabuľka je mŕtva od 2026-06-25 a
  má 240 riadkov bez outcome. Či ich niekto niekde číta mimo `apps/crm/src`, nie je
  overené (cron mimo repa, n8n, externý nástroj).
- **U-P** — či `ai_jobs` a `lead_triage_idempotency` majú writera mimo `apps/crm/src`.
  Grep pokryl len repo; Supabase Edge Functions a n8n workflows neboli kontrolované.
- **U-Q** — aký je reálny outcome SLA pre `followup.draft`. Bez čísla je
  `recheck_after` odhad, a odhad v tejto vrstve je AP-001.
- **U-J2** (prenesené) — Twilio Messages idempotency, stále nedoložené.

---

## 8. Čo táto brána zámerne neurobila

Žiadna migrácia · žiadna schema change · žiadny application code · žiadna zmena runnera ·
žiadna migrácia agenta · žiadne UI · žiadny deploy · žiadny merge. Deväť read-only
SELECTov, nula zápisov.
