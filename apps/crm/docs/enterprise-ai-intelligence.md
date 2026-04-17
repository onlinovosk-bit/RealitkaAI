# Enterprise Sales Intelligence (Deal Moment · Risk · Client DNA · AI Actions)

## Cieľ

End-to-end pipeline: **udalosti leadu → skóre / riziko / DNA → odporúčaná akcia**, dostupné **iba pre plán Enterprise** (Stripe price `STRIPE_PRICE_ENTERPRISE`), s výnimkou lokálneho prepínača.

## Akceptačné kritériá

1. **Funkčne:** Tabuľky v Supabase, zápis výsledkov pri `POST /api/ai/process-lead`, čítanie zoznamu cez `GET /api/ai/insights`, voliteľný zápis udalostí cez `POST /api/ai/lead-events`.
2. **UX:** Panel na dashboarde (Enterprise), tlačidlo na detaile príležitosti; Realtime obnovenie panelu po novom `lead_events` (ak je Realtime zapnutý).
3. **Technicky:** RLS podľa `agency_id`, kontrola prístupu k leadu, čistý engine v `src/lib/ai/engine.ts` + unit testy.
4. **Testy:** `npm run test:unit` — `src/lib/ai/__tests__/engine.test.ts`.
5. **Deploy:** Migračný SQL súbor v `supabase/migrations/`.

## Nasadiť a overiť

1. **Supabase SQL Editor:** spusti `20260418_enterprise_ai_intelligence.sql` (alebo `supabase db push`).
2. **Realtime (voliteľné):** Database → Publications → `supabase_realtime` → pridať tabuľku `lead_events`.
3. **Vercel env:** `STRIPE_PRICE_ENTERPRISE` musí sedieť s aktívnym predplatným; voliteľne `ENTERPRISE_AI_INTELLIGENCE_DEV=1` len na neprodukčnom prostredí.
4. **Overenie URL (produkcia):**  
   - `GET https://<host>/api/billing/plan` → `enterpriseSalesIntelligence: true` pre Enterprise účet.  
   - `POST https://<host>/api/ai/process-lead` s `{ "leadId": "<id>" }` → `200` a teleso so `score`, `risk`, `action`.  
   - `GET https://<host>/api/ai/insights` → zoznam posledných akcií.

## Premenné prostredia

| Premenná | Popis |
|----------|--------|
| `STRIPE_PRICE_ENTERPRISE` | Stripe Price ID Enterprise plánu (gate). |
| `ENTERPRISE_AI_INTELLIGENCE_DEV` | Ak `1`, zapne Enterprise AI bez Stripe (iba dev/staging). |

Ďalšie štandardné: `NEXT_PUBLIC_SUPABASE_URL`, anon/publishable key (klient), session cookies (API).

## Test plán (manuálny)

1. Enterprise účet → dashboard zobrazí sekciu **AI Sales Intelligence**.
2. Pridaj udalosť: `POST /api/ai/lead-events` `{ "leadId", "type": "click" }`.
3. Spusti `POST /api/ai/process-lead` — v DB pribudnú riadky v `lead_scores`, `deal_risk`, `client_dna`, prípadne `deal_moments`, `ai_actions`.
4. Over zmenu skóre pri viacerých udalostiach.

## Rollback

1. Odstrániť env `ENTERPRISE_AI_INTELLIGENCE_DEV` na dev.
2. API vráti `403` pre ne-Enterprise (žiadne mazanie kódu).
3. Dáta: `drop table` v opačnom poradí (najprv závislé), alebo ponechať tabuľky a len vypnúť feature — bezpečnejšie je ponechať dáta a vypnúť prístup cez plán.

## Riziká (mitigované v migrácii `20260419_enterprise_rls_profile_link.sql`)

- **RLS:** funkcia `profile_agencies_for_auth()` mapuje tenant cez `profiles.auth_user_id = auth.uid()` **alebo** `profiles.id = auth.uid()` (bežný Supabase vzor). Stĺpec `auth_user_id` sa pridá, ak chýba.
- **Realtime:** migrácia idempotentne pridá `lead_events` do `supabase_realtime`, ak publikácia existuje.

## Súbory (orientačné)

- Engine: `src/lib/ai/engine.ts`
- Persistencia: `src/lib/db/enterprise-intelligence-store.ts`
- Gate: `src/lib/enterprise-sales-intelligence-gate.ts`
- API: `src/app/api/ai/process-lead`, `insights`, `lead-events`
- UI: `EnterpriseSalesIntelligencePanel`, `EnterpriseAiProcessButton`
- Realtime helper: `src/lib/realtime/enterprise-lead-events.ts`
