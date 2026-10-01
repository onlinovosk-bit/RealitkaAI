# Andy — 60-min dashboard blok (GO 2026-07-08)

> Cieľ: odblokovať onboarding zákazníka č. 2. Všetko je **typ B** — robíš ty v
> dashboarde; agent nemá prístup, nič neodosiela, nič nemerguje.
>
> Pred začiatkom: otvor tento checklist + `docs/runbooks/supabase-auth-email-templates-sk.md`
> + `docs/audit/prod-migration-drift-2026-07-08.md` v druhom okne.

**Časový budget:** ~60 min · **Poradie je záväzné** (každý krok blokuje ďalší).

---

## Stav pred blokom (overené 2026-07-08 večer)

| Položka | Stav |
|---|---|
| PR #279 seller-rescue dedupe | **Merged** na `origin/main` (`5f0646178`) — over, či je na prode |
| PR #280 auth email test actions | **Merged** (`dd1cb41d3`) — pomocný, nie blokátor |
| Auth recovery test (Andy účet) | **Hotové** — šablóna funguje (zaškrtnuté v drafte) |
| Prod migrácie B2/B3 | **Aplikované 2026-07-09** (Andy) — overiť grant cron |
| Prod deploy | Posledný inspect ~13:50 SELČ — **over commit** pred smoke |

---

## BLOK A — Auth mailing (~20 min) · BLOKÁTOR B1

**Kde:** Supabase → projekt `ypgajkhqtbriqqmyawyv`

| # | Akcia | Hotovo |
|---|---|---|
| A1 | **Emails → Templates** — skontroluj všetkých 6 šablón (nie prázdne telo): Reset Password, Invite, Confirm signup, Magic Link, Change Email, Reauthentication | ☐ |
| A2 | **Project Settings → SMTP** — Resend: `smtp.resend.com:465`, user `resend`, sender `no-reply@revolis.ai` | ☐ |
| A3 | **Send test email** zo SMTP settings — dorazil s obsahom? | ☐ |
| A4 | **Send password recovery** na vlastný (Andy) účet — telo + link fungujú | ☑ (už overené) |
| A5 | **Invite** na testovací e-mail (`*@example.com` alebo vlastný sekundárny) — **NIKDY zákaznícky** | ☐ |

Šablóny na copy-paste: `docs/runbooks/supabase-auth-email-templates-sk.md` § Šablóny.

**Pass kritérium:** A3 + A5 zelené → B1 odblokovaný.

---

## BLOK B — Prod migrácie (~25 min) · BLOKÁTORY B2 + B3

**Kde:** Supabase → SQL Editor (prod)

**Pred každým krokom:** skopíruj obsah migrácie z `apps/crm/supabase/migrations/`.

| # | Súbor migrácie | Čo opraví | Hotovo |
|---|---|---|---|
| B1 | `20260611000001_credit_ledger_source.sql` | `grant_credits_balance`, `credit_ledger.source` | ☐ |
| B2 | `20260611000003_spend_credits.sql` | RPC `spend_credits` | ☐ |
| B3 | `20260701120000_onboarding_client_tables_rls.sql` | RLS na `client_onboarding_*` | ☐ |

**Po každom kroku** spusti verifikačný SELECT z `docs/audit/prod-migration-drift-2026-07-08.md` § Verifikácia.

**Pass kritérium B3:**
```sql
select tablename, rowsecurity from pg_tables
 where tablename in ('client_onboarding_progress','client_onboarding_messages');
-- očakávané: rowsecurity = true na oboch
```

**Nepúšťaj** `curl credits-grant` dnes — to je prod write s vedľajším efektom; stačí, že stĺpce existujú.

---

## BLOK C — Deploy + smoke (~10 min)

| # | Akcia | Hotovo |
|---|---|---|
| C1 | Vercel → Deployments — posledný **Production** commit obsahuje `5f0646178` (#279)? Ak nie → počkaj na git deploy alebo **Redeploy** (GO) | ☐ |
| C2 | Rýchly smoke: `app.revolis.ai/login` — prihlás sa vlastným účtom (nie zákazníckym) | ☐ |
| C3 | `/team` — Team Pressure panel viditeľný (Smolko owner) | ☐ |

**Seller-rescue dedupe (#279):** plný dôkaz až pri ďalšom cron behu; dnes stačí C1.

---

## BLOK D — Hygiena (voliteľné, ak ostáva čas)

| # | Akcia | Poznámka |
|---|---|---|
| D1 | Auth Logs → filter `user_updated_password` okolo 2026-07-07 | incident dočasného hesla — over reset |
| D2 | Vercel → Environment Variables — `ANTHROPIC_API_KEY` scope (Production only?) | samostatný track, nie blokátor dnes |
| D3 | `memory/decisions.md` — jeden riadok: „B1–B3 dashboard blok dokončený [dátum]" | P6 kontinuita |

---

## Po 60 min — definícia HOTOVO

| Blokátor | Pred | Po (cieľ) |
|---|---|---|
| B1 Auth mailing | rozbitý | invite + recovery fungujú na test účte |
| B2 Credits model | migrácie chýbajú | stĺpce + RPC existujú |
| B3 RLS onboarding | `rls_enabled=false` | `rowsecurity=true` na oboch tabuľkách |
| Seller-rescue spam | 190 duplicitných úloh | #279 na prode (čaká cron) |

**Ďalší krok po tomto bloku:** parametrizovať `bo-b-import-profiles.cjs` pre 2. zákazníka
→ `docs/runbooks/onboard-new-agency.md` (P1, z `apps/crm/docs/ONBOARDING-2ND-CUSTOMER-RUNBOOK.md`).

---

## Čo NEROBÍŠ v tomto bloku

- Žiadny invite reálnych maklérov Smolka (čaká súhlas krok 1b)
- Žiadny DROP tabuliek / DELETE dát
- Žiadna zmena Vercel env (samostatný GO)
- Žiadny `curl` na cron s prod write efektom
