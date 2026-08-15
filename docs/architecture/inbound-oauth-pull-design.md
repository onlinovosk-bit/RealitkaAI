---
id: inbound-oauth-pull-design
title: "V4-B inbound OAuth pull (DMARC) — design only"
type: design
status: proposed
version: 0.1.0
owner: "Principal reliability / inbound leads"
lane: "Vlna 4 / V4-B"
created_at: 2026-08-15
updated_at: 2026-08-15
confidentiality: internal
canonical: false
implementation: STOP
verified_against_sha: "9109a73e60b2eb7df453ad96a6c1f732ed0d708b"
evidence_report: "docs/reports/2026-08-17-inbound-zisti.md (PR #402 / origin/docs/reports-2026-08-17 @ f073a03c5)"
sources:
  - apps/crm/src/app/api/acquire/email/route.ts
  - apps/crm/src/lib/acquire/email-adapter.ts
  - apps/crm/src/lib/acquire/send-inbound-auto-response.ts
  - apps/crm/src/lib/acquire/inbound-lead-auto-response.ts
  - apps/crm/src/lib/acquire/agency-map.ts
  - apps/crm/src/app/api/integrations/google/auth/route.ts
  - apps/crm/src/app/api/integrations/google/callback/route.ts
  - apps/crm/src/lib/google-calendar-server.ts
  - apps/crm/supabase/migrations/20260424_google_calendar_oauth.sql
  - apps/crm/tests/verification/acquire-email-gateway.verification.test.ts
depends_on:
  - docs/architecture/revolis-constitution-v2.md
  - docs/architecture/master-data-sourcing-map.md
  - docs/architecture/clay-positioning-reframe.md
---

# V4-B — Inbound OAuth pull (DMARC)

**Tento dokument je DESIGN ONLY. Žiadna implementácia. Žiadny merge do `main` bez samostatného GO foundera. GO na kód nedáva tento PR.**

Cieľ: nahradiť zákaznícky Gmail auto-forward (DMARC/alignment riziko) **pull modelom** — OAuth read-only + ingest job, ktorý volá **existujúci** `POST /api/acquire/email`. Druhý lead-ingest sa nevymýšľa.

---

## 0. STOP

| Položka | Stav |
|---|---|
| Tento PR | Iba dokumentácia |
| Application code (`apps/`, workers, migrácie, `lib/acquisition/sync/`) | **Nesiahnuť** |
| Token storage / OAuth client / cron | **Nerealizovať** v tomto PR |
| GO na implementáciu | **Len founder**, písomne, po prečítaní rizík (Google verification, GDPR, token vault) |
| Cloudflare Email Routing → `email-gateway` | Ostáva **additive fallback**, nestrháva sa v dizajne |

Ak founder nepovie GO, ostáva VALIDATE. Žiadny „začneme OAuth client v Google Cloud, lebo dizajn je hotový“.

---

## 1. Problém (merané, nie vymyslené)

Zákaznícky workaround dnes: **Gmail auto-forward** do Revolis inbound aliasu. Forwardované správy často **neprežijú DMARC alignment** (From ostáva portál/záujemca, Return-Path je Gmail). Dopyty sa strácajú ešte pred Workerom.

