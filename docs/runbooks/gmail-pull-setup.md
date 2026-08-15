# Gmail inbound pull — setup pre foundera (V4-B)

Mock-first: `apps/crm/src/lib/inbound/` + `GET|POST /api/inbound/gmail-pull`.
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

## STOP / follow-up (mimo tento PR)

- `/api/inbound/*` nie je na session bypass. Live curl bez session dostane 401
  z `middleware.ts` / `proxy.ts`, kým follow-up nepridá `BYPASS_PREFIXES` +
  `CRON_AUTH_API_PATHS`. Unit testy volajú handler priamo.
- Žiadny `vercel.json` cron. Žiadna token tabuľka / revoke UI (fáza B).
- Restricted-scope verification = fáza F. Forward na alias tu nevypínaj.
