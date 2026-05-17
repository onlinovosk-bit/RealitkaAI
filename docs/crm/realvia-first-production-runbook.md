# Realvia — prvý ostrý beh (production runbook)

Tento dokument je kontrolný zoznam pred prvým prijatím skutočných exportov z Realvie na **produkčný** Revolis CRM (`app.revolis.ai` alebo vaša kanonická doména).

**Čo musí urobiť človek s prístupom (nemôže robot z IDE):** prihlásenie do Vercelu, Supabase SQL Editora, úprava env premenných, email/dohoda s Realviou, kontrola používateľa `profiles` / Auth.

**Čo je už pripravené v repozitári:** webhook `/api/webhooks/realvia`, worker `/api/cron/realvia-process`, admin UI `/integrations/realvia`, vzorky payloadov, SQL verifikácia, migračné súbory.

---

## Fáza A — Git a deploy CRM

- [ ] **A1.** Všetky zmeny Realvia sú na vetve, ktorá ide na **Production** (typicky `main`), bez rozbitého buildu.
- [ ] **A2.** Na Verceli je projekt, ktorý nasadzuje **`apps/crm`** (Settings → General → **Root Directory** = `apps/crm`, ak je monorepo).
- [ ] **A3.** Posledný **Production** deployment je **Ready** (nie starý redeploy z mája bez nového commitu).
- [ ] **A4.** Settings → **Domains**: produkčná doména (napr. `app.revolis.ai`) ukazuje na tento projekt.

---

## Fáza B — Environment variables (Vercel → Production)

Nastav aspoň nasledovné (hodnoty necommituj do Gitu):

| Premenná | Účel |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase projekt |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` alebo `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Klient |
| `SUPABASE_SERVICE_ROLE_KEY` | Server (webhook log, fronta, dashboard API) |
| `REALVIA_IDENTIFIER` | Hlavička `identifikator` od Realvie |
| `REALVIA_IDENTIFIER_2` | Hlavička `identifikator2` |
| `REALVIA_SHARED_SECRET` | Voliteľná vrstva + `X-Revolis-Secret`; v production má byť nastavená podľa vašej politiky |
| `REALVIA_ALLOWED_IP` | Oddeľované čiarkami; default Realvia IP je v kóde dokumentovaná |
| `CRON_SECRET` | Cron worker autentifikácia |
| `REALVIA_DEFAULT_AGENCY_ID` | Voliteľné UUID jednej agentúry, ak ešte nemáš mapovanie v `agencies` |

Po zmene env: **Redeploy** production (alebo počkaj na nový push).

---

## Fáza C — Databáza Supabase (produkčný projekt)

Spúšťaj v **SQL Editor** v tomto poradí (ak objekt už existuje, skript je väčšinou idempotentný; pri konflikte policy použij aktualizovaný `22_*` s `DROP POLICY IF EXISTS`):

1. [ ] **C1.** `apps/crm/supabase/22_realvia_webhook_infrastructure.sql`  
   (tabuľky `realvia_*`, rozšírenie `properties`, indexy, RLS)

2. [ ] **C2.** `apps/crm/supabase/migrations/20260512103000_realvia_agency_credentials_metrics.sql`  
   (`agencies.realvia_identifikator`, `realvia_metrics`)

3. [ ] **C3.** `apps/crm/supabase/migrations/20260512174500_realvia_schema_health_rpc.sql`  
   (funkcia `realvia_schema_health()` pre kontrolu DDL)

4. [ ] **C4.** Manuálna kontrola: spusti `apps/crm/scripts/verify-realvia-infrastructure.sql` — očakávaj `true` pri všetkých výsledkoch.

5. [ ] **C5.** Mapovanie RK: v tabuľke **`agencies`** pre príslušný riadok nastav  
   `realvia_identifikator` a `realvia_identifikator2` **presne** ako budú chodiť v HTTP hlavičkách z Realvie (alebo použij `REALVIA_DEFAULT_AGENCY_ID`).

---

## Fáza D — Používateľ majiteľa / dashboard

- [ ] **D1.** V **Supabase Auth** existuje používateľ s emailom office RK (heslo nastavené bezpečne — nie v chatoch).
- [ ] **D2.** V **`profiles`** má riadok `auth_user_id` / email zhodu, **`agency_id`** = správna agentúra, **`role`** = `owner` alebo `manager` (alebo founder/admin podľa vášho modelu pre Integrations / Realvia UI).
- [ ] **D3.** Po deployi otvor **`https://<tvoja-domena>/integrations/realvia`** (nie starý bookmark `/admin/...` bez redirectu na starej verzii). Prihlás sa. Klikni **„Skontroluj schému (prod)”** — má byť OK.

---

## Fáza E — Konfigurácia na strane Realvie

- [ ] **E1.** Endpoint pre PUSH nastav na:  
  **`POST https://<tvoja-produkčná-domena>/api/webhooks/realvia`**  
  Príklad: `https://app.revolis.ai/api/webhooks/realvia`

- [ ] **E2.** Dohodni s Realviou hlavičky **`identifikator`** a **`identifikator2`** tak, aby sedeli s env + riadkom v `agencies`.

- [ ] **E3.** Ak Realvia posiela **`identifikator3` / `identifikator4`**, v aktuálnom kóde ich **nepoužívame** — treba rozšírenie (nie je súčasť tohto runbooku).

- [ ] **E4.** Poskytni Realvií referenčný JSON (anonymizovaný):  
  `docs/crm/samples/realvia-webhook-payload-examples.json`

---

## Fáza F — Smoke test po zapnutí exportu

- [ ] **F1.** Health: v prehliadači alebo curl  
  `GET https://<domena>/api/webhooks/realvia` → `{ "status": "ok", ... }`

- [ ] **F2.** Po prvom skutočnom POST od Realvie: v `/integrations/realvia` uvidíš riadok v **Webhook Logs** a job vo fronte.

- [ ] **F3.** Worker: čakaj automaticky podľa Vercel Cron (`realvia-process`), alebo v UI **„Process Queue“**. Over **`properties`** (nový / aktualizovaný záznam podľa `source_id`).

- [ ] **F4.** Delete payload: forma `{ "source_id": <číslo>, "deleted": true }` → v CRM status **Stiahnutá** (soft).

---

## Fáza G — Keď niečo zlyhá

| Symptóm | Kam pozrieť |
|---------|-------------|
| 403 na webhook | IP whitelist / hlavičky / `REALVIA_SHARED_SECRET` |
| 500 pri uložení logu | `SUPABASE_SERVICE_ROLE_KEY`, migrácie tabuliek |
| Log je, ale nič v properties | Worker / cron / chyba vo fronte — stĺpec `error_message` |
| Forbidden na `/integrations/realvia` | Rola v `profiles`, nie je agent-only |

---

## Rýchle odkazy v repozitári

- Vzorky JSON: `docs/crm/samples/realvia-webhook-payload-examples.json`
- Lokálny simulátor: `npx ts-node scripts/test-realvia-webhook.ts` (proti lokalu / `TEST_URL`)
- Špecifikácia: `docs/crm/realvia-production-implementation.md`

---

**Posledný krok pred „GO“:** A3 + C4 + E1 + E2 sú zelené a majiteľ sa vie prihlásiť na dashboard s vlastnou `agency_id`.
