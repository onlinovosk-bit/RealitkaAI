# Staging / produkčný smoke — Smolko + triáž backfill

**Dátum:** 2026-06-04  
**Cieľ:** Overiť deploy, tenant dáta a pripraviť Vercel env pred spustením `lead-ai-triage` cron.

---

## 1. Smolko `TRIAGE_AGENCY_ID` (runtime dôkaz)

Spusti lokálne (service role z `apps/crm/.env.local`):

```bash
cd apps/crm
npx tsx scripts/resolve-smolko-agency-id.ts
```

**Výsledok z produkčnej DB (2026-06-04):**

| Premenná | Hodnota |
|----------|---------|
| `TRIAGE_AGENCY_ID` | `11111111-1111-1111-1111-111111111111` |
| Názov agentúry | Reality Smolko s.r.o. |
| slug | `reality-smolko` |
| `leads_total` (agency) | **439** |
| `status_imported` | **0** (stav už zladený alebo migrácia aplikovaná) |
| `untriaged_open` | **439** (čakajú na cron) |

---

## 2. Vercel — kde nastaviť env

1. [Vercel Dashboard](https://vercel.com) → projekt **realitka-ai** (alebo názov vášho CRM deployu).
2. **Settings → Environment Variables**.
3. Pridaj pre **Production** aj **Preview** (ak backfill ide cez preview):

| Name | Value | Poznámka |
|------|-------|----------|
| `TRIAGE_AGENCY_ID` | `11111111-1111-1111-1111-111111111111` | len Smolko RK |
| `TRIAGE_LEAD_LIMIT` | `500` | jeden beh pokryje 439 leadov |
| `CRON_SECRET` | *(už musí existovať)* | Bearer pre cron |

4. **Redeploy** Production (alebo počkaj na auto-deploy po merge PR #106).
5. Po backfill môžeš `TRIAGE_AGENCY_ID` odstrániť alebo nechať — cron bez filtra triážuje všetkých tenantov (limit 200 default).

---

## 3. Smoke checklist (bez auth = len infra)

| Kontrola | Očakávanie | Stav 2026-06-04 |
|----------|------------|-----------------|
| `GET https://app.revolis.ai/` | 200 | OK |
| `GET /login` | 200 | OK |
| `GET /forecasting` | 200 | OK |
| `GET /status` | 200 | OK |
| `GET /api/cron/lead-ai-triage` bez Bearer | **401** (nie 500) | OK |

---

## 4. Smoke s prihlásením (staging / prod účet Smolko)

**Predpoklad:** účet `office@realitysmolko.sk` alebo `rastislav.smolko@gmail.com`, profil s `auth_user_id` prepojeným (#100/#101).

| # | Kroky | Pass kritérium |
|---|--------|----------------|
| 1 | Prihlásenie na `https://app.revolis.ai` | Dashboard načíta |
| 2 | DevTools → `GET /api/crm/tenant-health` | `counts.leads` ≥ 439, `profileAgencyId` = Smolko UUID |
| 3 | `/leads` alebo `/contacts` | Zoznam ≈ tenant-health |
| 4 | `/forecasting` | Horná karta **bez** Kováč/Poláková (po merge PR #105); KPI z reálnych leadov |
| 5 | Dashboard → **Dnešných 10** | Po cron triáži: `ai_priority` / `ai_reason` na leadoch |

---

## 5. Spustenie triáže po deployi PR #106

1. Supabase: migrácia `20260604120000_leads_imported_to_novy.sql` (ak ešte nie).
2. Vercel env podľa sekcie 2.
3. Cron (nahraď `CRON_SECRET`):

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://app.revolis.ai/api/cron/lead-ai-triage"
```

Očakávaná odpoveď (orientačne):

```json
{
  "ok": true,
  "processed": 439,
  "updated": 439,
  "heuristic_only": 439,
  "agency_filter": "11111111-1111-1111-1111-111111111111"
}
```

4. SQL kontrola:

```sql
SELECT status, COUNT(*) FROM leads WHERE agency_id = '11111111-1111-1111-1111-111111111111' GROUP BY status;
SELECT COUNT(*) FROM leads WHERE agency_id = '11111111-1111-1111-1111-111111111111' AND ai_triage_at IS NOT NULL;
```

---

## 6. Playwright smoke (lokálne / CI)

```bash
cd apps/crm
# vyžaduje auth setup alebo E2E_BYPASS_AUTH
npx playwright test tests/smoke.spec.ts
```

Poznámka: route smoke bez session preskočí dashboard testy (redirect na `/login`).

---

## 7. Otvorené riziká

- **Staging URL:** ak používate oddelený preview (`*.vercel.app`), opakuj checklist na tej URL po merge.
- **Forecasting demo:** PR #105 musí byť v deployi pred vizuálnym smoke forecasting.
- **Triáž ≠ horúci v UI:** zoznam „horúcich“ môže stále čítať `status`/`score`, nie len `ai_priority` — over po backfill v `/leads`.