Meranie ZISTI 2026-08-15 (`docs/reports/2026-08-17-inbound-zisti.md`, PR #402):

| Fakt | Hodnota |
|---|---|
| Alias | `smolko-a7f2@revolis.ai` |
| Tenant | Reality Smolko, `agency_id=11111111-1111-1111-1111-111111111111` |
| Cesta | Cloudflare Email Routing → Worker `email-gateway` → `inbound_mailboxes` → `POST /api/acquire/email` s `mailbox.agencyId` |
| Prod `inbound_mailboxes.last_received_at` | **2026-07-14 20:53:09+00** (v čase merania ~1 mesiac ticho) |
| Ďalšie aliasy (tá istá tabuľka) | `demo-3f7a@revolis.ai` → Revolis Demo; `aa-reality-kosice-s-r-o-6461@revolis.ai` → AA REALITY Košice |
| CRM router na `origin/main` | `payload.mailbox.agencyId` — **nie** statická mapa |
| `agency-map.ts` | mŕtvy kľúč `smolko@inbound.revolis.ai` — nie je live router |
| `feat/inbound-triage-signal` @ `cb4559b98` | **žiadny PR**, **0 výskytov** `smolko-a7f2`; nerieši alias, DMARC ani `agency-map` |

Stealth: Reality Smolko je referenčný klient. Alias a `agency_id` sú **interný dôkaz**, nie marketing case study. Verejná kópia klienta nespomína.

---

## 2. Druhý DMARC landmine (auto-odpoveď)

Toto **nie je** ten istý bug ako Gmail forward, ale súvisí s From alignment pri outbound.

`resolveInboundFromEmail` (`apps/crm/src/lib/acquire/send-inbound-auto-response.ts`):

- Ak je `replyTo` na `revolis.ai` alebo `*.revolis.ai`, stane sa **From**.
- Inak overený outreach sender (`OUTREACH_FROM_EMAIL`) alebo `onboarding@mg.revolis.ai`.

`resolveInboundAutoResponseContacts` berie `agencies.email`, fallback owner profil.

ZISTI: `agencies.email` u Smolka je **teraz `null`** → fallback owner/outreach. **Rozbije sa**, keď niekto do `agencies.email` dá inbound alias (`smolko-a7f2@revolis.ai`): auto-odpoveď by šla **From = inbound alias**, čo nie je overený transactional From a láme DMARC/SPF.

**Pravidlo (dizajn, ešte nie kód):** inbound alias **nikdy** nie je `agencies.email` ani From. Alias je len routing kľúč v `inbound_mailboxes`.

Tento PR **neopravuje** `resolveInboundFromEmail`. Oprava From denylist je samostatná, malá zmena — až po GO, iný PR (1 PR = 1 logická zmena).

---

## 3. Navrhovaný model: pull, nie forward

```
[Portál / web formulár]
        |  (bežný Gmail príjem u RK)
        v
[Zákaznícky Gmail]
   filter → label napr. "Revolis / Dopyty"
        |
        |  OAuth gmail.readonly (+ gmail.labels)
        v
[Revolis ingest job, tenant-scoped]
   list messages with labelId
   map → existujúci Worker payload v1
        |
        |  POST /api/acquire/email
        |  header x-shared-secret = ACQUIRE_SHARED_SECRET
        v
[Existujúci pipeline]
   parseEmail → dedup → leads insert
   last_received_at na inbound_mailboxes
   triage + auto-response (bezo zmeny)
```

**Čo sa nemení:** parser, dedup, `leads` insert, triage, auto-response, shared-secret auth. Pull job je **ďalší producent** toho istého kontraktu, nie druhý ingest.

**Čo sa vypína u zákazníka:** Gmail auto-forward na `@revolis.ai`. Cloudflare cesta ostáva zapnutá ako fallback (iné zdroje, ručné forward, testy).

---

## 4. Kontrakt, ktorý sa musí zachovať

Z `apps/crm/src/app/api/acquire/email/route.ts` na `origin/main` @ `9109a73e6`:

| Pole | Pravidlo |
|---|---|
| Auth | Header `x-shared-secret` timing-safe vs `ACQUIRE_SHARED_SECRET` |
| `payload.version` | Presne `1` |
| Tenant | **Len** `payload.mailbox.agencyId` — nikdy From/To z Gmailu, nikdy `agency-map.ts` |
| Telo | Aspoň jedno z `email.subject` / `email.text` / `email.html` |
| `email.to` | Musí byť **Revolis inbound alias** z `inbound_mailboxes.email` (nie zákaznícky Gmail), inak `last_received_at` update netrafí riadok |
| `receivedAt` | ISO z Gmail internal date; route berie prvých 10 znakov ako dátum pre parser |

Gmail správa má `To:` = schránka RK. Job **nesmie** poslať ten To do pipeline. Mapovanie:

```
agencyId      <- agency_gmail_inbound.agency_id
email.to      <- inbound_mailboxes.email  (alias @revolis.ai)
email.subject <- Gmail payload.headers.Subject
email.text    <- text/plain part
email.html    <- text/html part
receivedAt    <- Gmail internalDate
```

Dedup ostáva `dedupKey(parseEmail(...))` v `acquire_dedup_keys`. Doplnkovo (fáza 2) uložiť `gmail_message_id` v tenant tabuľke, aby sa nevolal acquire na už stiahnuté ID — ale **lead pravda** ostáva existujúci dedup, nie nová tabuľka leadov.

Živá špecifikácia: `apps/crm/tests/verification/acquire-email-gateway.verification.test.ts` (shared secret, `mailbox.agencyId`). Po implementácii (iný PR) rozšíriť o pull-adapter — **nie v tomto PR**.

---

## 5. OAuth: least privilege, oddelené od Calendar/Send

Existujúci CRM Google connect (`/api/integrations/google/auth`) žiada:

- `calendar.events`
- **`gmail.send`**
- `openid email profile`

Tokeny idú do `profile_google_calendar` (per **profile**, service-role).

**Inbound pull tento grant NESMIE zdieľať.**

| Dôvod | Detail |
|---|---|
| Scope | Inbound potrebuje **čítanie**, existujúci grant je **odosielanie** + kalendár |
| Least privilege | Send token nesmie čítať mailbox; read token nesmie posielať |
| Tenant vs profil | Inbound je **agency-scoped** (jeden mailbox pre RK). Calendar je per-maklér |
| Revoke | Odpojenie kalendára nesmie zabiť lead ingest a naopak |
| Google verification | `gmail.readonly` je **restricted**; miešanie so `gmail.send` zväčšuje audit plochu |

### Scope návrh (fáza 1, po GO)

Povolené:

- `https://www.googleapis.com/auth/gmail.readonly` — čítanie správ (Google iný "len tento label" scope **nemá**)
- `https://www.googleapis.com/auth/gmail.labels` — vytvoriť/nájsť label `Revolis/Dopyty` (sensitive, nie restricted)

Zakázané:

- `gmail.send`, `gmail.compose`, `gmail.modify` (žiadny trash/archive v MVP)
- `gmail` (full), IMAP, app passwords, n8n "Gmail Revolis" credential ako produkčný ingest
- Domain-wide delegation / Workspace DWD

**Úprimnosť voči súhlasu:** Google consent screen povie "čítanie Gmailu", nie "len jeden štítok". Produktová zmluva: Revolis **volá API len na správy s dohodnutým labelId**. To je operational least privilege, nie Google-enforced. Zákaznícka kópia to musí povedať nahlas — inak 6(1)(a) nie je informovaný súhlas.

Samostatný OAuth client v Google Cloud (názov placeholder: `revolis-gmail-inbound-readonly`). **Žiadne reálne client ID/secret v tomto dokumente ani v gite.**

---

## 6. Token storage — náčrt (neaplikovať)

Neznovupoužiť `profile_google_calendar`. Nová tenant tabuľka, **service_role only**, RLS zapnuté, žiadne GRANT pre `authenticated`.

```sql
-- SKETCH ONLY. This PR does not add a migration.

create table public.agency_gmail_inbound (
  agency_id uuid primary key references public.agencies(id) on delete cascade,
  gmail_address text not null,
  label_id text not null,
  label_name text not null default 'Revolis/Dopyty',
  refresh_token_ciphertext text not null,
  token_key_version text not null,
  scopes text[] not null,
  granted_by_profile_id uuid not null references public.profiles(id),
  consent_recorded_at timestamptz not null default now(),
  last_history_id text,
  last_pulled_at timestamptz,
  last_error text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- optional processed ids (bounded, not a second lead store)
-- agency_gmail_inbound_messages (agency_id, gmail_message_id pk, acquired_at)

alter table public.agency_gmail_inbound enable row level security;
-- no policies for authenticated / anon
```

Šifrovanie: application-level (AES-GCM) kľúčom z env placeholder `GMAIL_INBOUND_TOKEN_KEY` / KMS. **Nie** plaintext `refresh_token` ako dnes v `profile_google_calendar` — inbound je širší grant; vault má byť prísnejší. Calendar plaintext sa v tomto PR **nerobí**.

Logy: nikdy token, nikdy raw mail dump. Max `agency_id`, `gmail_message_id`, `lead_created`, `requestId`.

---

## 7. Ingest job (fáza 2, po GO)

- Trigger: Vercel cron (existujúci pattern `Authorization: Bearer CRON_SECRET`, pozri `apps/crm/src/app/api/cron/*`) **alebo** krátky Worker. Jedna cesta, nie obe.
- Periodicita MVP: 1-5 min. Gmail push (`users.watch` + Pub/Sub) je **neskôr**, nie MVP.
- Pre každý riadok `agency_gmail_inbound` kde `revoked_at is null`:
  1. Refresh access token.
  2. `users.messages.list?labelIds={label_id}` (+ `history.list` ak je `last_history_id`).
  3. `users.messages.get(format=full)` len pre nové ID.
  4. POST existujúceho acquire kontraktu (časť 4).
  5. Update `last_history_id` / `last_pulled_at`. Pri 401/invalid_grant nastav `last_error`, **necykli** refresh donekonečna.
- Idempotencia: Gmail ID set + existujúci `acquire_dedup_keys`.
- Tenant isolation: job nikdy nepoužije token agentúry A na mailbox B. `agencyId` v payload = PK riadku, nie odhad z From.

`lib/acquisition/sync/` sa **nepoužíva** (Google Ads sync, iný bounded context).

Cloudflare `email-gateway` ostáva. Rovnaký `agencyId` + rovnaký dedup = dvojitý vstup (forward + pull) nesmie spraviť dva leady.

---

## 8. Fázovaný plán (additive, až po GO)

### Fáza 0 — tento PR

Dokument. STOP.

### Fáza 1 — súhlas bez ingestu

1. Google Cloud OAuth client (readonly) v testing mode; test users = founder + referenčný tenant.
2. Migrácia `agency_gmail_inbound` + encrypt helper.
3. Settings: "Pripojiť Gmail (dopyty)" / "Odpojiť".
4. OAuth start/callback **oddelené** od `/api/integrations/google/*` (nové cesty, iný redirect URI, iný state bound na `agency_id` + `profile_id`).
5. Po callback: overiť scopes, vytvoriť/nájsť label, uložiť ciphertext.
6. Revoke path end-to-end (časť 10) **pred** pullom.
7. Smoke: connect → DB riadok → revoke → token neplatný. **Žiadne čítanie mailov.**

### Fáza 2 — pull do existujúceho pipeline

1. Cron/job ako v časti 7.
2. Jeden tenant (referenčný alias z ZISTI), shadow: najprv log `would_post`, potom ostrý POST.
3. Overenie: nový `last_received_at`, lead v CRM, dedup pri opaku.
4. Verification test na adapter (živá špecifikácia) **v tom istom implementačnom PR**.

### Fáza 3 — cutover u zákazníka

1. Kópia z časti 9.
2. Zákazník vypne Gmail auto-forward.
3. Filter: portálové dopyty → label.
4. 48h dual-run (forward ešte zapnutý **alebo** ručný dohľad), potom forward OFF.
5. Checklist: `agencies.email` **nie je** inbound alias.

### Fáza 4 — Google verification (ak treba ísť mimo test users)

Restricted `gmail.readonly` → OAuth verification, security assessment (CASA) podľa aktuálnych Google pravidiel. **Nespúšťať** pred dôkazom, že Fáza 2 drží leady. Náklady/čas = founder rozhodnutie.

### Mimochodom, nie V4-B kód v tomto PR

- Denylist inbound aliasov v `resolveInboundFromEmail` — samostatný malý PR po GO.
- Mŕtvy `agency-map.ts` kľúč — nerieši live routing; upratanie nie je DMARC fix.
- `feat/inbound-triage-signal` — netreba mergovať kvôli V4-B.

---

## 9. Zákaznícka kópia (SK)

Outcome jazyk (Clay): nejde o "AI Gmail integráciu". Ide o to, **aby dopyty z portálov neskončili v spame a nestratili sa**.

**Nadpis:** Dopyty z Gmailu do Revolisu — bez preposielania

**Krátky text do Settings:**

> Preposielanie z Gmailu na adresu Revolisu vie zablokovať ochrana pošty (DMARC). Preto Revolis dopyty **sťahuje** z jedného označeného štítku vo vašom Gmaile.
>
> **Čo urobíte**
> 1. V Gmaile vypnite automatické preposielanie na `*@revolis.ai`.
> 2. Vytvorte štítok `Revolis / Dopyty` (alebo nechajte Revolis, aby ho vytvoril po súhlase).
> 3. Nastavte filter: dopyty z portálov (Nehnuteľnosti.sk, Reality.sk, ...) → tento štítok.
> 4. Kliknite **Pripojiť Gmail** a potvrďte súhlas.
>
> **Čo Revolis číta**
> Iba správy s týmto štítkom. Používa ich na založenie dopytu v CRM — meno, e-mail, telefón, text, inzerát.
>
> **Čo Revolis nečíta a nerobí**
> Neposiela poštu týmto súhlasom. Nemaže ani nearchivuje vaše správy. Nepoužíva Gmail na marketing. Ostatné vlákna (osobná pošta, iné kancelárske veci) do Revolisu neťaháme.
>
> **Čo uvidíte na obrazovke Google**
> Google žiada oprávnenie "čitať Gmail", lebo iný užší súhlas neponúka. Revolis aj tak sťahuje **len označený štítok**. Súhlas môžete kedykoľvek odobrať v Revolise (Odpojiť Gmail) aj v účte Google (Tretie strany).

**Po odpojení:** ďalšie dopyty z Gmailu do CRM neprídu, kým znova nepripojíte (alebo kým nepoužijete záložný alias — to nie je odporúčaný bežný režim).

Žiadne meno referenčného klienta v UI.

---

## 10. Riziká a kontroly

### Google OAuth verification

- `gmail.readonly` = restricted. Production users mimo allowlistu zlyhajú, kým nie je app verified.
- CASA / security questionnaire môže trvať týždne a stáť peniaze.
- Mitigácia: Fáza 1-3 v testing mode na 1 tenanta. Fáza 4 len s founder GO.

### Token storage

- Refresh token = kľúč k schránke. Únik = čítanie pošty RK.
- Mitigácia: ciphertext, service_role only, žiadny client bundle, rotácia `token_key_version`, audit `granted_by_profile_id` + `consent_recorded_at`.
- Existujúci plaintext Calendar token **nenapodobňovať**.

### GDPR

| Otázka | Postoj tohto dizajnu |
|---|---|
| Právny základ prístupu k schránke | **Art. 6(1)(a)** — informovaný súhlas RK (OAuth + text v časti 9). Súhlas musí byť odvolateľný rovnako ľahko ako udelený. |
| Spracovanie údajov v dopytoch (záujemcovia) | RK je prevádzkovateľ; Revolis **sprostredkovateľ** podľa existujúcej DPA. Nie je to nový scraping tretích strán. Zdroj = schránka zákazníka (first-party voči RK). |
| 6(1)(f) | **Nepoužívať** ako základ pre čítanie Gmailu. Balancing test tu nesedí namiesto súhlasu. |
| Minimalizácia | Len označený label; žiadne prílohy do object storage v MVP, kým parser nepotrebuje (dnes `parseEmail` berie subject/text/html). |
| Účel | Založenie leadu v CRM. Nie model training, nie resale. |
| Retencia | Lead podľa existujúcich CRM pravidiel; Gmail kópie v Revolise **nearchivovať** mimo `leads.note` / parser polí. |
| Záznam | `consent_recorded_at`, scopes, `granted_by_profile_id`. |

Pred implementáciou (iné PR): GDPR advisor skill vs `docs/architecture/master-data-sourcing-map.md`. Ak zdroj "Gmail zákazníka, označený label" v mape nie je, **doplniť mapu v tom istom implementačnom PR** — neskúšať hádať iný zdroj.

### Least privilege

Produkt číta len label. Google scope je širší — zdokumentované v časti 5. Žiadny send. Job beží so service role len na svoju tabuľku + volanie acquire (shared secret, nie user JWT).

### Revoke path (musí existovať skôr ako pull)

1. UI **Odpojiť Gmail** → `POST` revoke na `https://oauth2.googleapis.com/revoke` → `revoked_at=now()`, ciphertext overwrite/delete, stop job.
2. Google Account → Tretie strany → odobrať Revolis inbound app.
3. Ak refresh zlyhá `invalid_grant`: označiť disconnected, UI "Pripojenie vypršalo", **žiadny silent reconnect**.
4. Cloudflare alias ostáva; forward sa **automaticky nezapína**.

### Ďalšie

| Riziko | Mitigácia |
|---|---|
| Zákazník nechá forward aj pull | Dedup v acquire |
| Zákazník dá do `agencies.email` alias | Checklist Fáza 3 + neskôr denylist From (iný PR) |
| Široký filter (celý inbox → label) | Onboarding: filter = portálové dopyty, nie `from:(*)` |
| n8n Gmail credential | Nie je produkčný ingest; neriešiť v V4-B |
| Worker `email-gateway` untracked | Fallback ostáva ops riziko; V4-B ho nenaťahuje do gitu v tomto PR |

---

## 11. Constitution (Founder Reality Check)

Skóre je **podklad pre founder GO**, nie oprávnenie stavať.

| # | Otázka | Verdikt |
|---|---|---|
| 1 | Zaplatil by dnešný klient? | **Áno.** Lead ingest je to, za čo RK platí. `last_received_at=2026-07-14` = ticho na dopytoch. Strop VALIDATE sa tu **neuplatňuje**. |
| 2 | Zarobí klient viac do 90 dní? | Mechanizmus: zachránené portálové dopyty → telefonát. Bez čísla konverzie — nefantazírovať EUR. |
| 3 | Skráti Lead → Provízia? | Zachraňuje **vstup** reťaze, nie obhliadku. |
| 4 | Moat? | Slabý moat (OAuth pull nie je unikát). Hodnota je **retencia**, nie ohrada. |
| 5 | Flywheel? | Áno slabo: viac reálnych leadov v CRM → používanie. |
| 6 | Nové unikátne dáta? | Nie. Tie isté dopyty, spoľahlivejší kanál. |
| 7 | Vyššie ROI ako ostatný backlog? | **Neznáme — HUMAN.** Founder porovná vs iné Vlna 4 lane. |
| 8 | Správny čas? | **Nie "príliš skoro".** Ide o živý kanál platiaceho tenanta. Veto timing sa **neuplatňuje**. Aj tak: implementácia až po GO (Google verification / súhlas). |
| 9 | MVP < 2 týždne? | Fáza 1+2 na jednom tenante: možné. Fáza 4 verification: nie. |
| 10 | Founder trap? | Pozor na "postavíme Gmail platformu". Scope = jeden label → existujúci acquire. |
| 11 | Najlepší čas foundera? | GO/NO-GO a Google Cloud app verification — áno. Kód — nie, až po GO. |
| 12 | Jediná vec v kvartáli? | **Nie nutne.** Je to oprava kanála, nie nový produkt. |

Odhad **9/12 VALIDATE→BUILD po GO**. Veto 1 a 8 neblokujú. **Tento PR ostáva dokument.** BUILD začína až písomným GO.

---

## 12. Non-goals

- Druhý lead ingest / nový parser / zmena `parseEmail`.
- Gmail send, draft, auto-reply z Gmail API (auto-response ostáva Resend + `resolveInboundFromEmail`).
- Čítanie celej schránky "pre istotu".
- Microsoft 365 / IMAP v V4-B.
- Marketing case study na referenčnom klientovi.
- Merge `feat/inbound-triage-signal`.
- Zmeny Vercel Build/Install/Output.
- Úprava `lib/acquisition/sync/` (Ads).

---

## 13. GO brána

Implementácia Fázy 1 **nesmie** začať, kým founder nepovie:

> **GO V4-B** — OAuth pull, Fáza 1 (súhlas + vault, bez čítania mailov).

Odporúčaný ďalší GO až po Fáze 1:

> **GO V4-B Fáza 2** — pull → `POST /api/acquire/email` na jednom tenante.

Bez týchto viet: **STOP**.