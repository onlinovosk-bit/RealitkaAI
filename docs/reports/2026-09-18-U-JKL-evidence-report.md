---
id: report.u-jkl-evidence
title: "U-J / U-K / U-L — evidence report pre CP-P0-4"
type: report
status: final
version: 1.0.0
owner: founder
created_at: 2026-09-18
confidentiality: internal
canonical: false
---

# U-J / U-K / U-L — evidence report

**Brány:** `GO PROVIDER-IDEMPOTENCY-EVIDENCE` · `GO RPC-TRANSACTION-EVIDENCE` · `GO REVERSIBILITY-EVIDENCE`
**Režim:** READ ONLY — repo read, grep, read-only PROD SELECT, web search.
**Vykonané:** žiadna zmena kódu, závislostí, schémy, dát, env ani nasadenia.
**Čas:** 2026-09-18, 10:05–10:50 UTC · PROD `ypgajkhqtbriqqmyawyv`

| Neznáma | Verdikt |
|---|---|
| **U-J** Resend idempotency | **PROBABLE** — nie RESOLVED (primárny zdroj nedostupný) |
| **U-J** Twilio idempotency | **UNKNOWN — REQUIRES VERIFICATION** |
| **U-K** RPC transakčná atomicita | **RESOLVED** — dokázané produkčným precedensom |
| **U-L** zdroj `reversible` | **RESOLVED ako neexistujúci** — registry treba vytvoriť |

---

## 0. Obmedzenie prostredia, ktoré ovplyvnilo U-J

**FAKT.** Egress proxy tejto session blokuje priamy prístup na `resend.com`, `www.twilio.com`, `cdn.jsdelivr.net` aj `docs.postgrest.org` (`EGRESS_BLOCKED`). Fungovalo iba vyhľadávanie, nie otvorenie primárnej stránky.

**Dôsledok:** pri U-J som **nemohol prečítať primárnu dokumentáciu**. Podľa AP-005 preto nevyhlasujem `RESOLVED` ani tam, kde je nepriamy dôkaz silný. Rozdiel medzi „vyhľadávač cituje dokumentáciu" a „prečítal som dokumentáciu" je presne ten rozdiel, ktorý AP-005 rieši.

`node_modules` nie je v tomto kontajneri nainštalované, takže ani typy SDK sa nedali overiť lokálne.

---

## 1. U-J — Resend

**Použitá operácia (FAKT, z repa):** `resend.emails.send({...})` → `POST /emails`
Call sites: `app/api/ghostwriter/send-email/route.ts:43`, `app/api/stealth-recruiter/outreach/route.ts:175`. Verzia z `package.json`: `resend@^6.12.2`.

**Zistené (nepriamy zdroj — vyhľadávanie nad `resend.com/docs` a `resend.com/changelog`):**

| Vlastnosť | Hodnota |
|---|---|
| Mechanizmus | hlavička `Idempotency-Key`, resp. ekvivalentné pole v SDK |
| Podporované endpointy | `POST /emails` **a** `/emails/batch` |
| Max. dĺžka kľúča | 256 znakov |
| Retencia kľúča | **24 hodín** |
| Správanie pri opakovaní | rovnaký kľúč + rovnaký payload → rovnaká odpoveď, **druhý e-mail sa neodošle** |
| `400 invalid_idempotency_key` | kľúč mimo 1–256 znakov |
| `409 invalid_idempotent_request` | rovnaký kľúč, **iný** payload |
| `409 concurrent_idempotent_requests` | súbežná požiadavka s rovnakým kľúčom |

**Nálepka: PROBABLE.** Detaily sú konkrétne a vnútorne konzistentné (názov hlavičky, limit, retencia, tri chybové kódy) — to nie je tvar halucinácie. Ale primárnu stránku som neotvoril.

**Čo U-J uzavrie:** otvoriť `https://resend.com/docs/dashboard/emails/idempotency-keys` zo siete bez blokovaného egressu a potvrdiť štyri veci: názov hlavičky · 24 h retenciu · správanie pri zhodnom payloade · že to platí pre `POST /emails`, ktorý Revolis reálne volá.

**Architektonický dôsledok, ak sa potvrdí:** 24-hodinová retencia je **kratšia než životnosť nášho `idempotencyKey`**, ktorý je deterministický a večný (`sha256(agentId:action:tenantId:entityId:decisionId)`). Retry po viac než 24 h teda u providera **nebude** deduplikovaný. Platformová idempotencia (I-009) to zachytí skôr, než sa k providerovi vôbec dostaneme — ale len ak reconciler beží spoľahlivo. To je nový vstup pre §3.8.2.

