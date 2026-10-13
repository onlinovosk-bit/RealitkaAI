# 14-dňová skúška z webu — čo musí platiť v PROD

**Dátum:** 2026-10-13  
**PR:** #844 (doplnenie; bez merge a bez deploy)  
**Stav kódu:** IMPLEMENTED / TESTED v tomto PR. PRODUCTION: nie.

## Čo robí web po nasadení tohto PR

Primárne nákupné CTA na `revolis.ai` (hero, nav, sticky, kalkulačka, ciele, karty plánov vrátane Siete) vedú na:

`https://app.revolis.ai/register?pricing=v2&plan=<pásmo>`

Hero / nav / sticky / kalkulačka = `plan=start`. Calendly (`https://calendly.com/revoliscrm/30min`) je len vedľajší odkaz **Dohodnite si ukážku**.

## Fallback, keď sú vlajky vypnuté (aby CTA neskončilo na rozbitej stránke)

| vlajka | kde | predvolené | keď je OFF | výsledok pre návštevníka |
|---|---|---|---|---|
| `PRICING_V2_SIGNUP_ENABLED` | marketing `revolis-marketing` | **zapnuté** (nenastavené = ON) | `false` / `0` / `off` / `no` | primárne CTA idú na Calendly, `/register` sa z webu neotvára |
| `SELF_SERVE_SIGNUP_ENABLED` | CRM `realitka-ai` | **vypnuté** (len `true`/`1`/`on`) | dnešný PROD stav | `/register` ukáže **zatvorenú stránku** (text, že skúška nie je otvorená) + **Dohodnite si ukážku** + prihlásenie + pozvánka v `<details>`. **Nie** formulár, ktorý založí auth účet a spadne na „chýba bezpečné založenie agentúry“. |

Marketing nečíta CRM env. Preto musí byť bezpečná **aj** stránka `/register` sama, nielen odkazy na webe.

**Odporúčanie na deň D:** najprv zapnúť `SELF_SERVE_SIGNUP_ENABLED=true` na CRM (Production), overiť jeden skutočný signup, **potom** nasadiť marketing. Ak sa nasadí len marketing a CRM ostane vypnutý, CTA nie je rozbité — človek vidí zatvorenú stránku a Calendly. Skúšku ale nedostane.

---

## Checklist foundera (krátky)

### 1) Vercel — projekt `revolis-marketing` (doména `revolis.ai`)

| premenná | hodnota | na čo |
|---|---|---|
| `PRICING_V2_ENABLED` | nenastavené, alebo nie `false` | cenník v2 na webe (už predvolené) |
| `PRICING_V2_SIGNUP_ENABLED` | **nenastavené** (predvolene ON). Núdzovo `false` | primárne CTA → `/register`. `false` = všetko spät na Calendly |
| `NEXT_PUBLIC_CRM_URL` | `https://app.revolis.ai` (alebo prázdne = ten istý default v kóde) | kam CTA posiela |
| `PRICING_V2_PLANS_ONLY` | nenastavené (predvolene ON) | na webe len plány, bez balíkov kreditov — nesúvisí so signupom |

`SELF_SERVE_*` na marketingovom projekte **nie sú**. Stripe price ID na marketingovom projekte pre tento tok **nie sú potrebné** (web nejde do Stripe).

### 2) Vercel — projekt `realitka-ai` (doména `app.revolis.ai`)

