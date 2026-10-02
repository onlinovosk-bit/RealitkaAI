# Gmail inbound pull — setup pre foundera (V4-B)

Mock-first, dokončené pre pilot jedného tenanta (trvalý dedup, spúšťač, stopa v `cron_runs`): `apps/crm/src/lib/inbound/` + `GET|POST /api/inbound/gmail-pull`.
Testy nevolajú živé Google. Token nikdy do gitu. Iba Preview / 1 test účet.
Production + zákazník až po tvojom GO.

Tok: Gmail štítok → OAuth refresh → `inbound_mailboxes.email` ako `email.to` →
existujúci `POST /api/acquire/email`. Alias ostáva fallback. Forward vypni
až po 24–48 h dual-run.

## 1. Google Cloud (oddelený OAuth client)

1. [Google Cloud Console](https://console.cloud.google.com/) → projekt, ktorý **nie je** Calendar/Ads.
2. **APIs & Services → Library** → Gmail API → **Enable**.
3. **OAuth consent screen**
   - Internal (Workspace) alebo External + Test users (iba tvoj Gmail).
   - App name: `Revolis inbound`.
   - Scopes → **iba** `https://www.googleapis.com/auth/gmail.readonly`.
   - **NEpridávaj** `gmail.send`, `gmail.compose`, `gmail.modify`, `mail.google.com`, Calendar.
4. **Credentials → Create → OAuth client ID** → Web application.
   - Redirect URI: `https://developers.google.com/oauthplayground`
   - Client ID + secret do password managera. Do repa nie.

## 2. Consent + refresh token

1. Otvor [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
2. Ozubené koliesko → **Use your own OAuth credentials** → vlož Client ID + secret.
3. Vľavo: Gmail API v1 → zaškrtni **iba** `https://www.googleapis.com/auth/gmail.readonly`.
4. **Authorize APIs** → prihlás test Gmail → Allow.
5. **Exchange authorization code for tokens**.
6. Skopíruj **Refresh token** (`1//…`). Access token neukladaj.
7. Ak `scope` obsahuje `gmail.send` / `mail.google.com` → zmaž client a začni od §1.

## 3. Štítok v Gmaile

1. Gmail → **More → Create new label** → `Revolis`.
2. Settings → **Filters and Blocked Addresses → Create a new filter**
   - From: portály (`nehnutelnosti.sk`, `bazos.sk`, …) alebo subject dopytov.
   - Apply the label `Revolis`. Neprepisuj, nepreposielaj, nemaž.
3. Label ID: Playground → Gmail API v1 → `users.labels.list` → skopíruj `id` (`Label_…`).

## 4. Kam vložiť token

Vercel → CRM projekt → **Settings → Environment Variables** → **Preview**:

| Key | Value |
|---|---|
| `GOOGLE_GMAIL_INBOUND_CLIENT_ID` | Client ID z §1 |
| `GOOGLE_GMAIL_INBOUND_CLIENT_SECRET` | Client secret z §1 |
| `GOOGLE_GMAIL_INBOUND_REFRESH_TOKEN` | Refresh token z §2 |
| `GOOGLE_GMAIL_INBOUND_LABEL_ID` | `Label_…` z §3 |
| `GOOGLE_GMAIL_INBOUND_AGENCY_ID` | UUID tenanta (`inbound_mailboxes.agency_id`) |
| `GMAIL_INBOUND_PULL_ENABLED` | `true` |
| `ACQUIRE_SHARED_SECRET` | existujúci gateway secret |
| `CRON_SECRET` | existujúci cron secret |
| `NEXT_PUBLIC_APP_URL` | Preview URL bez lomítka na konci |

Prázdny kontrakt: `apps/crm/.env.example`. Lokálne: tie isté kľúče v `.env.local`.

## 5. Overenie (bez zákazníckeho mailu)

`curl -i -X POST "$PREVIEW/api/inbound/gmail-pull" -H "Authorization: Bearer $CRON_SECRET"`

Očakávaj `200` a `posted >= 1` na správe so štítkom. Lead ide cez
`POST /api/acquire/email`, nie priamy insert do `leads`.

## Ochrana endpointu

- `/api/inbound/gmail-pull` nie je v `PUBLIC_PATHS`. Proxy ho prepustí iba ako
  explicitnú service route v `CRON_AUTH_API_PATHS`; handler potom vyžaduje
  presnú hlavičku `Authorization: Bearer $CRON_SECRET` a bez nej zlyhá s 401.
- Ochranu oboch vrstiev kryje
  `tests/verification/inbound-gmail-pull-auth.verification.test.ts` a route unit
  testy vrátane chýbajúceho alebo nesprávneho secretu.

## 6. Spúšťač (GMAIL-PULL-FINISH)

Vercel Hobby nedovolí cron častejší než denný, takže pull spúšťa GitHub Actions
`.github/workflows/gmail-inbound-pull.yml` (každých ~10 min, `workflow_dispatch` na ručný beh).
Repo → Settings → Secrets → Actions: `CRM_BASE_URL` (production URL bez lomítka) a `CRON_SECRET`
(rovnaký ako vo Verceli). Kým nie sú, job sa čisto preskočí. **Kill switch:** `GMAIL_INBOUND_PULL_ENABLED`
vo Verceli (`false` → endpoint nič nečíta).

Voliteľne `GOOGLE_GMAIL_INBOUND_LOOKBACK_DAYS` (1–14, default 3): ako ďaleko dozadu hľadá.
Migrácia `20261002090000_gmail_inbound_seen.sql` musí byť aplikovaná pred zapnutím (inak
`seen_store_read_failed` a pull nič nečíta — to je zámer).

## 7. Prevádzka a poruchy

- Trvalá stopa: `select * from cron_runs where job='gmail-inbound-pull' order by started_at desc limit 20;`
  (zapisuje sa iba beh s novými správami alebo chybou).
- `oauth_refresh_failed:invalid_grant` = token vypršal/odvolaný (aplikácia v *Testing* režime ho ruší po 7 dňoch).
  Dopyty **neprichádzajú**, kým sa nezíska nový refresh token (§2). Forward na alias preto ostáva zálohou.
- `seen_store_read_failed` / `seen_store_unavailable` = chýba migrácia alebo DB; pull zámerne nič nečíta.
- `acquire_rejected_4xx` = ingest odmietol payload natrvalo; správa sa zapíše ako vybavená, aby sa netočila.
- Odpojenie zákazníka: v Google účte *Zabezpečenie → Aplikácie s prístupom* odobrať „Revolis inbound",
  vo Verceli zmazať `GOOGLE_GMAIL_INBOUND_REFRESH_TOKEN`, `GMAIL_INBOUND_PULL_ENABLED=false`.

## 8. Cutover so zákazníkom (poradie)

1. Zákazník vytvorí filter portály → štítok `Revolis` (§3). **Preposielanie ešte nevypína.**
2. Zapnúť pull, 24–48 h dual-run: `last_received_at` sa hýbe, leady sa nezdvojujú (dedup).
3. Až potom zákazník vypne auto-forward. Alias ostáva ako záloha.

GDPR: pred krokom 2 prejsť `docs/architecture/inbound-gmail-pull-gdpr.md` §5.

## STOP / follow-up

- Token je v env (pilot, 1 tenant). Šifrovaná tabuľka a odpojenie v UI = fáza B návrhu, nerobené.
- Restricted-scope verification = fáza F. Forward na alias tu nevypínaj, kým nie je dual-run dokázaný.
