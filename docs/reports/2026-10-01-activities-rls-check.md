# ACTIVITIES-RLS-CHECK — môže prihlásený používateľ čítať cudzie `activities`? (read-only)

**Dátum:** 2026-10-01 · **PROD:** `ypgajkhqtbriqqmyawyv` · **Zápis do DB: žiadny** (len `SELECT`).
**Obsah riadkov (title/text/meta/meno) som NEČÍTAL** — len štruktúru a počty (regex počíta e-mail/telefón, nič nevypisuje).

## Záver
**Áno, únik je reálny a dosiahnuteľný z aplikácie.** Čo je dokázané a čo nie:

| tvrdenie | stav | dôkaz |
|---|---|---|
| `activities` nemá `agency_id`; väzba na tenanta ide len cez `lead_id → leads.agency_id` | dokázané | `information_schema.columns` |
| Politika `activities_select_agency` (rola `authenticated`) pustí každý riadok s `lead_id IS NULL` | dokázané | `pg_policy` |
| Politiky sa pri `SELECT` OR-ujú → bezpečná `activities_tenant_select` leaky politiku **neprebije** | dokázané (sémantika Postgres RLS) | — |
| PROD má **4 agentúry / 23 profilov** → ide o multi-tenant | dokázané | `profiles` |
| Takých riadkov je **187**; **žiadny** nemá `profile_id` (nemá žiadnu väzbu na agentúru) | dokázané | agregát |
| Aplikácia číta `activities` tenantovým klientom (`listActivities`, `select *`) | dokázané | `src/lib/activities-store.ts` |
| Riadky obsahujú osobné údaje | **dokázané počtom** | nižšie |
| Komu tie údaje patria (ktorá agentúra / Revolis samotný) | **NEOVERENÉ** — obsah som nečítal | — |

### Čo je v tých 187 riadkoch (entity_type · počet · s e-mailom · s telefónom)
| entity_type | n | e-mail | telefón | poznámka |
|---|---|---|---|---|
| `profile` (source `team`) | 127 | **127** | 0 | 2026-03-20 → 04-29 |
| `saas_lead` (source `sales`, „Sales Funnel") | 22 | **17** | 0 | 03-20 → 07-07; zrejme obchodný lievik Revolisu |
| `property` | 13 | 0 | 3 | |
| `lead` (source `crm`) | 5 | 0 | **5** | 2026-05-26/27 |
| `matching` | 10 | 0 | 0 | **posledný 2026-09-29** → tabuľka sa takto píše dodnes |
| `ai_recommendations`, `scoring`, `task` | 10 | 0 | 0 | |

Všetky majú `actor_name`. Dôsledok: **používateľ ľubovoľnej z 4 agentúr** môže cez feed vidieť e-maily (min. 144 riadkov) a telefóny
(min. 8 riadkov), z ktorých časť zrejme patrí obchodnému lieviku Revolisu (prospekti), nie jeho agentúre. GDPR:
neoprávnený prístup k osobným údajom — **podľa nášho vlastného GDPR gate to treba brať ako incident na posúdenie**,
nie ako „technický dlh". To, či ide o povinnosť nahlásenia, nerozhodujem ja.

### Prečo to repo samo nezatvorí
`activities_select_agency` / `activities_insert_agency` (a štyri `matches_*_agency` na `lead_property_matches`) **nie sú
v žiadnej aktívnej migrácii** — žijú len v `supabase/migrations-archive/20260412_enterprise_realtime_audit_rls.sql`.
Teda bežali ručne / z archívu a P-3 ich nezasiahol. Treba **novú** migráciu s `DROP POLICY IF EXISTS`.

## Navrhnutá oprava (NEAPLIKOVANÁ — čaká na GO)
**Krok 1 — okamžitý stop úniku (SELECT):**
```sql
DROP POLICY IF EXISTS activities_select_agency ON public.activities;
```
Zostáva `activities_tenant_select` (cez `leads.agency_id IN profile_agencies_for_auth()`). Cena: tenant už neuvidí riadky
s `lead_id IS NULL` (vrátane vlastných `matching`, 10 ks, a „team" záznamov) — tie sa musia ukázať iným, tenant-scopeovaným
spôsobom. Pred aplikáciou overiť, že UI feed bez nich nespadne.

**Krok 2 — zápis (INSERT) NEROBIŤ naslepo:** `activities_insert_agency` povoľuje tenantovi vkladať riadky s
`lead_id IS NULL` a `matching` ich píše aj v septembri. Zrušenie politiky by tieto zápisy ticho zlyhalo. Najprv rozhodnúť
o **agency kľúči pre aktivity bez leadu** (nový stĺpec `agency_id` + backfill + `activities_tenant_*` nad ním), až potom
zrušiť insert politiku.

**Krok 3 — rovnaký vzor inde:** `lead_property_matches` (4 politiky), `pipeline_moves` (2), `platform_events` (1) majú
vetvu `agency_id IS NULL` cez `leads`/priamo. Tam je dnes 0 NULL riadkov (leads 0/520, platform_events 0/1435), takže
latentné — zaradiť do toho istého balíka, nie samostatne.

## Rozhodnutia pre foundera
1. GO na krok 1 (jeden `DROP POLICY`, vratné) — odporúčam **hneď**, je to jediný krok, ktorý zastaví únik.
2. Posúdiť, či ide o incident ochrany osobných údajov (e-maily prospektov Revolisu vystavené 4 agentúram).
3. GO na návrh agency kľúča pre `activities` (krok 2).
