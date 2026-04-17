# Email Delivery Setup (Provider Switch: RESEND | BREVO | SMTP) — Revolis.AI

Tento postup zapne:
- odosielanie e-mailov pre `DPA request` a `Support request`,
- auto-ticketing cez webhook (Slack/Linear/Jira webhook endpoint),
- reply-to flow na pôvodného žiadateľa.
- prepínanie email provideru cez env bez zmeny UI/kódu endpointov.

---

## 1) Vyber provider cez env

Appka podporuje tri režimy:
- `EMAIL_PROVIDER=RESEND`
- `EMAIL_PROVIDER=BREVO`
- `EMAIL_PROVIDER=SMTP`

Ak `EMAIL_PROVIDER` nenastavíš, default je `RESEND`.

---

## 2) Priprav doménu pre odosielanie

Odporúčané:
- hlavná doména: `revolis.ai`
- transakčná subdoména: `mg.revolis.ai` (lepšia reputácia ako odosielať z root domény)

V Resend:
1. Add domain (`mg.revolis.ai`).
2. Pridaj DNS záznamy podľa Resend wizardu:
   - SPF (TXT),
   - DKIM (CNAME/TXT podľa inštrukcie),
   - Return-Path/Bounce (ak je vyžadované).
3. Počkaj na verifikáciu.

---

## 3) Nastav DNS baseline (deliverability minimum)

V DNS provideri over:
- SPF: obsahuje Resend include a nie je viac SPF TXT naraz pre rovnaký host.
- DKIM: aspoň 1 valid kľúč (ideálne podľa Resend defaultu).
- DMARC:
  - host: `_dmarc.revolis.ai`
  - hodnota (start): `v=DMARC1; p=none; rua=mailto:dmarc@revolis.ai; fo=1`
  - po stabilizácii prepnúť na `p=quarantine` a neskôr `p=reject`.

---

## 4) Vercel environment variables (Production)

Nastav vo Vercel projekte:

### Spoločné (inbound route konfigurácia)
- `LEGAL_INBOX` = `legal@revolis.ai`
- `SUPPORT_INBOX` = `support@revolis.ai`
- `LEGAL_FROM_EMAIL` = `Revolis Legal <legal@mg.revolis.ai>`
- `SUPPORT_FROM_EMAIL` = `Revolis Support <support@mg.revolis.ai>`

### Provider: RESEND
- `EMAIL_PROVIDER=RESEND`
- `RESEND_API_KEY` = API key z Resend

### Provider: BREVO
- `EMAIL_PROVIDER=BREVO`
- `BREVO_API_KEY` = API key z Brevo

### Provider: SMTP
- `EMAIL_PROVIDER=SMTP`
- `SMTP_HOST`
- `SMTP_PORT` (štandardne `587`)
- `SMTP_SECURE` (`true` pre 465, inak `false`)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_EMAIL` (voliteľné, fallback pre sender)

### Voliteľné pre auto-ticketing (webhook)
- `LEGAL_WEBHOOK_URL` = endpoint pre legal tickety
- `SUPPORT_WEBHOOK_URL` = endpoint pre support tickety
- `OPERATIONS_WEBHOOK_URL` = fallback pre oba kanály, ak špecifické URL nie sú nastavené

---

## 5) Príklad webhook payloadu (čo posiela appka)

```json
{
  "channel": "support",
  "title": "Nejde mi import XML",
  "requestId": "sup_1713123456789_ab12cd",
  "source": "web-form",
  "createdAt": "2026-04-15T16:04:22.000Z",
  "priority": "P2",
  "fields": {
    "fullName": "Ján Novák",
    "email": "jan@firma.sk",
    "company": "Firma s.r.o.",
    "subject": "Nejde mi import XML",
    "message": "Pri importe padá validácia..."
  }
}
```

---

## 6) Test checklist po nastavení

1. Otestuj DPA formulár:
   - `https://app.revolis.ai/dpa-request`
   - očakávanie: úspech + doručený e-mail do `LEGAL_INBOX`.

2. Otestuj Support formulár:
   - `https://app.revolis.ai/support`
   - očakávanie: úspech + doručený e-mail do `SUPPORT_INBOX`.

3. Over webhook:
   - endpoint dostane JSON payload pre oba typy.

4. Over reply-to:
   - pri odpovedi v inboxe ide reply žiadateľovi (nie na no-reply).

5. Over spam score:
   - prvé testy cez Gmail/Outlook + [mail-tester.com](https://www.mail-tester.com/).

---

## 7) Troubleshooting

### „Nepodarilo sa odoslať ... e-mailom“
- provider env je zle nastavený (`EMAIL_PROVIDER`),
- chýba provider credential (`RESEND_API_KEY` / `BREVO_API_KEY` / SMTP creds),
- `*_FROM_EMAIL` nie je z verifikovanej odosielacej domény v zvolenom provideri,
- DNS ešte nepropagovalo.

### E-mail chodí do SPAMu
- skontroluj SPF/DKIM/DMARC,
- použi transakčnú subdoménu (`mg.revolis.ai`),
- nastav stabilný sender name + konzistentný from.

### Webhook nechodí
- skontroluj `LEGAL_WEBHOOK_URL` / `SUPPORT_WEBHOOK_URL`,
- endpoint musí vracať 2xx, inak request route logne chybu.

---

## 8) Odporúčaný rollout

1. Najprv aktivuj iba email flow (bez webhooku).
2. Po 1–2 dňoch pridaj webhook ticketing.
3. Zapni DMARC policy z `none` -> `quarantine`.
4. Po stabilite prepnúť na `reject`.

---

## 9) Bezpečnostné poznámky

- API keys iba vo Vercel env, nikdy nie v klientskom JS.
- Webhook endpoint chráň tokenom/signature validáciou.
- V logoch neukladaj citlivé dáta nad nevyhnutný rozsah.
