# Revolis.AI — 8‑vrstvová referenčná architektúra

Toto je **orientačný rámec** (north star), nie rigidná štruktúra repozitára. Používame ho na:
- rýchle odhalenie „gapu“ medzi produktom a infra,
- priradenie ownershipu,
- dohľadateľnosť: *kde v kode je čo implementované*.

## 1) Knowledge Layer (firemná pamäť)
- **Úloha**: kanonická pamäť firmy (produkty, klienti, playbooky, incidenty), vyhľadávanie a citácie.
- **Dnes v repo**: `apps/crm/docs/` (runbooky, incidenty), čiastočne `apps/crm/src/lib/ai/*` (prompty/heuristiky).
- **Gap**: jednotné „knowledge store“ (napr. vektorové indexy + kontrola zdrojov pravdy + privacy).
- **Rozhrania**: (navrhnúť) `kb.search()`, `kb.upsert()`, audit log citácií.

## 2) Agent Layer (AI pracovníci)
- **Úloha**: autonómne jednotky (asistent, scoring, decision ops, outreach, support).
- **Dnes v repo**: `apps/crm/src/app/api/ai/**`, `apps/crm/src/lib/ai/**`.
- **Riziká**: feature‑flag gating, bezpečné promptovanie, deterministické fallbacky.

## 3) Workflow Layer (automatizácie)
- **Úloha**: orchestrácia krokov (cron, queue, retries, idempotencia, replay).
- **Dnes v repo**: `apps/crm/src/app/api/cron/**`, Realvia queue worker `apps/crm/src/lib/realvia/processQueue.ts`.
- **Riziká**: silent fails, chýbajúce replay tooling, chýbajúce metriky/SLO.

## 4) CRM/Data Layer (zákaznícke dáta)
- **Úloha**: zdroj pravdy o lead‑och, properties, aktivitách, tímoch, billing.
- **Dnes v repo**: Supabase schéma + stores (`apps/crm/src/lib/*-store.ts`).
- **Riziká**: RLS/session na serveri, data integrity, multi‑tenant izolácia.

## 5) Communication Layer (email/calls/chat)
- **Úloha**: kanály (email, telco, WhatsApp, chat), ingest + outbound.
- **Dnes v repo**: `packages/mcp-*` (telephony/calendar/comm), IMAP/Twilio integrácie v `apps/crm`.
- **Riziká**: rate limits, deliverability, audit trail + GDPR.

## 6) Marketing Layer (content + ads)
- **Úloha**: landing, obsah, kampane, prepojenie na produktové CTA.
- **Dnes v repo**: `apps/marketing`, časti v `apps/crm/src/app/(marketing)/**`.
- **Riziká**: konzistentná brand terminológia, meranie konverzií, rýchle experimenty bez zásahu do CRM.

## 7) Analytics Layer (reporting + intelligence)
- **Úloha**: reporting, KPI, pipeline intelligence, attribution.
- **Dnes v repo**: mix telemetry/report modulov (dopĺňať podľa reality).
- **Gap**: kanonické eventy + dashboardy + „source of truth“ pre výpočty.

## 8) Infrastructure Layer (deploy + stabilita)
- **Úloha**: CI/CD, observability, bezpečnosť, incident response, rollout.
- **Dnes v repo**: Vercel/Supabase konfigurácie, CI workflow, runbooky v `apps/crm/docs/`.
- **Riziká**: build determinismus, tajomstvá, staging/prod parity.

---

## Ako to používať v praxi (minimálne pravidlá)
- **Pri každom P0/P1**: uveď, ktorých vrstiev sa incident týka a čo je rollback.
- **Pri každom PR**: 1–2 vrstvy, ktoré sa menia; ostatné nechaj nedotknuté.
- **Pri každom veľkom „nápade“**: doplň 1 riadok „kde to bude žiť v repo“ a „aké API to má“.

