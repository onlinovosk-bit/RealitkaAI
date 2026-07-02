# Reality Smolko — Ops Runbook

**Tenant:** Reality Smolko / Rastislav Smolko  
**Agency ID:** `11111111-1111-1111-1111-111111111111`  
**Produkcia:** https://app.revolis.ai  
**Posledná revízia:** 2026-06-08 (ops skripty + runtime overenie)

Operačný checklist pre podporu, deploy a incident triáž. Žiadne zmeny kódu v tomto dokumente — len postupy overené v audite a smoke testoch.

---

## 1. Prod SQL — ešte treba aplikovať

### 1a. Migrácia `manual_plan`

Súbor: `apps/crm/supabase/migrations/20260607210500_agencies_manual_plan.sql`

Spustiť na **produkčnej** Supabase (SQL Editor alebo `supabase db push` podľa vášho deploy procesu):

```sql
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS manual_plan text;

COMMENT ON COLUMN public.agencies.manual_plan IS
  'Plan key when billing_source is manual_invoice (starter|pro|scale|market_vision|free). Used when stripe subscription absent.';

CREATE INDEX IF NOT EXISTS agencies_manual_plan_idx
  ON public.agencies (manual_plan)
  WHERE manual_plan IS NOT NULL;
```

### 1b. Smolko UPDATE (po migrácii)

Smolko nemá Stripe subscription — plán sa mapuje cez `manual_plan` pri `billing_source = manual_invoice`:

```sql
UPDATE public.agencies
SET manual_plan = 'market_vision'
WHERE id = '11111111-1111-1111-1111-111111111111';
```

### Poznámky

