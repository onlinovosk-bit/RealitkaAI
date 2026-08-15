---
id: inbound-oauth-pull-design
title: "V4-B inbound OAuth pull (DMARC) — design only"
type: design
status: proposed
version: 0.1.0
owner: "Production reliability / inbound acquire"
lane: "Vlna 4 / V4-B"
created_at: 2026-08-15
updated_at: 2026-08-15
confidentiality: internal
canonical: false
implementation: STOP
verified_against_sha: "9109a73e60b2eb7df453ad96a6c1f732ed0d708b"
evidence:
  - docs/reports/2026-08-17-inbound-zisti.md
  - apps/crm/src/app/api/acquire/email/route.ts
  - apps/crm/src/lib/acquire/send-inbound-auto-response.ts
  - apps/crm/src/lib/acquire/agency-map.ts
  - apps/crm/src/app/api/integrations/google/auth/route.ts
  - apps/crm/supabase/migrations/20260424_google_calendar_oauth.sql
depends_on:
  - docs/architecture/revolis-constitution-v2.md
  - docs/architecture/master-data-sourcing-map.md
  - docs/architecture/clay-positioning-reframe.md
---

# V4-B inbound OAuth pull — design only

**Tento dokument je návrh. Žiadny aplikačný kód, migrácia, worker ani token
sa v tomto PR nerealizuje. Implementácia začína až po explicitnom GO
foundera.**

Cieľ: nahradiť zákaznícky Gmail auto-forward do Revolis inbound aliasu
**pull modelom** (OAuth read-only + label), ktorý kŕmi **existujúci**
`POST /api/acquire/email`. Druhý lead-ingest pipeline sa nestavia.

---

## 0. STOP

| Brána | Stav |
|---|---|
| Tento PR | DESIGN ONLY |
| Aplikačný kód / workers / migrations / `lib/acquisition/sync/` | **NEMENÍ SA** |
| Merge do `main` | **NIE** — founder review, nie implementácia |
| Implementačný PR | **ZAKÁZANÝ**, kým founder nepovie **GO** |

Ak niekto otvorí implementačný PR bez GO, zatvoriť ho. Tento dokument nie je
objednávka práce.

---

## 1. Prečo toto existuje (merané, nie predpoklad)

