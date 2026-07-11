# Supabase Auth — SK e-mail šablóny + SMTP (B1 runbook)

> **Kanonická cesta:** `docs/runbooks/supabase-auth-email-templates-sk.md`  
> **Blokátor:** B1 — bez funkčného auth mailingu nie je onboarding 2. zákazníka.  
> **Kto:** Andy v Supabase dashboarde (~20 min). Agent nemá prístup.

**Projekt:** `ypgajkhqtbriqqmyawyv` · **Overenie v appke:** Nastavenia → Auth e-mail testy (`AuthEmailTestsCard`)

---

## Diagnostika (ak e-mail príde prázdny)

1. **Authentication → Emails → Templates** — telo šablóny nesmie byť prázdne (6 šablón).
2. **Project Settings → Authentication → SMTP** — custom SMTP cez Resend (nižšie).
3. **Logs → Auth** — `user_recovery_requested` / chyby odoslania.

---

## SMTP (Resend)

| Pole | Hodnota |
|------|---------|
| Host | `smtp.resend.com` |
| Port | `465` (SSL) |
| Username | `resend` |
| Password | `RESEND_API_KEY` z Vercel Production |
| Sender | `no-reply@revolis.ai` |
| Sender name | `Revolis.AI` |

Doména `revolis.ai` / `mg.revolis.ai` musí byť **Verified** v Resend → Domains.

Po uložení: **Send test email** v SMTP settings.

---

## Šablóny — Subject + Body (copy-paste)

Premenné `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}` nechaj presne tak (Supabase built-in).

### Reset Password
**Subject:** `Obnovenie hesla — Revolis.AI`

```html
<h2>Obnovenie hesla</h2>
<p>Dobrý deň,</p>
<p>dostali sme žiadosť o obnovenie hesla k vášmu účtu v Revolis.AI.</p>
<p><a href="{{ .ConfirmationURL }}">Nastaviť nové heslo</a></p>
<p>Odkaz platí 24 hodín. Ak ste o zmenu nežiadali, tento e-mail ignorujte — heslo zostáva nezmenené.</p>
<p>Revolis.AI</p>
```

### Invite user
**Subject:** `Pozvánka do Revolis.AI`

```html
<h2>Boli ste pozvaní do Revolis.AI</h2>
<p>Dobrý deň,</p>
<p>vaša kancelária vám vytvorila prístup do CRM Revolis.AI.</p>
<p><a href="{{ .ConfirmationURL }}">Prijať pozvánku a nastaviť heslo</a></p>
<p>Ak pozvánku neočakávate, e-mail ignorujte.</p>
<p>Revolis.AI</p>
```

### Confirm signup
**Subject:** `Potvrďte svoju registráciu — Revolis.AI`

```html
<h2>Potvrdenie registrácie</h2>
<p>Dobrý deň,</p>
<p>ďakujeme za registráciu v Revolis.AI. Potvrďte svoj e-mail:</p>
<p><a href="{{ .ConfirmationURL }}">Potvrdiť e-mail</a></p>
<p>Revolis.AI</p>
```

### Magic Link
**Subject:** `Prihlásenie do Revolis.AI`

```html
<h2>Prihlásenie jedným klikom</h2>
<p>Dobrý deň,</p>
<p><a href="{{ .ConfirmationURL }}">Prihlásiť sa do Revolis.AI</a></p>
<p>Odkaz platí 1 hodinu a dá sa použiť raz. Ak ste oň nežiadali, ignorujte tento e-mail.</p>
<p>Revolis.AI</p>
```

### Change Email Address
**Subject:** `Potvrdenie zmeny e-mailu — Revolis.AI`

```html
<h2>Zmena e-mailovej adresy</h2>
<p>Dobrý deň,</p>
<p>požiadali ste o zmenu e-mailu na tomto účte. Potvrďte:</p>
<p><a href="{{ .ConfirmationURL }}">Potvrdiť novú adresu</a></p>
<p>Ak ste o zmenu nežiadali, kontaktujte nás.</p>
<p>Revolis.AI</p>
```

### Reauthentication
**Subject:** `Overovací kód — Revolis.AI`

```html
<h2>Overovací kód</h2>
<p>Váš kód: <strong>{{ .Token }}</strong></p>
<p>Kód platí 5 minút. Ak ste oň nežiadali, ignorujte tento e-mail.</p>
<p>Revolis.AI</p>
```

---

## GO checklist (B1 odblokovaný)

| # | Test | Kde |
|---|------|-----|
| 1 | SMTP test email dorazil s obsahom | Supabase SMTP settings |
| 2 | Recovery na vlastný účet — telo + link | App → Nastavenia → Auth e-mail testy |
| 3 | Invite na `test+...@` (nie zákazník!) — pozvánka dorazila | Rovnaká karta |
| 4 | Až potom invite reálnych maklérov | Po súhlase zákazníka |

**Pass:** body 1–3 zelené → B1 **Running** → môžeš pokračovať `docs/runbooks/onboard-new-agency.md` krok 3 (invite ownera).

---

## Súvisiace

| Súbor | Účel |
|-------|------|
| `docs/runbooks/andy-dashboard-60min.md` | 60-min blok (B1 v Blok A) |
| `docs/runbooks/onboard-new-agency.md` | Tenant onboarding po B1 |
| `apps/crm/src/components/settings/AuthEmailTestsCard.tsx` | In-app testy |