- Kód číta `manual_plan` v sidebar, `/api/billing/plan` (#122, #126 — merged).
- **Runtime 2026-06-08:** `manual_plan = market_vision` na prod overené cez `npm run ops:tenant-health`.
- Povolené hodnoty `manual_plan`: `starter` | `pro` | `scale` | `market_vision` | `free`.

---

## 2. Skóre v UI — **—** (nie 22/100)

Zdroj: `docs/LEADS-SCORE-AUDIT.md` + fix #123, #127 (merged).

| Metrika | Hodnota (2026-06-08) |
|---------|----------------------|
| Celkový počet leadov | **439** |
| DB `score` | **0** na všetkých (pred backfillom) |
| DB `ai_priority` | **„Nízka"** na všetkých (W1 triáž po importe) |
| UI zobrazené skóre | **—** + tooltip pre sparse import leady |

**Support:**

- **—** znamená „ešte nekvalifikovaný import", nie BRI ani buyer intent.
- `budget`, `buyer_readiness_score` sú prázdne na 100 % leadov.
- Horúci lead badge je blokovaný cez `isSparseQualificationLead()`.

**Po doplnení údajov:** `POST /api/scoring/recalculate` (nie legacy `/api/scoring` — 410).

### 2b. Ops skripty (lokálne, service role)

Vyžaduje `apps/crm/.env.local` s `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

```bash
cd apps/crm

# Readonly health (Smolko default agency)
npm run ops:tenant-health

# Dry-run heuristického backfillu leads.score (načíta aj lead_property_matches)
npm run ops:backfill-scoring

# Zápis po review (batch)
npx tsx scripts/backfill-tenant-scoring.ts --apply --limit 50
```

**Poznámka k backfillu:** Bez matchov dáva heuristika 0 (penalizácia „bez matchingu"). Skript načítava `lead_property_matches` pre tenant leady — inak `would update: 0`.

---

## 3. Zero-data incident checklist

Použiť, keď kokpit / nehnuteľnosti / leads / úlohy ukazujú **0**, ale v Supabase dáta sú.

Podrobný audit: `docs/incidents/crm-zero-data-audit.md`, leads/contacts: `docs/qa/contacts-leads-zero-data.md`.

### Rýchla triáž

| Krok | Akcia | Očakávanie |
|------|-------|------------|
| 1 | Prihlásenie ako Smolko owner | **`rastislav.smolko@gmail.com`** (primárne); `office@realitysmolko.sk` profil v DB nemusí existovať |
| 2 | `GET /api/crm/tenant-health` | `snapshot.counts.*` > 0 ak DB má dáta |
| 3 | Skontrolovať `profileAgencyId` | Musí byť `11111111-1111-1111-1111-111111111111` |
| 4 | Ak `counts.leads: 0` | **Nie sú to UI filtre** — RLS nevidí agentúru |
| 5 | Overiť `profiles.auth_user_id` | Prázdne → RLS vráti 0 riadkov |

### Root cause (auth_user_id)

`profile_agencies_for_auth()` vracia `agency_id` len ak:

- `profiles.auth_user_id = auth.uid()`, **alebo**
- `profiles.id = auth.uid()` (legacy).

Prod owner profil je pod **`rastislav.smolko@gmail.com`** (`agency_id` = Smolko UUID, `auth_user_id` musí byť vyplnené). Ak **`auth_user_id` je prázdne** → RLS vráti 0 leadov.

**Náprava (automatická v kóde):** `linkProfileToAuthUser()` sa volá pri prihlásení, layoute, `/api/leads/inventory` a **`/api/crm/tenant-health`**. Po oprave znova načítať tenant-health.

### Ďalšie príčiny (historické, väčšinou na main opravené)

- RSC bez session cookies — store vrstvy musia ísť cez `resolveTenantSupabase()` (`docs/incidents/crm-zero-data-audit.md`).
- Kokpit **AI Priority Strip** pri 0 leadoch môže ukazovať **demo mená** — nie živú DB.

### Filtre vs. skutočné zero-data

Platí **iba ak** `tenant-health` → `counts.leads` > 0, ale UI = 0:

- Banner „Filtre skryli…", Min. BRI filter.
- `/contacts` → **Vymazať filtre**.

---

## 4. Verification steps (smoke)

### 4a. Tenant health API

```http
GET https://app.revolis.ai/api/crm/tenant-health
```

(Po prihlásení v tom istom prehliadači — endpoint vyžaduje session cookie.)

**Očakávaná štruktúra odpovede:**

```json
{
  "snapshot": {
    "userId": "<uuid>",
    "profileAgencyId": "11111111-1111-1111-1111-111111111111",
    "counts": {
      "properties": "> 0",
      "leads": 439,
      "tasks": "≥ 0",
      "activities": "≥ 0",
      "leadPropertyMatches": "≥ 0"
    }
  }
}
```

### 4b. Leads count — baseline 439

Overené v prod smoke (`docs/qa/prod-smoke-2026-06-05.md`):

| Kontrola | Očakávanie |
|----------|------------|
| DB / tenant-health `counts.leads` | **439** |
| `/leads` zoznam (po vymazaní filtrov) | **439** príležitostí |
| `/contacts` (Moji klienti) | rovnaký počet ako `/leads` |
| Triáž stav | `untriaged_open = 0`, `status_imported = 0` |

### 4c. SQL referenčný dotaz (service role / SQL Editor)

```sql
SELECT COUNT(*) AS leads_total
FROM public.leads
WHERE agency_id = '11111111-1111-1111-1111-111111111111';
-- Očakávanie: 439
```

### 4d. UI smoke (3 min)

1. `/dashboard` — widgety nie sú prázdne (ak tenant-health > 0).
2. `/properties` — počet zhodný s `counts.properties`.
3. `/leads` — 439, bez aktívnych filtrov.
4. Iniciály v hlavičke z `full_name` alebo e-mailu (nie vždy „RV").

### 4e. CI (pred merge akéhokoľvek Smolko fixu)

```bash
cd apps/crm
npm run build
npm run test
npx playwright test --project=smoke
```

### 4f. Prod smoke (bez lokálneho dev servera)

```bash
cd apps/crm
$env:PLAYWRIGHT_SKIP_WEBSERVER="1"
$env:NEXT_PUBLIC_SITE_URL="https://app.revolis.ai"
npx playwright test --project=smoke
```

Cron testy s `CRON_SECRET` sa preskočia, ak secret v env chýba.

---

## 5. Čo NEMERGOVAŤ

| PR | Názov | Dôvod |
|----|-------|-------|
| [#30](https://github.com/onlinovosk-bit/RealitkaAI/pull/30) | fix(crm): unify Protocol Authority plan display for Smolko | **TOUCH-GUARD** — billing / plan display; 23 súborov; vyžaduje manuálny review, nie bulk merge. Po aplikovaní prod SQL (`manual_plan`) overiť, či je PR vôbec ešte potrebný. |
| [#72](https://github.com/onlinovosk-bit/RealitkaAI/pull/72) | Stealth Recruiter production | **Bez explicitného produktového schválenia** — security + product sign-off; demo režim, cron mimo `vercel.json`. Pozri `docs/strategy/orchestrator-task-board.md`. |

**Všeobecné pravidlo:** Nespájať Slate stack #14–#30 sekvenčne. Smolko P0 = stabilná dáta + tenant-health + prod SQL; nie experimentálny billing UI ani stealth ingest.

---

## Súvisiace dokumenty

| Dokument | Obsah |
|----------|-------|
| `docs/LEADS-SCORE-AUDIT.md` | 22/100 display audit |
| `docs/incidents/crm-zero-data-audit.md` | RLS / session root cause |
| `docs/qa/contacts-leads-zero-data.md` | Leads/contacts zero-data |
| `docs/qa/prod-smoke-2026-06-05.md` | Baseline 439 leadov |
| `docs/PR-TRIAGE-MATRIX.md` | #30 TOUCH-GUARD detail |
| `supabase/migrations/20260607210500_agencies_manual_plan.sql` | Prod SQL migrácia |

---

## Rollback

- **SQL `manual_plan`:** `UPDATE agencies SET manual_plan = NULL WHERE id = '...'` — obnoví predchádzajúce správanie plánu (závisí od `saas-ops` override).
- **Zero-data:** žiadna DB zmena — overiť session, `auth_user_id` link, redeploy `main` s fixom resolve client.
