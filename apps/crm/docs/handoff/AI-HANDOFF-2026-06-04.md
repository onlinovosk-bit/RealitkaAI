# AI Handoff — Revolis CRM (Smolko triáž + /leads UI)

**Dátum:** 2026-06-04  
**Účel:** Plnohodnotné pokračovanie pre inú AI / novú session.  
**Repo:** `C:\RealitkaAI` (GitHub: `onlinovosk-bit/RealitkaAI`)  
**Produkcia:** `https://app.revolis.ai`  
**Vercel projekt:** `realitka-ai` (team `onlinovosk-4317s-projects`)

---

## 1. Kontext a priorita (CRO/CPO)

**Čo je hotové a prečo to bolo #1 priorita**

Maklér rozhoduje na `/leads`, koho volať. Pred fixom:
- DB mala 439 leadov s `ai_priority='Nízka'` (triáž OK),
- UI ukazovalo `Score 0/100`, `Avg BRI 0`, a sekcia „Kto je pripravený kúpiť dnes“ padala na náhodných leadov so statusom `Nový` → text „Kontaktuj do 2 hodín“ = **falošná urgencia**.

**Triáž nie je DONE, kým ju maklér nevidí správne.** Kódová časť je zmergovaná (#107); ostáva **prod smoke** po Vercel deployi.

**Čo NIE JE priorita teraz:** Plánovaná stavba, Deal Acceleration implementácia (len špec), nové moduly — až po uzavretí triáže + smoke.

---

## 2. Tenant Reality Smolko (produkčné fakty)

| Kľúč | Hodnota |
|------|---------|
| `TRIAGE_AGENCY_ID` | `11111111-1111-1111-1111-111111111111` |
| Názov | Reality Smolko s.r.o. |
| slug | `reality-smolko` |
| Leads celkom | **439** |
| `status_imported` | **0** (migrácia + import fix) |
| `untriaged_open` (po cron) | **0** |
| `ai_priority` po triáži | **Nízka** na všetkých importovaných |
| `ai_reason` typicky | „Import alebo lead bez kontextu… — nízka priorita…“ |

**Skript na overenie:**
```bash
cd apps/crm
npx tsx scripts/resolve-smolko-agency-id.ts
```

**Účty na smoke (staging/prod):** `office@realitysmolko.sk`, `rastislav.smolko@gmail.com` — profil musí mať `agency_id` = Smolko UUID.

---

## 3. Zmergované PR (stav `main` k 2026-06-04)

| PR | Názov | Stav | Čo rieši |
|----|-------|------|----------|
| **#106** | lead AI triáž — imported → Nový + backfill | MERGED | Import `status: "Nový"`, migrácia `imported→Nový`, cron `ai_triage_at IS NULL`, sparse heuristic → Nízka |
| **#107** | zarovnanie /leads s AI triážou | MERGED | UI: `getLeadDisplayScore`, bez falošnej urgencie, `ai_reason` v zozname |
| **#104** | Vlna 0.1 cleanup UI | MERGED | Odstránenie L99 žargónu, falošných modulov, hub cards |
| **#105** | forecasting — demo Kováč/Poláková | **OPEN** | `ForecastRiskStrip` bez hardcoded mien — **ešte nie v main** |

**Posledný commit na `main`:** `fefef7f` — Merge PR #107

---

## 4. Architektúra triáže (backend)

### Cron endpoint
- **URL:** `GET /api/cron/lead-ai-triage`
- **Auth:** `Authorization: Bearer $CRON_SECRET`
- **Súbor:** `apps/crm/src/app/api/cron/lead-ai-triage/route.ts`

### Čo cron zapisuje
| Stĺpec | Áno |
|--------|-----|
| `ai_priority` | Áno (`Vysoká` / `Stredná` / `Nízka`) |
| `ai_reason` | Áno (SK) |
| `ai_triage_at` | Áno |
| `score` | **Nie** |
| `buyer_readiness_score` | **Nie** |

### Env (Vercel Production)
| Premenná | Odporúčaná hodnota | Poznámka |
|----------|-------------------|----------|
| `CRON_SECRET` | *(rotovať — bol v chate)* | Lokálny `.env.local` ≠ prod |
| `TRIAGE_AGENCY_ID` | `11111111-1111-1111-1111-111111111111` | Voliteľné; bez neho globálny cron |
| `TRIAGE_LEAD_LIMIT` | `500` | Default 200 |

**Posledné prod cron behy (pred #107 deploy):**
- 2× `processed: 200`, `agency_filter: null` (env ešte nebol v deployi)
- 1× `processed: 39` → spolu ~439 Smolko leadov triážovaných
- `resolve-smolko-agency-id.ts` → `untriaged_open=0`

```powershell
$secret = "<CRON_SECRET_Z_VERCEL>"
curl.exe -sS -H "Authorization: Bearer $secret" "https://app.revolis.ai/api/cron/lead-ai-triage"
# Očakávané po backfill: processed: 0
```

### Kľúčové súbory (backend)
- `apps/crm/src/lib/import/contacts-import-core.ts` — nové importy `status: "Nový"`
- `apps/crm/supabase/migrations/20260604120000_leads_imported_to_novy.sql`
- `apps/crm/src/lib/ai/lead-triage-batch.ts` — `isSparseImportLead`, heuristic Nízka
- `apps/crm/scripts/resolve-smolko-agency-id.ts`

---

## 5. Architektúra UI (/leads) — po #107

### Jeden zdroj pravdy pre zobrazenie skóre
**Súbor:** `apps/crm/src/lib/leads/lead-display-score.ts`

```
getLeadDisplayScore(lead):
  1. buyer_readiness_score (ak existuje)
  2. leads.score (ak > 0)
  3. po triáži: ai_priority → Vysoká=85, Stredná=55, Nízka=22
  4. inak 0
```

| Funkcia | Účel |
|---------|------|
| `isSparseQualificationLead` | Triáž Nízka + import bez kontaktu |
| `isLeadHot` | KPI Horúce + filter badge (nie Nízka import) |
| `isLeadBuyerReadyToday` | Strip „Kto je pripravený kúpiť dnes“ |

### Zmenené komponenty
| Súbor | Zmena |
|-------|-------|
| `components/leads/lead-table.tsx` | Score z `getLeadDisplayScore`, `ai_priority` + `ai_reason` |
| `components/leads/LeadCardMobile.tsx` | To isté (mobile) |
| `components/leads/LeadsHotStrip.tsx` | Žiadny fallback na všetkých leadov; úprimný prázdny text |
| `components/leads/leads-module.tsx` | Avg BRI + Horúce cez helper |
| `components/leads/lead-filters.tsx` | `hotCount` cez `isLeadHot` |
| `lib/workdesk/executive-signals.ts` | Sort/confidence cez `getLeadDisplayScore` |

### Testy
```bash
cd apps/crm
npx vitest run src/lib/leads/__tests__/lead-display-score.test.ts
```

### Očakávané UI po deployi #107 (Smolko, 439× Nízka)
| Prvok | Hodnota |
|-------|---------|
| Score v tabuľke | **22/100 · Nízka** |
| Avg BRI | **~22** |
| Horúce (KPI + badge) | **0** |
| „Kto je pripravený kúpiť dnes“ | Úprimný text (žiadne „Kontaktuj do 2 hodín“) |
| `ai_reason` | Viditeľný pod skóre |

### Diagnóza PRED fixom (pre referenciu)
| UI | Čítalo | Súbor:riadok (pred #107) |
|----|--------|--------------------------|
| Score | `lead.score` (DB 0) | `lead-table.tsx` ~179–180 |
| Avg BRI | `lead.score` | `leads-module.tsx` ~50–54 |
| Horúce KPI | len `status === "Horúci"` | `leads-module.tsx` ~107 |
| Horúce badge | `status Horúci \|\| score >= 85` | `lead-filters.tsx` ~113 |
| Hot strip | `score >= 75`, fallback **všetci** → `getNextBestAction(Nový)` | `LeadsHotStrip.tsx` ~16–22, `ai-engine.ts` ~96 |

---

## 6. Smoke checklist (ďalší AI — vykonaj po deployi)

### Infra (bez auth)
- [ ] `GET https://app.revolis.ai/` → 200
- [ ] `GET /api/cron/lead-ai-triage` bez Bearer → **401**

### S prihlásením (Smolko)
- [ ] `GET /api/crm/tenant-health` → `counts.leads` ≥ 439
- [ ] `/leads` — Avg BRI ~22, Horúce 0, strip úprimný, `ai_reason` v tabuľke
- [ ] Dashboard **Dnešných 10** — používa `ai_priority` (`TodaysTenLeads.tsx`)
- [ ] `/forecasting` — po merge **#105**: bez Kováč/Poláková

### SQL (Supabase)
```sql
SELECT status, COUNT(*) FROM leads
WHERE agency_id = '11111111-1111-1111-1111-111111111111' GROUP BY status;

SELECT ai_priority, COUNT(*) FROM leads
WHERE agency_id = '11111111-1111-1111-1111-111111111111'
GROUP BY ai_priority;

SELECT COUNT(*) FROM leads
WHERE agency_id = '11111111-1111-1111-1111-111111111111' AND ai_triage_at IS NULL;
-- Očakávané: 0
```

**Detailný runbook:** `apps/crm/docs/qa/staging-smoke-smolko-triage-2026-06-04.md`  
**Triáž runbook:** `apps/crm/docs/qa/lead-ai-triage-verification-runbook.md` (ak existuje)

---

## 7. Otvorené úlohy (prioritný backlog)

### P0 — uzavrieť triáž
1. **Prod smoke `/leads`** po Vercel Production deploy z `fefef7f` (#107)
2. **Rotovať `CRON_SECRET`** (bol zdieľaný v chate)
3. Overiť migrácia `20260604120000` na prod Supabase (ak ešte nie)

### P1 — paralelné PR
4. **Merge PR #105** (forecasting demo strip) → preview + merge
5. Auth smoke: tenant-health, dashboard, forecasting

### P2 — až po P0/P1
6. **Deal Acceleration V1** — len po schválení špecu: `apps/crm/docs/strategy/deal-acceleration-engine-v2-spec.md` (audit only, žiadny kód)
7. Onboarding fix (B+A)
8. Recruiting / Plánovaná stavba — gate: `portal_listings` ingest
9. Vlna 0.1 hub — ďalšie karty ak treba (#104 už merged)

---

## 8. L99 pravidlá (povinné)

- **1 PR = 1 logická zmena**, vlastný Vercel Preview
- Merge do `main` len po **zelenom CI** + smoke
- **Scoped commity** — žiadne `git add -A`
- Commit len na výzvu používateľa
- Pri deploy regresii: `git bisect` + `npm run build`
- Uzávierka každej úlohy: čo zmenené · čo overené · čo rizikové

**Kanonické docs:**
- `apps/crm/docs/L99-master-prompt.md`
- `.cursor/rules/l99-*.mdc`
- `CLAUDE.md` + `/memory`

---

## 9. Git stav (lokálne k handoffu)

- **Remote `main`:** `fefef7f` (PR #107 merged)
- **Lokálna vetva:** môže byť `fix/lead-ai-triage-imported-backfill` (už zmergovaná)
- **Necommitnuté typicky:** `apps/crm/error-capture.log`, untracked `.pr-*.md`, `claude-agent.json`
- **Stash:** `stash@{0}` môže obsahovať dočasný stash `error-capture.log` z rebase pred push #107

**Sync:**
```bash
git fetch origin
git checkout main
git pull origin main
```

---

## 10. Súvisiace dokumenty v repe

| Cesta | Obsah |
|-------|-------|
| `apps/crm/docs/qa/staging-smoke-smolko-triage-2026-06-04.md` | Smoke + Vercel env + curl |
| `apps/crm/docs/strategy/deal-acceleration-engine-v2-spec.md` | Špec V2 (bez implementácie) |
| `apps/crm/docs/strategy/recruiting-modul-brief-2026-06-03.md` | Recruiting brief |
| `apps/crm/src/lib/leads/lead-display-score.ts` | UI zdroj pravdy skóre |
| `apps/crm/src/components/dashboard/TodaysTenLeads.tsx` | Dashboard — už `ai_priority` |

---

## 11. Rozhodnutia (nemeniť bez dôvodu)

1. **UI mapuje `ai_priority` → display score** namiesto zápisu do `leads.score` pri cron — 439 leadov už triážovaných bez DB backfillu skóre.
2. **Nízka = 22 BRI** — nie 0 (maklér vidí, že systém hodnotil), nie horúci.
3. **Horúce = 0 pri 439× Nízka je správne** — strip musí byť prázdny/úprimný, nie urgentný.
4. **Dashboard Dnešných 10** a **/leads** môžu používať rôzne komponenty, ale obe majú rešpektovať `ai_priority` / `getLeadDisplayScore`.

---

## 12. Jednovetný „ďalší krok“ pre novú AI

> Počkaj na Vercel Production deploy `fefef7f`, spusti smoke na `https://app.revolis.ai/leads` (Smolko účet): over Avg BRI ~22, Horúce 0, úprimný hot strip, `ai_reason` viditeľný; ak pass → označ triáž **DONE**, merge **#105**, rotuj `CRON_SECRET`.

---

*Vygenerované: 2026-06-04 — session handoff pred prechodom na inú AI.*