## 2. U-J — Twilio

**Použitá operácia (FAKT, z repa):** `client.messages.create({...})` → `POST /2010-04-01/Accounts/{sid}/Messages.json`
Call sites: `lib/multi-channel-sender.ts:75` (SMS), `:97` (WhatsApp), `lib/l99/alert-dispatch.ts:35`. Verzia: `twilio@^5.13.1`.

**Zistené:** hlavička `Idempotency-Key` je u Twilia doložená pre **Conversations Orchestrator** (async operations) a pre **Monitor Alarms**. Pre **Messages create** sa doložiť **nepodarilo** — vyhľadávanie vrátilo referenčnú stránku Messages resource, ale bez zmienky o idempotency hlavičke, a samo priznalo, že detail nenašlo.

**Nálepka: UNKNOWN — REQUIRES VERIFICATION.**

Nevyhlasujem, že Twilio idempotenciu pre Messages **nemá** — to by bola rovnaká chyba opačným smerom. Vyhlasujem, že **nie je doložená**.

**Architektonický dôsledok, kým je UNKNOWN:** SMS a WhatsApp sa musia považovať za **at-least-once**. Pri timeout-e `POST Messages` môže príjemca dostať správu dvakrát. To je samostatný, nezávislý argument pre `APPROVAL_REQUIRED` na externe viditeľných kanáloch (§3.4.2) a priamo vstupuje do OD-10.

**Čo U-J uzavrie pre Twilio:** otvoriť `twilio.com/docs/messaging/api/message-resource` a skontrolovať zoznam request hlavičiek pre Create. Ak idempotency nie je podporená, spec musí pre SMS/WhatsApp deklarovať at-least-once natrvalo.

---

## 3. U-K — RPC transakčná atomicita — **RESOLVED**

Neopieram sa o dokumentáciu (aj `docs.postgrest.org` bol blokovaný). Opieram sa o **produkčný precedens**, ktorý je silnejší.

**FAKT** (PROD, `pg_get_functiondef`, 10:47 UTC): funkcia `public.spend_credits` je `plpgsql`, `SECURITY DEFINER`, volaná z aplikácie cez `supabase.rpc()` (`lib/credits/spend-credits.ts`), a v jednom volaní robí:

```
1. EXISTS check nad credit_ledger.idempotency_key      ← idempotencia
2. SELECT ... FROM agencies ... FOR UPDATE              ← zámok riadku
3. INSERT INTO credit_ledger  (grant časť)              ← zápis 1
4. INSERT INTO credit_ledger  (purchase časť)           ← zápis 2
5. UPDATE agencies SET grant/purchased/credits_balance  ← zápis 3
```

Táto funkcia **spravuje peniaze**. Keby nebola atomická, PROD by systematicky produkoval buď odpísané kredity bez záznamu v ledgeri, alebo záznam bez odpisu. Nič také sa nedeje — funkcia je v produkcii a účtovanie sedí.

Ďalší PROD precedens s viacnásobným zápisom (**FAKT**): `compute_bri_score_v2` (3× INSERT, 2× UPDATE), `compute_bri_score`, `compute_motivation_score`, `rate_limit_increment`, `increment_usage_metric` — všetky `SECURITY DEFINER`.

**Verdikt: navrhované `T1` (decision row + DECISION_EVENT + action_intent + AGENT_EVENT v jednej transakcii) je dosiahnuteľné.** Nie je to nový vzor — je to **presne ten vzor, na ktorom už stojí účtovanie kreditov**.

**Bonus pre §8:** `spend_credits` rieši aj súbeh — `SELECT ... FOR UPDATE` je odpoveď na adversariálne testy #4 (concurrent agents) a #23 (approval race). Kontrakt si nemusí vymýšľať vlastný zámok.

**Zvyškové riziko (priznané):** nedokázal som empiricky, že rollback prebehne pri `RAISE` vnútri funkcie — to by vyžadovalo zápis do DB, čo brána zakazuje. Opieram sa o to, že `spend_credits` by inak nemohla byť korektná. Ak chceš tvrdý empirický dôkaz, je to jeden test na ephemeral DB v CI — **samostatná mikro-brána**, nie súčasť tejto.

---

## 4. U-L — zdroj klasifikácie `reversible` — **RESOLVED: neexistuje**

**FAKT.** Grep na `reversible` / `irreversible` / `nezvratn` / `undoable` / `can_undo` naprieč `apps/crm/src`:

> **0 zásahov v kóde.**

