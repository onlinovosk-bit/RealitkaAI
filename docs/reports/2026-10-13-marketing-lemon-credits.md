# Verejný web: Lemon Squeezy preč, kredity 25/60/120/175

**Dátum:** 2026-10-13  
**Scope:** `apps/marketing` + verejné stránky `apps/crm` (cenník, FAQ, VOP v2, landing CTA). Jedno PR, bez merge a bez deploy.

## Lemon Squeezy

Grep v celom repe (`lemon`, `lemonsqueezy`, case-insensitive):

- **Verejný kód (`apps/marketing`, `apps/crm/src`):** 0 výskytov. Checkout URL, tlačidlá, skripty a env Lemon Squeezy na webe nie sú.
- **Historické zmienky (nemením):** `memory/decisions.md`, `memory/open-tasks.md` (úloha Share), `docs/audit/`, `docs/briefs/overnight/guardian-cta-240-plan.md`.

Nákupné CTA v2 (doplnené v tom istom PR):

- Marketing: primárne `{CRM}/register?pricing=v2&plan=<pásmo>` (hero/nav/sticky = Start), predvolene. Calendly len „Dohodnite si ukážku“. Núdzový vypínač `PRICING_V2_SIGNUP_ENABLED=false`.
- CRM `/register` pri vypnutom `SELF_SERVE_SIGNUP_ENABLED`: zatvorená stránka + ukážka, nie rozbitý formulár.
- CRM landing (`FinalCTAV2`): `/register` (Start/Team/Kancelária), `/support` (Sieť). Nie Stripe Checkout z webu (chýba `agencyId`).
- Existujúci Stripe tok je v CRM po registrácii (`/api/billing/credits/checkout`) a legacy marketing `/api/checkout/subscription` (seat cenník, hash pinovaný testom).
- Checklist PROD signup: `docs/reports/2026-10-13-signup-prod-checklist.md`.

## Kredity

Zdroj pravdy: `PRICING_V2_BANDS.monthlyCredits` v `apps/crm/src/lib/pricing-v2.ts`.

| Plán | predtým | teraz |
|---|---:|---:|
| Start | 20 | 25 |
| Team | 50 | 60 |
| Kancelária | 100 | 120 |
| Sieť | 150 | 175 |

Mesačné balíky 60/120/180/240/300 **nezmenené**. Grant v billingu = pásmo + balík, takže zmena konštanty mení aj pridelenie kreditov po Stripe webhooku.

## Neisté / mimo tohto PR

- Live Stripe Product metadata `credits_per_cycle` na už vytvorených cenách (founder).
- Zapnutie `SELF_SERVE_SIGNUP_ENABLED=true` na CRM PROD (env, GO). Marketing signup je po tomto PR predvolene ON; CRM ostáva fail-closed.
- Historické záznamy v `memory/` a auditoch.
- Legacy seat granty `CREDIT_GRANTS` 30/25/20 (iný cenník, nemeniť).