ZISTI 2026-08-15 (`docs/reports/2026-08-17-inbound-zisti.md`, commit
`f073a03c5` / PR #402; na `origin/main` v čase tohto dokumentu **nie je**):

| Fakt | Hodnota |
|---|---|
| Alias | `smolko-a7f2@revolis.ai` |
| Tenant | Reality Smolko `11111111-1111-1111-1111-111111111111` |
| Cesta | Cloudflare Email Routing → Worker `email-gateway` → `inbound_mailboxes` → `POST /api/acquire/email` s `mailbox.agencyId` |
| Prod `last_received_at` | `2026-07-14 20:53:09+00` (v čase merania ~mesiac ticho) |
| Ďalšie mailboxy | `demo-3f7a@revolis.ai` → Revolis Demo; `aa-reality-kosice-s-r-o-6461@revolis.ai` → AA REALITY Košice |
| CRM route na `main` | berie `payload.mailbox.agencyId`, nie `agency-map.ts` |
| `agency-map.ts` | mŕtvy kľúč `smolko@inbound.revolis.ai` — **nie je live router** |
| `feat/inbound-triage-signal` @ `cb4559b98` | **žiadny PR**, 0 výskytov `smolko-a7f2`, nerieši alias/DMARC |

`smolko-a7f2@revolis.ai` je **interný dôkaz merania**. Nie je to public case
study. Zákaznícky copy v §7 Reality Smolko **nemenovať**.

---

## 2. Problém, ktorý V4-B rieši

### 2.1 Zákaznícky workaround (implikovaný meraním)

Live ingest dnes predpokladá, že dopyt **príde na Revolis alias**. Bežný
workaround u Gmail-first kancelárie: **Gmail auto-forward** portálových /
klientskych správ na `<slug>-<4hex>@revolis.ai`.

To je krehké:

1. **DMARC / alignment.** Forward mení envelope; SPF/DKIM portálu sa na
   Revolis MX nemusí zhodovať. Cloudflare routing + Worker vidí
   preposlanú správu, nie originálny SMTP handshake.
2. **Operatívna tma.** `last_received_at=2026-07-14` znamená, že push na
   alias **nie je spoľahlivý heartbeat** — buď forward prestal, alebo
   dopyty tam nechodia.
3. **Onboarding copy to dnes prikazuje.** `docs/runbooks/onboard-new-agency.md`
   stále hovorí „preposielajte dopyty na alias“. To je presne cesta, ktorú
   treba vypnúť.

### 2.2 DMARC pasca na odosielacej strane (súvis, nie ten istý bug)

`resolveInboundFromEmail` (`apps/crm/src/lib/acquire/send-inbound-auto-response.ts`):

- ak je `replyTo` na `revolis.ai` alebo `*.revolis.ai`, použije ho ako
  **From**;
- inak overený outreach sender / `onboarding@mg.revolis.ai`.

ZISTI: `agencies.email` u meraného tenanta je **`null`** → fallback na
owner/outreach. **Rozbije sa**, ak niekto nastaví `agencies.email` na
inbound alias (`smolko-a7f2@revolis.ai`). Auto-odpoveď by šla From aliasu,
ktorý nie je overený odosielateľ a koliduje s DMARC.

Toto **nie je** dôvod stavať druhý ingest. Je to dôvod:

- pullom **neposielať** originál cez Revolis MX;
- v implementácii (až po GO) **zakázať** inbound alias ako `agencies.email`
  / From (malý guard, samostatný PR, nie tento).

### 2.3 Čo V4-B nerieši

- `feat/inbound-triage-signal` (AI triáž + `new_lead`) — iná vetva, bez PR.
- Oprava mŕtveho `agency-map.ts` — dead code, nie live router.
- Google Ads OAuth (`/api/acquisition/google/connect`) — iný produkt.
- Existujúci Calendar + `gmail.send` OAuth — **iné privilege**, nemiešať.

---

## 3. Founder Reality Check (Ústava v2)

Hodnotenie pre **tento návrh**, nie pre implementáciu. Strop bez GO =
VALIDATE.

| # | Otázka | Verdikt |
|---|---|---|
| 1 | Zaplatil by za to dnešný klient? | **Áno ako retenciu.** Inbound dopyty sú začiatok Lead → provízia. Stale mailbox = stratené dopyty. VETO neplatí. |
| 2 | Zarobí klient viac do 90 dní? | Mechanizmus: portálový dopyt opäť pristane ako lead v CRM namiesto Gmailu, ktorý Revolis nevidí. |
| 3 | Skráti Lead → telefonát → …? | Obnovuje **krok 0** (dopyt vôbec existuje v CRM). |
| 4 | Moat? | Nie. Hygiene / deliverability. |
| 5 | Flywheel? | Slabo. Obnovuje first-party lead inflow, netvorí nové dáta. |
| 6 | Unikátne dáta? | Nie. Rovnaký `leads` insert ako dnes. |
| 7 | ROI vs backlog? | Vysoký **ak** platiaci tenant reálne forwarduje a mailbox je ticho. Inak overiť 1 hovorom pred kódom. |
| 8 | Timing? | **Správny čas na DESIGN.** Google restricted-scope verification môže byť „príliš skoro“ na plný prod rollout pred súhlasom Google — to je dôvod fáz, nie veto na dokument. |
| 9 | MVP < 2 týždne? | Kód poll + mapovanie na existujúci route: áno. **Google verification / CASA: nie.** |
| 10 | Founder trap? | Complexity Bias (OAuth vs „oprav forward“) a Technology Bias. Pull je zvolený, lebo forward je DMARC-krehký, nie lebo Gmail API je zaujímavé. |
| 11 | Najlepšie využitie času foundera? | GO/NO-GO + 1 overovací hovor so zákazníkom („stále forwardujete?“). Nie kód. |
| 12 | Jediná vec tento kvartál? | Nie. Je to **reliability lane**, nie kvartálny bet. |

**Skóre:** ~8–9 → **VALIDATE**. Ústava: otázka 1 nie je NIE, timing nie je
„príliš skoro“ na návrh. **BUILD kódu = len po GO.**

---

## 4. Navrhovaný model (pull, nie forward)

```
  Portál / klient
        |
        v
  Zákaznícky Gmail
  (filter → label napr. "Revolis")
        |  OAuth gmail.readonly
        v
  Revolis ingest job (cron, tenant-scoped)
        |  rovnaký JSON + x-shared-secret
        v
  POST /api/acquire/email
        |  parseEmail / dedup / leads insert / triage / auto-response
        v
  existujúci acquire pipeline
```

**Push cez Cloudflare alias ostáva.** Pull je **additive**. Alias slúži ako:

- fallback počas cutoveru;
- cesta pre tenantov, ktorí posielajú priamo na `@revolis.ai`;
- `email.to` v payloade, aby `last_received_at` na `inbound_mailboxes`
  ostalo pravdivé.

Zákazník **vypne Gmail auto-forward** až keď pull 24–48 h preukáže leady.

---

## 5. Existujúce povrchy — reuse vs. zákaz miešania

Overené na `main` @ `9109a73e6`.

### 5.1 Jediný ingest (POVINNÉ reuse)

`POST /api/acquire/email`:

- auth: header `x-shared-secret` vs `ACQUIRE_SHARED_SECRET` (timing-safe);
- `version === 1`;
- `payload.mailbox.agencyId` (Worker / job už vyriešil tenanta);
- `payload.email.{to,subject,text,html}` + `receivedAt`;
- ďalej: `parseEmail` → `dedupKey` / `acquire_dedup_keys` → `leads` insert
  → triage → auto-response;
- update `inbound_mailboxes.last_received_at` podľa `agency_id` + `email.to`.

Pull job **nesmie** insertovať do `leads` priamo. Volá túto route
(alebo vyčlenený interný handler s **totožnou** biznis logikou — to je
refaktor až v impl PR, nie nový pipeline).

### 5.2 Čo sa NEmieša

| Existujúce | Prečo nie pre V4-B |
|---|---|
| `/api/integrations/google/auth` scopes `calendar.events` + **`gmail.send`** | Iné privilege. Send ≠ read. Restricted Gmail read by nespúšťať „zadarmo“ cez calendar consent. |
| `profile_google_calendar` | Tokeny Calendar/send, scoped na **profile**, nie agency inbound. |
| `/api/integrations/gmail` IMAP (`gmail_imap` v `profile_integrations`) | Ukladá IMAP heslo. Nie label-scoped, nie OAuth, nie agency-level. **Nepoužiť.** |
| `agencyForInbound` / `agency-map.ts` | Dead map. Live router je `inbound_mailboxes` + `mailbox.agencyId`. |
| Google Ads connect | Iný OAuth client účel. |

Nový consent flow: **samostatný** OAuth purpose (`gmail.readonly` + label),
tenant = `agency_id`.

---

## 6. OAuth a least privilege

Google **nemá** scope „čítaj len tento label“. Least privilege je teda
**kombinácia** OAuth scope + aplikačný filter.

### 6.1 Scopes (návrh v1)

Povoliť:

- `https://www.googleapis.com/auth/gmail.readonly`

Nepýtať v tomto lane:

- `gmail.send` / `gmail.compose` / `mail.google.com`
- `gmail.modify` (v1 stačí lokálny cursor `historyId` + Gmail message id;
  „processed“ label by vyžadoval modify)
- Calendar scopes

`openid email` len ak treba overiť, ktorý Gmail účet súhlasil (zobraziť
v UI). Neskladovať profilové dáta Google naviac.

### 6.2 Aplikačný filter

- Zákazník (alebo Revolis pri onboardingu) vytvorí Gmail filter:
  portály / dopyty → label napr. `Revolis` (názov voliteľný, uložený
  `label_id`).
- Job číta **iba** `labelIds={label_id}`.
- Správy mimo labelu sa **nesťahujú, nelogujú, neparsujú**.

### 6.3 Google verification (hlavný časový rizikový bod)

`gmail.readonly` je **restricted** Gmail scope. Prod app s externými
používateľmi typicky potrebuje:

1. OAuth consent screen (External) + branding;
2. Google verification;
3. často CASA / security assessment pre Gmail restricted scopes.

**Dôsledok pre fázy:** interný test (Google test users / Internal app na
Workspace) môže ísť skôr. **Široký customer rollout až po verification.**
To je GO podmienka fázy F, nie dôvod písať kód v tomto PR.

Žiadne reálne `client_id` / secret v dokumente ani v gite.

---

## 7. Zákaznícky copy (SK) — outcome, nie „AI/OAuth“

Positioning: výsledok („dopyty z Gmailu sa objavia v Revolise bez
preposielania“), nie technológia. Reality Smolko sa v UI **nemenovuje**.

### 7.1 Nastavenia — pred súhlasom

**Nadpis:** Dopyty z Gmailu do Revolisu

**Telo:**

> Portálové dopyty, ktoré vám chodia do Gmailu, viete poslať do Revolisu
> bez automatického preposielania. Preposielanie z Gmailu na Revolis adresu
> vypnite — kazí doručovanie a dopyt sa môže stratiť.
>
> Kliknite na súhlas. Google sa spýta, či Revolis smie **čítať iba správy
> v označenom štítku** (napr. „Revolis“). Ostatné e-maily neotvárame a
> neukladáme.
>
> Po súhlasu uvidíte v Revolise nové dopyty ako leady — rovnako ako doteraz.

**CTA:** Pripojiť Gmail (iba označený štítok)

**Sekundárne:** Ako nastaviť štítok v Gmaile (filter z portálu → štítok)

### 7.2 Čo Revolis číta / čo nie (povinný blok súhlasu)

**Čítame**

- správy, ktoré máte označené zvoleným štítkom;
- predmet, text a základné kontaktné údaje z dopytu, aby vznikol lead.

**Nečítame / nerobíme**

- ostatné e-maily, prílohy mimo dopytu, celú schránku;
- odosielanie pošty z vášho Gmailu (tento súhlas nie je „odosielať ako vy“);
- zmena alebo mazanie správ v Gmaile.

**Odvolanie:** Nastavenia → Odpojiť Gmail. Revolis prestane sťahovať
správy. Súhlas viete zrušiť aj v Google účte (Aplikácie s prístupom).

### 7.3 Po cutovere (e-mail / in-app)

**Predmet:** Vypnite preposielanie dopytov z Gmailu

> Dopyty už berieme priamo z označeného štítka v Gmaile. Automatické
> preposielanie na adresu `@revolis.ai` vypnite, aby dopyt neprišiel dvakrát
> a aby sa nestratil kvôli doručovaniu.
>
> Alias `@revolis.ai` môžete nechať aktívny ako zálohu. Primárna cesta je
> štítok + súhlas.

Žiadne sľuby „AI agent číta váš Gmail“.

---

## 8. Token storage sketch (žiadne secret, žiadny apply)

Návrh schémy. **Nemigrovať v tomto PR.** Service role only. RLS deny pre
anon/authenticated. Nikdy nelogovať plaintext token, nikdy nedávať refresh
token do klienta.

```sql
-- SKETCH ONLY. Do not apply.

create table public.agency_gmail_inbound_oauth (
  agency_id uuid primary key references public.agencies(id) on delete cascade,
  granted_by_profile_id uuid not null references public.profiles(id),
  gmail_user_email text not null,
  refresh_token_ciphertext text not null,
  token_key_version text not null,
  scopes text[] not null,
  label_id text not null,
  label_name text not null,
  history_id text,
  last_pulled_at timestamptz,
  last_error text,
  status text not null check (status in ('pending', 'active', 'revoked', 'error')),
  consent_recorded_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agency_gmail_inbound_seen (
  agency_id uuid not null references public.agencies(id) on delete cascade,
  gmail_message_id text not null,
  acquired_at timestamptz not null default now(),
  primary key (agency_id, gmail_message_id)
);
```

Pravidlá:

- **1 riadok na agency** (inbound je tenant-level, ako `inbound_mailboxes`).
- Envelope encryption (app key / KMS), `token_key_version` kvôli rotácii.
- `scopes` musí obsahovať iba `gmail.readonly` (+ prípadne openid/email).
  Ak callback vráti navyše `gmail.send`, **odmietnuť uloženie**.
- Revoke: zmazať ciphertext, `status=revoked`, `revoked_at=now()`,
  Google `token/revoke`, zmazať `agency_gmail_inbound_seen` voliteľne
  (dedup v `acquire_dedup_keys` ostáva).
- Neukladať do `profile_google_calendar` ani `profile_integrations.config`.

Env (mená, nie hodnoty): `GOOGLE_GMAIL_INBOUND_CLIENT_ID`,
`GOOGLE_GMAIL_INBOUND_CLIENT_SECRET`, existujúci `ACQUIRE_SHARED_SECRET`,
`CRON_SECRET`. Oddelený OAuth client od Calendar/send, aj keby bol v tom
istom Google Cloud projekte.

---

## 9. Ingest job (fáza po GO)

### 9.1 Spúšťač

Nový cron v duchu existujúcich (`vercel.json` + `Authorization: Bearer CRON_SECRET`),
napr. `/api/cron/gmail-inbound-pull` každých 5 minút. Nie Worker
`email-gateway`.

### 9.2 Algoritmus (náčrt)

Pre každý riadok `status=active`:

1. Refresh access token (server-side).
2. `history.list` od `history_id` filtrované na `labelId`; fallback
   `messages.list` s `labelIds` ak history expirovala.
3. Pre nové message id: preskoč ak je v `agency_gmail_inbound_seen`.
4. `messages.get` (format=full) → subject + text/html.
5. POST existujúcej route:

```http
POST /api/acquire/email
x-shared-secret: <ACQUIRE_SHARED_SECRET>
x-revolis-request-id: gmail-pull:<agency_id>:<gmail_message_id>

{
  "version": 1,
  "receivedAt": "<internalDate ISO>",
  "mailbox": { "agencyId": "<agency_id>" },
  "email": {
    "to": "<inbound_mailboxes.email pre tento agency>",
    "subject": "...",
    "text": "...",
    "html": "..."
  }
}
```

6. Pri `ok: true` (lead alebo `not_a_lead` / duplicate) zapíš seen + nový
   `history_id`.
7. Chyby: `status=error`, `last_error` **bez** tokenu / bez tela mailu;
   neblokovať ostatné tenantov.

`email.to` = Revolis alias z `inbound_mailboxes`, nie Gmail adresa
zákazníka — inak `last_received_at` update v route netrafí riadok.

### 9.3 Idempotencia

Dvojitá:

- `agency_gmail_inbound_seen` (Gmail id);
- existujúci `acquire_dedup_keys` (obsah dopytu).

Cutover window (forward ešte zapnutý): duplicita je **očakávaná** a
existujúci dedup ju má zhltnúť. Preto forward vypínať až po dôkaze.

---

## 10. Fázovaný plán (additive, po GO)

| Fáza | Čo | Exit | NIE |
|---|---|---|---|
| **S** | Tento dokument + founder GO | Písomné GO | Kód |
| **A** | Google Cloud: oddelený OAuth client, Internal/test users, consent copy | Test user vie consentnúť na staging | Prod verification, CRM kód v `main` |
| **B** | Schema + encrypt + connect/revoke UI (1 tenant, staging) | Token v DB, revoke maže token, žiadny pull | Čítanie mailov |
| **C** | Pull cron → `POST /api/acquire/email` | 1 test dopyt v `leads` cez pull, nie cez forward | Vypnutie aliasu |
| **D** | Pilot 1 platiaci tenant: label + 48 h dual-run | `last_received_at` sa hýbe z pullu; 0 únikov mimo labelu | Hromadný rollout |
| **E** | Zákazník vypne Gmail forward; onboarding runbook prepíše copy | Forward off; alias ostáva fallback | Drop Cloudflare routing |
| **F** | Google restricted-scope verification | Externí zákazníci môžu consentnúť | Obchádzať verification test usermi v prode |

Každá fáza = **vlastný PR** (Zlaté pravidlo: 1 PR = 1 logická zmena +
preview). Fáza S je tento PR.

Paralelný mini-PR (až po GO, nie nutne v lane V4-B kóde): guard
`resolveInboundFromEmail` / settings, aby inbound alias nikdy nebol From.

---

## 11. GDPR a právny základ

Zdroj: zákaznícky Gmail, **nie** scraping portálu. Portálové fakty v tele
mailu spracúva už dnešný acquire (first-party ingest po tom, čo dopyt
prišiel kancelárii).

| Spracovanie | Základ | Poznámka |
|---|---|---|
| Čítanie schránky / labelu | **Art. 6(1)(a) súhlas** | Explicitný Google consent + in-app záznam `consent_recorded_at`, kto udelil (`granted_by_profile_id`). |
| Lead v CRM po ingest | existujúci vzťah kancelária–dopyt (zmluva / 6(1)(b) na strane kancelárie ako prevádzkovateľa) | Revolis je spracovateľ; nemení sa model acquire. |
| 6(1)(f) legitimate interest | **Nepoužiť** na čítanie Gmailu | Balancing test neospravedlní mailbox access. |

Povinnosti pred impl (gdpr-advisor na GO, nie teraz):

- DPA / záznam spracovania: nový účel „načítanie označených správ z Gmailu“.
- Minimálne údaje: subject/body dopytu, nie celá schránka.
- Retencia: lead podľa existujúcej CRM politiky; Gmail token kým je
  `active`; po revoke okamžite zmazať ciphertext.
- Právo odvolať súhlas: in-app + Google account.
- Žiadne školenie modelu na tele mailu v tomto lane (ak nie je už
  zdokumentované pri triage — nemeniť scope).

---

## 12. Riziká a rollback

| Riziko | Závažnosť | Mitigácia |
|---|---|---|
| Google verification / CASA oneskorenie | Vysoká | Fáza A interná; Fáza F blokuje multi-tenant prod. |
| Token theft (refresh v DB) | Vysoká | Envelope encrypt, service role only, audit revoke, oddelený client od `gmail.send`. |
| Scope creep (`gmail.send` v tom istom consent) | Vysoká | Samostatný OAuth client; reject ak scope ≠ readonly. |
| Čítanie mimo labelu (bug) | Vysoká | Query výhradne `labelIds`; test na správe bez labelu = 0 GET body. |
| GDPR: spracovanie bez súhlasu | Vysoká | 6(1)(a) + revoke path pred pilotom. |
| Dual ingest (forward + pull) | Stredná | Existujúci dedup; copy na vypnutie forwardu. |
| `agencies.email` = alias | Stredná | Samostatný From-guard PR. |
| `last_received_at` ticho | Stredná | Heartbeat: alert ak `active` OAuth a 24 h bez pull success. |
| IMAP leftover heslá | Nízka | V4-B ich nepoužíva; neskôr deprecate `gmail_imap`. |
| Worker `email-gateway` untracked | Nízka pre pull | Pull nezávisí od workera; alias fallback áno — verziovať worker inde. |

**Rollback fázy D/E:** vypnúť cron flag per-tenant (`status` ≠ `active`),
obnoviť forward na alias, token revoke. Alias sa v tomto lane **nemaže**.

---

## 13. Overenie (až implementačný PR, nie teraz)

Živá špecifikácia: `apps/crm/tests/verification/` — v impl PR doplniť
napr. `gmail-inbound-pull.verification.test.ts`:

- job volá `POST /api/acquire/email` (string contains), nie `from("leads").insert`;
- OAuth URL neobsahuje `gmail.send` ani `mail.google.com`;
- token table nie je `profile_google_calendar`;
- cron auth = `CRON_SECRET`.

Lokálne: žiadny `npm run build` v tomto docs PR ako podmienka merge
implementácie — tu sa nič nestavia.

---

## 14. Otvorené otázky pre foundera (GO checklist)

Zodpovedať **pred** fázou B:

1. Potvrdil platiaci tenant, že dopyty idú Gmail auto-forwardom na alias?
   (`last_received_at` 2026-07-14 to len implikuje.)
2. Akceptujeme Google restricted-scope timeline (týždne–mesiace), alebo
   hľadáme dočasný non-Gmail kanál (manuálny forward klientom, portálový
   webhook)?
3. Pilot: jeden tenant, staging najprv?
4. Label názov default `Revolis` — OK?
5. GO / NO-GO na fázu A (Google Cloud client, žiadny CRM kód).

---

## 15. Rozhodnutie

| Položka | Hodnota |
|---|---|
| Lane | V4-B DMARC / inbound reliability |
| Dokument | DESIGN ONLY |
| Implementácia | **STOP — GO dá founder** |
| Ingest | Iba existujúci `POST /api/acquire/email` |
| Next | Founder GO na fázu A, alebo NO-GO + iný kanál |
