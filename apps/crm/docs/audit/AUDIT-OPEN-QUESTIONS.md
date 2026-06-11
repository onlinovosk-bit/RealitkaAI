# Audit — otvorené otázky (Audit 1.0 → rozhodnutia Andyho)

**Aktualizované:** 2026-06-10  
**Baseline:** `origin/main` po #161 (CI allowlist) + #162/#163 (routines)

---

## Rozhodnuté (case closed)

### Stealth Recruiter — vetva B potvrdená

**Forenzný záver:** Tabuľka `stealth_recruiter_prospects` je v prod **prázdna** (0 riadkov). Kill-switch alebo májový cleanup — žiadny nový incident.

**Handler audit (kód):** Cron `stealth-recruiter-ingest` zapisuje **výhradne** do `stealth_recruiter_prospects`:

- `route.ts:66-69` — `select` z `stealth_recruiter_prospects`
- `route.ts:83-85` — `upsert` do `stealth_recruiter_prospects`
- `ingest-presov.ts` — len mapovanie RSS → riadky, **žiadny** DB insert do inej tabuľky

**Akcia:** PR odregistrovať cron z `vercel.json` + CI grep guard (strojové vynútenie).

### #8 Stealth cron

**Rozhodnutie:** Odstrániť z `vercel.json` do legal clearance + CI guard. Tabuľka prázdna.

### #6 TRACK-D/E enforced vs wired

**Klasifikácia:** **wired, not enforced.** Enforcement = samostatný task (odstránenie `canUseFullApp = true`).

### #9 Decision Engine default

**Rozhodnutie:** Zlý pattern — zmeniť na **opt-in** (`=== 'true'`) + explicitné env vo Vercel. Task Vlna 1.

### #10 #158/#159

**Stav:** Čisté re-PR #162 + #163 na `main` — merged (`8356e1d`).

### #11 CI allowlist

**Stav:** #161 **MERGED** na main.

### #15 Seller Rescue deploy timing

**Rozhodnutie:** Po CI fixe; feature flag default OFF; nepúšťať cron nad prod v ten istý deň ako enforcement zmeny.

### #16 Arbitrage

**Rozhodnutie:** Skryť z navigácie POST-V1; zvážiť pauzu `arbitrage-scan` cronu.

**W1 quick-wins (#fix/w1-quick-wins-bundle):** `/arbitrage` odstránené z `navigation.ts` + `types/navigation.ts` (route `/arbitrage` ostáva pre deep link).

**Návrh pre Andyho (NEMENIŤ vercel.json v tomto PR):** `arbitrage-scan` (`0 3 * * *` v `apps/crm/vercel.json`) beží nad prázdnou `portal_listings` tabuľkou — zvážiť dočasné odstránenie cron riadku alebo pauzu, kým nebude feed bridge (POST-V1).

### #18 cold-email vs stabilizácia

**Rozhodnutie:** Stabilizácia first; outreach po Vlne 1.

---

## Čaká na tvoj dôkaz (SQL / UI)

Spusti a pošli výsledky → **Audit 2.0**.

### 1. `manual_plan` pre Smolko

```sql
SELECT id, manual_plan FROM agencies
WHERE id = '11111111-1111-1111-1111-111111111111';
```

**Očakávané:** `market_vision`

### 2. Migrácie #156 na prod

```sql
SELECT to_regclass('public.routine_notifications');

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'import_jobs'::regclass
  AND conname ILIKE '%created_by%';
```

**Očakávané:** tabuľka non-null; FK `ON DELETE SET NULL`

### 3. Morning-brief beží

- Vercel → Cron Jobs → `/api/cron/morning-brief` → View Logs (dnes po 06:00 UTC)
- Resend → Emails → filter `rastislav.smolko@gmail.com`

### 4. Realvia RPC migrácia

```sql
SELECT proname FROM pg_proc WHERE proname ILIKE '%realvia%';
```

**Očakávané:** funkcia existuje = migrácia aplikovaná

### 5. RLS migrácia „neexistuje v repe"

**Rozhodnutie:** Pravdepodobne manuálny SQL editor drift — **neriešiť samostatne**; vyrieši **baseline dump** (otázka 12).

### 7. JSON `manualPlanInDb`

**Rozhodnutie:** Rozdeliť na `columnInSchema: true` + `valueSetInProd` (po query #1). Aktualizovať JSON po overeniach.

### 12. Baseline dump

**Rozhodnutie:** Áno, do repa. Docker Desktop → `supabase db dump --linked` → commit `20260610000000_baseline_prod_schema.sql`.

### 13. CI secrets

**Rozhodnutie:** Neodstraňovať; test/build ich už nečítajú (#161). Zvážiť premenovanie na `PROD_*` ak nepoužíva deploy step.

### 14. Team Pressure banner

**Overenie:** Login ako Smolko → `/team`. Ak banner svieti:

```sql
SELECT ui_role, account_tier, role, email FROM profiles
WHERE email = 'rastislav.smolko@gmail.com';
```

+ screenshot.

### 17. PR #72 / AKMV

**Manažérska otázka:** Bol balík odoslaný? Deadline? Doplň do balíka: prázdna tabuľka + cron deregistrácia.

---

## Otvorené technické follow-upy (z programu prác)

| ID | Task | Priorita |
|----|------|----------|
| T-DE | Decision flags opt-in | Vlna 1 |
| T-ARB | Skryť arbitrage z nav + pauza cron | Vlna 1 |
| T-BASE | Baseline prod schema dump | Vlna 1 |
| T-011 | `canUseFullApp` override removal | Vlna 2 |
