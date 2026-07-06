# PR — fix/w-leads-create-rls (W-LEADS create RLS hotfix)
Repo: `C:\RealitkaAI` · cieľový path: `docs/prompts/fix-w-leads-create-rls-pr.md`
Kontext: PR #256 nasadil W-LEADS UI, ale POST /api/leads padá na PROD na RLS (insert cez browser singleton bez auth.uid()).

```yaml
task: w-leads-create-rls
reads:   [profiles, auth]
writes:  [leads]
migrations: conditional   # len ak chýba INSERT policy na leads (→ TVOJ prod GO)
requires: [auth]
risk:    production
```

## HARD pravidlá
- Vetva → commit → push → PR → CI zelená → STOP. Žiadny prod apply migrácie v tomto PR (tvoj GO).
- AP-012: minimálny diff. AP-019: nová tabuľka/policy migrácia → allowlist v tom istom PR (tu policy, nie tabuľka — allowlist netreba, len migráciu).

## KROK 0 — VERIFIKÁCIA pred kódom (rozhoduje o rozsahu)
Skontroluj v DB, či `leads` má INSERT politiku:
```sql
select polname, polcmd from pg_policy
where polrelid = 'public.leads'::regclass;
```
- **Ak INSERT policy chýba** → scoped client sám nestačí. Pridaj migráciu `..._leads_insert_policy.sql`:
  ```sql
  create policy leads_insert_own_agency on public.leads
    for insert to authenticated
    with check ( agency_id in (select agency_id from public.profiles where id = auth.uid()) );
  ```
  (over názov stĺpca v `profiles`; aplikuje Andy na PROD = GO)
- **Ak existuje** → migrácia netreba, stačí kódový fix nižšie.

## KROK 1 — Kódový fix (`apps/crm/.../leads-store.ts` + route)
- `createLead(payload, supabaseAuth)` — insert cez **scoped server client** so session, nie browser singleton. `auth.uid()` musí byť populated.
- **agency_id odvádzaj server-side** z profilu session, NIKDY z request body.
- Profile link: ak naozaj treba, sprav ho **idempotentným** a logovaným — nesmie vzniknúť druhý profile riadok (P0 regresia). Ideálne presuň link na login path, tu nechaj len TODO ak je to band-aid.
- Guard: ak `agencyId` nevyrieši → `403` + **log** (nech vidíš, ak gate strieľa).

## ACCEPTANCE / re-smoke
- `node apps/crm/scripts/w-leads-smoke-once.mjs` ako Smolko:
  - POST /api/leads bez session → 401 (nezmenené)
  - POST /api/leads so session → **201/200, lead v inventári** (predtým 400 RLS)
  - vytvor → redirect → v inventári ✅
- Test: insert s cudzím agency_id v body → odmietnutý (WITH CHECK + server-derived agency_id).

## TVOJA ČASŤ PO MERGE (GO)
1. (Ak Krok 0 ukázal chýbajúcu policy) apply migrácie INSERT policy na PROD.
2. Redeploy.
3. Re-run smoke skript → potvrď zelené.
