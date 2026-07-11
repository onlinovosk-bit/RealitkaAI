# Onboarding 2. zákazníka — runbook (DRAFT z auditu 2026-07-08)

> **Kanonická cesta:** `docs/runbooks/onboard-new-agency.md` (P1). Tento súbor = audit mirror.
>
> Inventúra manuálnych krokov, keď zajtra podpíše druhá agentúra. Zdroj: audit D6 —
> kód, prod DB probe, SMOLKO-OPS-RUNBOOK. Stav: DRAFT na review, nič z tohto nebeží automaticky.

## Blokátory PRED podpisom (bez nich onboarding nejde)

| # | Blokátor | Dôkaz | Fix |
|---|---|---|---|
| B1 | **Auth mailing** — recovery/invite | founder-observed 2026-07-08; šablóny v dashboarde | `docs/runbooks/supabase-auth-email-templates-sk.md` (Andy, ~20 min) |
| B2 | **Kreditový model neúčtuje** — `credit_ledger` 0 riadkov, migrácia 20260611 neaplikovaná, cron 500 | PostgREST probe: `agencies.grant_credits_balance does not exist` | `docs/audit/prod-migration-drift-2026-07-08.md` |
| B3 | **RLS vypnuté na onboarding tabuľkách** (PII nového zákazníka pôjde práve tam) | `rls_audit_snapshot`: rls_enabled=false | tamtiež (migrácia 20260701) |

## Manuálne kroky onboardingu (dnešný stav — 9 krokov, 0 automatizovaných)

1. **agencies INSERT** — SQL/dashboard: `name, slug, plan, seats, account_tier` (+ `manual_plan` ak bez Stripe — vzor SMOLKO-OPS-RUNBOOK §1b). Bez skriptu.
2. **Owner auth user** — Dashboard → Auth → Invite (závisí na B1). Bez skriptu.
3. **Owner profile + prepojenie `auth_user_id`** — SQL UPDATE ručne. Bez skriptu.
4. **Profily maklérov** — existuje skript `apps/crm/scripts/bo-b-import-profiles.cjs`, ale je HARDCODED na Smolko (agency ID + zoznam mien v kóde). Pre 2. zákazníka = kópia + úprava. Kandidát na parametrizáciu (`--agency`, `--csv`).
5. **inbound_mailboxes INSERT** — e-mail gateway smerovanie; dnes 1 riadok (Smolko), vložený ručne. Pozor: Cloudflare worker `workers/email-gateway` je UNTRACKED v gite — zdroj nasadeného workera nie je verzovaný.
6. **Stripe** — customer + subscription alebo `billing_source=manual_invoice` + `manual_plan`. Flow send_invoice bez dokumentovaného postupu.
7. **Import leadov** — universal-import / Realvia. Pozor: `REALVIA_DEFAULT_AGENCY_ID` env je single-tenant default (ukazuje na Smolko) — pri 2. zákazníkovi s Realvia treba per-agency identifikátor (stĺpce `realvia_identifikator` na agencies existujú).
8. **morning_brief_settings** — 0 riadkov aj pre Smolka; žiadny UI/onboarding path ich nevytvára → morning-brief cron je no-op pre každého. Rozhodnúť: enroll default pri vytvorení profilu?
9. **Vercel env re-check** — `TRIAGE_AGENCY_ID` (ak by bol nastavený, cron triáž filtruje na 1 agentúru), OUTREACH_*, IMAP_* sú globálne, nie per-tenant.

## Multi-tenant riziká overené auditom

- RLS: 98 tabuliek v snapshote, RLS disabled len 2 (B3 vyššie). Tenant izolácia inde OK (report 2026-06-16: 0 critical failures).
- seller-rescue cron iteruje `agencies` VŠETKY — 2. zákazník dostane notifikácie automaticky (po fixe duplicít).
- dashboard-insights beží per-agency (Revolis Demo cache row existuje) — OK.
- lead-ai-triage: inline triage pri inserte (#276) je agency-agnostic — OK.

## Odhad: podpis → funkčný tenant

Dnes: ~9 ručných krokov, 2 vyžadujú SQL, 1 závisí na rozbitom auth mailingu, 0 dokumentovaných end-to-end.
Po fixe B1–B3 + parametrizácii skriptu (krok 4): realistický odhad pol dňa práce na tenant.