| premenná | hodnota | na čo |
|---|---|---|
| `SELF_SERVE_SIGNUP_ENABLED` | **`true`** | bez tohto je `/register` zatvorená stránka. Fail-closed, predvolene OFF. |
| `APP_TRIAL_DAYS` | nenastavené alebo `14` | dĺžka skúšky (kód oreže na 0–60) |
| `SELF_SERVE_TRIAL_CREDITS` | **nenastavené / `0`**, kým founder neurčí výšku | kreditný grant pri založení kancelárie. Predvolene 0 = skúška bez kreditov. Max v kóde 200. |
| `NEXT_PUBLIC_APP_URL` | `https://app.revolis.ai` | `emailRedirectTo` po `signUp` (`/auth/callback`) |
| `NEXT_PUBLIC_SUPABASE_URL` | PROD URL | Auth + bootstrap |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` **alebo** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | PROD anon/publishable | `signUp` z `/register` |
| `SUPABASE_SERVICE_ROLE_KEY` **alebo** `SUPABASE_SECRET_KEY` | PROD service/secret | `bootstrap_self_serve_agency` **až po** overení e-mailu. Bez kľúča sa kancelária nezaloží. |
| `PRICING_V2_ENABLED` | **nie je potrebné na skúšku**. `true` až keď má `/upgrade` ukazovať nový cenník | po skúške ide tok na `/upgrade?plan=`; pri vypnutom prepínači tam ostane starý seat cenník |
| `STRIPE_*` / `STRIPE_PRICE_V2_*` | **nie sú potrebné na skúšku bez karty** | treba ich až na platený upgrade po skúške |

### 3) Supabase Auth (projekt PROD `ypgajkhqtbriqqmyawyv`)

- **Confirm email: ZAPNUTÉ.** Ak je vypnuté, `signUp` hneď vydá session; bootstrap aj tak žiada `email_confirmed_at`, UX je zlý.
- **Site URL:** `https://app.revolis.ai`
- **Redirect URLs** (Authentication → URL configuration) musia obsahovať aspoň:
  - `https://app.revolis.ai/auth/callback`
  - `https://app.revolis.ai/auth/confirm`
  - lokálne / preview, ak testujete mimo PROD (`http://localhost:3000/auth/callback`, `https://<preview>.vercel.app/auth/callback`)
- **Šablóna potvrdzovacieho e-mailu:** kód berie oba tvary — `ConfirmationURL` → `/auth/callback?code=`, aj `token_hash` → `/auth/confirm?token_hash=&type=signup`. Overiť **jedným skutočným signupom**, nie odhadom.
- **SMTP:** predvolený Supabase mail je na PROD nespoľahlivý (limity, spam). Nastaviť vlastný SMTP (alebo existujúci Resend, ak ho Auth vie použiť). Bez doručeného mailu sa kancelária nezaloží.
- Migrácie `20261005120000` a `20261006120000` **už sú na PROD** (2026-10-08). Funkcia `bootstrap_self_serve_agency` EXECUTE len `service_role`.

### 4) Stripe — skúška bez karty

Stripe **nie je v ceste skúšky.** Žiadny Customer, žiadny SetupIntent, žiadna karta, nič sa neúčtuje. Po skončení `trial_ends_at` účet prejde do read-only (existujúca brána), nie do automatickej platby.

Stripe treba až keď zákazník na `/upgrade` zaplatí plán. To je samostatné GO (`PRICING_V2_ENABLED` na CRM + live price ID + webhook).

### 5) Riziká

- **Skúška bez karty = zneužitie.** Brány v kóde: honeypot, rate limit 10/h na IP a 3/h na e-mail (ak chýba service role, rate limit **prepúšťa**), povinné potvrdenie e-mailu, SQL nezaloží kanceláriu bez overeného e-mailu a súhlasu. Karta ako brzda nie je. Ďalšia brzda: `SELF_SERVE_TRIAL_CREDITS=0`.
- **Kreditný grant.** Ak sa `SELF_SERVE_TRIAL_CREDITS` nastaví na 25–200, každý overený signup dostane kredity zadarmo. Výšku určuje len founder. Odporúčanie na deň D: nechať `0`, kým nie je jasné, či skúška bez kreditov stačí.
- **Dangling auth účet** pri vypnutej vlajke už nie je default cesta (zatvorená stránka). Pozvánka v `<details>` stále vie prepojiť existujúci profil; bez profilu fail-closed.
- **`/upgrade` po skúške** ukáže starý cenník, kým CRM `PRICING_V2_ENABLED` nie je `true`. Skúška aj tak beží (plán `free`).
- **Preview Vercel** bez redirect URL v Supabase = potvrdzovací odkaz spadne.

### 6) Minimálne GO na živú skúšku z webu

1. Supabase: confirm email ON, Site URL + redirect URLs, SMTP, jeden testovací signup.  
2. Vercel `realitka-ai` Production: `SELF_SERVE_SIGNUP_ENABLED=true`, `NEXT_PUBLIC_APP_URL=https://app.revolis.ai`, service role kľúč prítomný, `SELF_SERVE_TRIAL_CREDITS` vedome `0` alebo číslo.  
3. Nasadiť toto PR (CRM + marketing).  
4. Vercel `revolis-marketing`: `PRICING_V2_SIGNUP_ENABLED` **nenastavovať** (default ON).  
5. Smoke: CTA na `/` → `/register?plan=start` → formulár „14 dní zadarmo“ → e-mail príde → po kliknutí vznikne kancelária.

**Toto PR sa nenasadzuje a nemerguje**, kým founder nedá GO.
