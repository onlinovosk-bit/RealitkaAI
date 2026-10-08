# Samoobslužné založenie agentúry (SIGNUP-ARCH) — 2026-10-06

Stav (2026-10-08): **migrácie aplikované na PROD (po výslovnom GO foundera), vlajky vypnuté.** Pôvodný stav: kód + migrácia pripravené, nenasadené.

## Rozhodnutia foundera
- B: skúška **bez karty, 14 dní plný Revolis**, po skončení sa sama vypne (read-only, nič sa neúčtuje automaticky).
- C: malý skúšobný grant kreditov — **výška nerozhodnutá** → `SELF_SERVE_TRIAL_CREDITS` (predvolene 0).

## Tok
1. `/register` (len pri `SELF_SERVE_SIGNUP_ENABLED=true`): honeypot, súhlas, rate limit (IP 10/h, e-mail 3/h), `auth.signUp` s metadátami. **Žiadny zápis do `agencies`/`profiles`.**
2. Potvrdzovací e-mail → `/auth/callback` alebo `/auth/confirm`.
3. Po OVERENÍ e-mailu `provisionAfterEmailConfirmed` volá `bootstrap_self_serve_agency` (service_role).
4. SQL funkcia znova overuje `auth.users.email_confirmed_at`, súhlas, nikdy neprepíše existujúci profil, je idempotentná (advisory lock na používateľa), pozvaný e-mail (`invite_exists`) agentúru nezakladá.
5. Predvolené hodnoty: `plan/account_tier = free`, `seats = 0`, zostatky 0, `trial_ends_at = now() + APP_TRIAL_DAYS`, `created_via = 'self_serve'`, audit riadok v `account_signups` (verzia súhlasu).
6. Presmerovanie: s úmyslom plánu `/upgrade?plan=<pásmo>`, inak onboarding. (Predvýber pásma na `/upgrade` je samostatný krok — zatiaľ sa parameter len prenáša.)

## Čo migrácia mení (`20261006120000_self_serve_signup_foundation.sql`)
| zmena | prečo | dôkaz |
|---|---|---|
| `agencies.trial_ends_at`, `created_via` | trial ukotvený na agentúre, nie na `auth.users.created_at` | TEST: T7 |
| `account_signups` (RLS bez politík, REVOKE) | súhlas + audit | T9; allowlist doplnený |
| `bootstrap_self_serve_agency` (EXECUTE len service_role) | jediná cesta zakladania | T2–T11 |
| trigger `agencies_guard_protected_columns` | prehliadač nesmie meniť plán/miesta/kredity/trial/Stripe stĺpce (soft-revert, nechránené polia ako `name` prejdú) | T13 |
| `profile_agencies_for_auth`: e-mailová vetva len pre **overený** e-mail | neoverený e-mail inak zdedí tenant s profilom na ten e-mail | T14; PROD: 0 dotknutých (19 neprepojených profilov, 0 zhoda s auth e-mailom) |

Mapa ciest (pred zmenou): všetky zápisy do `agencies` v aplikácii idú cez `createServiceRoleClient` (billing, grant-engine, lifecycle, webhook); `SupabaseAgenciesRepository` je cron. Klientsky zápis do `agencies` v kóde nie je, takže guard nerozbije existujúci tok.

## Dôkaz (TEST projekt `ndfytadjboqvtsrpdyby`, všetko v transakcii s ROLLBACK — po behu 0 stôp)
PASS: T2 (anon/authenticated bez EXECUTE, service_role áno), T3 neoverený e-mail odmietnutý, T4 súhlas povinný, T5 neznámy používateľ, T6 založenie, T7 bezpečné predvolené hodnoty, T8 owner profil, T9 audit + úmysel plánu, T10 idempotencia, T11 pozvaný profil sa neprevezme, T13 guard (plán/miesta/trial vrátené späť, `name` prejde), T14 neoverený e-mail nezíska tenant, overený áno.
Poznámka k nástroju: Supabase SQL API na TEST visí pri jednom spojení s `set_config('request.jwt.claim.role','service_role')`; vetva `service_role` guardu preto nie je overená cez MCP, len čítaním kódu (`IF claim = 'service_role' OR current_user NOT IN (authenticated, anon)`). Pri behu cez `psql` je v `supabase/verify/…verify.sql` test T13 pripravený; pridať T13b pri prvom behu cez psql.
Skript: `apps/crm/supabase/verify/self_serve_signup_foundation.verify.sql` (spúšťať iba na TEST; na konci ROLLBACK).
Kód: 27 testov (`src/lib/signup`, `register/__tests__`), mutačný dôkaz 6/6 (honeypot, overený e-mail, orezanie kreditov, metadáta, predvolená vlajka, fail-closed bez service klienta).

## Čo NIE JE hotové (otvorené)
- Aplikácia migrácie na PROD (GO foundera) + PROD Supabase „Confirm email" musí byť ZAPNUTÉ (inak `signUp` hneď vydá session; bootstrap aj tak vyžaduje `email_confirmed_at`, ale UX by bol zlý).
- Šablóna potvrdzovacieho e-mailu v Supabase (`ConfirmationURL` vs `token_hash`): kód podporuje oba (`/auth/callback`, `/auth/confirm`); treba overiť na PROD jedným skutočným signupom.
- Rate limit `rateLimit()` pri chybe DB prepúšťa (existujúce správanie); bránou ostáva overenie e-mailu + Supabase Auth limity.
- Výška skúšobných kreditov (C) — founder.
- Google OAuth, VOP/refund text pre ročné platenie, predvýber plánu na `/upgrade`.
- Odovzdanie trialu do `canUseFullApp` používa existujúcu `getTrialGraceState` (zmena len v zdroji konca trialu; po vypršaní read-only podľa #817).


## Aplikácia na PROD (2026-10-08, projekt `ypgajkhqtbriqqmyawyv`)
Aplikované v malých idempotentných krokoch (nástroj SQL na PROD čaká na potvrdenie pri `DROP`, preto `CREATE OR REPLACE TRIGGER`):
1. `20261005120000 pricing_v2_agency_columns` + stĺpce `trial_ends_at`, `created_via` na `agencies` (aditívne). PROD ich dovtedy nemal vôbec (ani pricing v2 stĺpce).
2. `account_signups` (RLS zapnuté, `anon`/`authenticated` bez prístupu).
3. `bootstrap_self_serve_agency` (EXECUTE len `service_role`; plán sa zakladá ako `Free`, ako ostatné agentúry na PROD).
4. trigger `agencies_guard_protected_columns`.
5. `profile_agencies_for_auth` len pre overený e-mail.
6. záznam do `supabase_migrations.schema_migrations` (`20261005120000`, `20261006120000`).

**Dôkaz pred/po (PROD):** 7 agentúr a 23 profilov; hash existujúcich riadkov agentúr (bez nových stĺpcov) `625ce4a7…` aj profilov `cf882d7f…` identický pred aj po; 0 riadkov s novými hodnotami; po testoch 0 testovacích používateľov (294 auth používateľov ako predtým).
**Funkčné testy na PROD (v transakcii s rollbackom):** PASS T2–T11, T14 a guard: používateľ s rolou `authenticated` zmenil `name`, ale `plan` (`Free`), `seats` (0), `credits_balance` (0) a `trial_ends_at` ostali.
Nepodarilo sa overiť: „Confirm email“ v Supabase Auth (konfigurácia mimo SQL), skutočný signup cez e-mail, vetvu `service_role` guardu (čítaním kódu).
