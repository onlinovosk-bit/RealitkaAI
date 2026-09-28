# ACQUISITION OS v2.2 — STAGE 0 EXEKUČNÝ BALÍK

**Cieľová cesta:** `docs/prompts/acquisition-os-stage0-execution.md`
**Blueprint:** ulož nahraný súbor ako `docs/architecture/acquisition-os-v2.2-final-locked.md` — Cursor ho musí mať v repe
**Status blueprintu:** FINAL LOCKED — žiadne ďalšie AI review, žiadne redesigny
**Rozsah:** VÝHRADNE Stage 0 (read-only sync, test MCC, žiadne peniaze, žiadny LLM, žiadna Meta/Microsoft, žiadne mutácie kampaní)

---

## ČASŤ 1 — Čo musíš urobiť TY (Day 1–2, Cursor to za teba nespraví)

Toto sú klikacie kroky mimo repa. Bez nich agent nemá do čoho písať credentials:

1. **Google Ads Test MCC:** ads.google.com → vytvoriť manager account → v nastaveniach označiť ako TEST manager account. (Test MCC = červený banner „Test account".)
2. **2 test client accounts** pod týmto Test MCC (Account settings → + New account).
3. **Developer token:** v Test MCC → API Center → požiadať. Pre test accounts funguje token okamžite v test režime — na Stage 0 stačí, o Basic access žiadame až pred Stage 1.
4. **Google Cloud projekt** (môže byť existujúci „Revolis AI"): zapnúť **Google Ads API**.
5. **Service account:** IAM → Service Accounts → vytvoriť → stiahnuť JSON kľúč.
6. Kľúč **NEcommitovať, NEvkladať do chatu s AI**. Ulož ho zatiaľ lokálne mimo repa; kam presne v systéme patrí, rozhodne PR-S0.2 (viď NAJPRV ZISTI).
7. Zapíš si: Test MCC customer ID, 2× test customer ID, developer token.

---

## ČASŤ 2 — Execution prompt pre Cursor (skopíruj celý blok)

```
IMPLEMENT REVOLIS ACQUISITION OS v2.2 — STAGE 0 ONLY.

Blueprint: docs/architecture/acquisition-os-v2.2-final-locked.md
Blueprint je FINAL LOCKED. NEredizajnuj, NEreinterpretuj, NErozširuj.
NEimplementuj Stage 1+. Ak počas práce usúdiš, že „lepšia architektúra by
bola...", STOP a napíš to founderovi — blueprint sa nemení.

Riadiš sa aj pravidlami repa:
- brain/identity/CONSTITUTION.md (Čl. 7 testy, limity PR: soft 400 / hard 600 riadkov)
- docs/architecture/repo-inventory-2026-08-05.md (overené cesty)
- Migrácie: apps/crm/supabase/migrations/, konvencia YYYYMMDDHHMMSS_snake_case.sql
- RLS vzor: leads_tenant / public.profile_agencies_for_auth() — kopíruj, nevymýšľaj druhý

HARD CONSTRAINTS (Stage 0):
- Google Ads only · Test MCC only · READ-ONLY only
- Žiadne campaign/budget mutácie, žiadne conversion uploады
- Žiadna Meta, žiadny Microsoft, žiadny LLM, žiadny autopilot
- Service account credentials, encrypted at rest, NIKDY v logoch ani v LLM kontexte
- Tenant isolation: agency_id všade + composite FK (agency_id, acquisition_account_id)
- customer_id sa NIKDY neberie z client payloadu — vždy resolved z agency_id v auth kontexte
- Idempotentný sync, retry + exponential backoff, konfigurovateľný rate limit
  (GOOGLE_ADS_RATE_LIMIT_PER_TENANT), audit log

NAJPRV ZISTI (napíš mi zistenia, KÝM napíšeš prvý riadok kódu):
1. Existujúca schéma: agencies, leads, activities, teams, profiles — presné PK/FK.
   Má leads UNIQUE(agency_id, id)? (blueprint FK to vyžaduje — ak nie, treba
   aditívny unique index v migrácii)
2. RLS vzor: presný tvar politiky na leads + signatúra profile_agencies_for_auth()
3. Kde v repe žijú naplánované joby (Vercel cron? n8n? iné?) — sync workers
   Stage 0 musia použiť EXISTUJÚCI mechanizmus, nie nový queue systém.
   Blueprint queue (Redis/Bull) je cieľový stav — Stage 0 stačí cron + tabuľka jobov.
4. Ako repo skladuje secrets dnes (env na Verceli? Supabase Vault?).
   Blueprint hovorí KMS/Hashicorp/AWS SM — použi najbližší EXISTUJÚCI ekvivalent
   a napíš mi, ktorý to je. Nezavádzaj nový vault systém kvôli Stage 0.
5. Service account pre Google Ads API vyžaduje domain-wide delegation cez
   Google Workspace identitu. Over, či je to s naším setupom realizovateľné.
   Ak nie: blueprint má schválený fallback OAuth — použi ho a zapíš do PR
   description „service account odložený na Stage 1, dôvod: ...". To NIE JE
   zmena blueprintu, fallback je v ňom locked.
6. Existuje v repe čokoľvek s prefixom acquisition_? (nechceme kolíziu)

KONFLIKTNÝ PROTOKOL: pri konflikte s existujúcim Revolis kódom
1) identifikuj konflikt, 2) ukáž konkrétne súbory, 3) navrhni riešenie,
4) NEROZBI existujúci Revolis. Čakaj na rozhodnutie foundera.

ROZDELENIE NA PR — Ústava nepustí 2-týždňový blob do jedného PR.
Sekvenčne, každý PR samostatne testovaný a mergnutý founderom:

PR-S0.1  Migrácia: acquisition_accounts, acquisition_campaigns,
         acquisition_events + composite FKs + RLS + indexy.
         acquisition_events je immutable ledger → REVOKE UPDATE, DELETE
         FROM authenticated (rovnaký mechanizmus ako memory_events).
         TESTY: cross-tenant RLS pre všetky 3 tabuľky (agentúra A nevidí B),
         composite FK odmietne mismatch (agency A + account B),
         UNIQUE(agency_id, provider, provider_event_id, event_type) dedup,
         append-only na events. ČISTO ADITÍVNE, žiadna zmena existujúcich tabuliek.

PR-S0.2  Credential storage (podľa zistenia #4) + POST /api/acquisition/google/connect
         + GET /accounts. Testy s mockom, žiadne živé Google volanie v CI.
         Test: credential sa nikdy neobjaví v response ani v logu.

PR-S0.3  Google Ads API klient-wrapper: auth, rate limit z env, retry,
         exponential backoff. Unit testy na retry/backoff s mockom.

PR-S0.4  Sync workers 1: campaigns + ad groups (read-only, idempotentné).
         Test: druhý beh syncu nevytvorí duplicity.

PR-S0.5  Sync workers 2: keywords + search terms + metrics.

PR-S0.6  Webhook plumbing: POST /api/acquisition/google/lead-webhook —
         validácia google_key, is_test=true SA LOGUJE A NESPRACÚVA ako lead.
         V Stage 0 webhook NIKDY nevytvára reálny lead v CRM.
         + audit log endpoint (GET /api/acquisition/audit-log).

PR-S0.7  Read-only dashboard (syncnuté dáta z test účtu) + spustenie
         KOMPLETNÉHO Stage 0 PASS checklistu z blueprintu §11 + report
         docs/architecture/acquisition-os-stage0-PASS-report.md
         s dôkazom (výstup testu / query) pri KAŽDEJ položke checklistu.
         Položka bez dôkazu = nesplnená.

Stage 0 NIE JE hotové, kým každá položka PASS checklistu nemá overený dôkaz.
Po PASS reporte STOP — Stage 1 má vlastné GO od foundera.
```

---

## ČASŤ 3 — Zápis do memory/decisions.md (pripoj)

## D-2026-08-09-01 — Acquisition OS v2.2: GO na Stage 0

**Rozhodnutie:** Blueprint `acquisition-os-v2.2-final-locked.md` sa zamyká
a implementuje sa VÝHRADNE Stage 0 (read-only sync z Google Test MCC,
tenant izolácia, audit). Stage 1+ vyžaduje samostatné GO po Stage 0 PASS
checklistе s dôkazmi.

**Hranice (neprerokovateľné v Stage 0):** žiadne reálne peniaze, žiadne
mutácie kampaní/budgetov, žiadne conversion uploады, žiadny LLM, žiadna
Meta/Microsoft, webhook spracúva iba is_test.

**Vzťah k Memory Engine ADR:** `acquisition_events` je doménový ledger
udalostí externých providerov (Google Ads), `memory_events` je CRM outbox.
Nie je to duplicitný event store — hranica: čo sa stalo U PROVIDERA vs.
čo sa stalo V CRM. Ak Stage 1 ukáže prekryv, rieši sa amendmentom ADR,
nie ad-hoc v kóde.

**Reverzibilita:** Stage 0 je čisto aditívny (nové tabuľky, nové routes),
rollback = revert PR bez dopadu na existujúci produkt.

**Kill kritérium Stage 0:** ak do 14 pracovných dní od PR-S0.1 neprejde
kompletný PASS checklist s dôkazmi, Stage 0 sa zastavuje a reviduje sa
rozsah — nie blueprint, ale tempo (founder je sám na všetko).