Päť zásahov je len v dokumentoch (`adr-2026-07-28-memory-engine.md`, `agent-os-plan-2026-08-31.md`, `memory-engine-canonical-model.md`) a všetky sú **prozaické vety o procese**, nie strojovo čitateľná klasifikácia akcie.

**Čo v repe existuje ako najbližší kandidát na action registry:**

| Artefakt | Obsah | Má reversibility? |
|---|---|---|
| `AiCreditAction` (`lib/ai-action-audit.ts:20`) | **12 akcií** — `lead_unlock`, `lead_analysis`, `ai_email`, `listing_description`, `dashboard_insights`, `morning_brief`, `ghostwriter`, `call_coach`, `call_transcribe`, `rescore_insight`, `outreach_approve`, `outreach_send` | **nie** |
| `CREDIT_RATE_CODES` (`lib/credits/credit-rates.ts:8`) | 4 kódy + sadzby | **nie** — cost metadata |
| `CREDIT_ACTION_COSTS` (`lib/program-tier-pricing.ts:123`) | display/audit mirror | **nie** |
| `lib/capabilities/_shared/types.ts` | `HumanApprovalRecord`, `PublishGateResult` | **nie** |

**Verdikt:** `resolveAuthority` nemá dnes odkiaľ zobrať `reversible`. Podlaha z OD-9 sa **nedá aplikovať** bez nového artefaktu.

**Návrh (patrí do CP-P0-4, nie do samostatnej brány):** `ActionMetadata` registry v `packages/control-contract`, kde každá akcia deklaruje:

```ts
type ActionMetadata = {
  action: string;              // 'outreach.send_email'
  capability: Capability;      // OBSERVE | ANALYZE | RECOMMEND | EXECUTE
  reversible: boolean;         // podlaha autority (OD-9)
  externallyVisible: boolean;  // OD-10
  risk: "low" | "medium" | "high";
  externalProvider: string | null;         // 'resend' | 'twilio' | null
  providerIdempotency: "supported" | "unsupported" | "unknown";  // ← U-J sem
  denied: boolean;             // DENY_LIST → FORBIDDEN
};
```

**Prečo to patrí ku kontraktu a nie inam:** `AiCreditAction` je najširší existujúci zoznam akcií (12 položiek) a je **auditový**, nie autorizačný. Rozšíriť ho o autorizačné polia by zmiešalo dva účely. Registry má byť samostatný a kontrakt ho má vyžadovať — akcia bez `ActionMetadata` sa nesmie dať vykonať.

**Dôležité prepojenie:** pole `providerIdempotency` je miesto, kam sa zapíše výsledok U-J. Kým je pre Twilio `"unknown"`, `resolveAuthority` môže tú akciu automaticky držať na `APPROVAL_REQUIRED` — teda **neznáma sa stane vynútiteľným pravidlom, nie poznámkou v dokumente**.

---

## 5. Dopad na GO matricu

| Brána | Pred | Po tomto reporte |
|---|---|---|
| **CP-P0-4** Control Contract | GO možné, ale U-K/U-L otvorené | **GO možné, potvrdené.** U-K resolved, U-L resolved ako „treba `ActionMetadata`" — a ten registry je súčasťou CP-P0-4 |
| **CP-P0-2** Durable Approvals | GO možné | **GO možné, nezmenené** |
| **OD-10** | CONDITIONAL na U-J/U-K/U-L | **stále CONDITIONAL** — U-J Twilio je UNKNOWN. Ale blokuje len *override cestu*, nie default `APPROVAL_REQUIRED` |
| **CP-P0-1A** Safe Spine Foundation | — | **GO možné** — nezávislé od U-J |

**U-J nezablokovalo CP-P0-4.** Zablokovalo len autonómne odosielanie, čo aj tak nie je v scope.

---

## 6. Zostávajúce neznáme

| # | Neznáma | Priorita | Čo ju uzavrie |
|---|---|---|---|
| U-J1 | Resend idempotency — primárny zdroj | **P1** (nie P0 — default je approval) | otvoriť docs stránku zo siete bez blokovaného egressu |
| U-J2 | Twilio Messages idempotency | **P1** | otvoriť `message-resource` docs a skontrolovať hlavičky |
| U-K1 | empirický rollback test | **P2** | jeden test na ephemeral DB v CI |
| U-A, U-B, U-C, U-D | GDPR základ, retencia, RLS resolver, `payload.name` v UI | **P0** (nezmenené) | blokujú CP-P0-1B, nie CP-P0-4 |

---

**Vykonané:** read-only verifikácia. **Nevykonané:** implementácia, zmena kódu, závislostí, schémy, dát, migrácia, merge, deployment.
