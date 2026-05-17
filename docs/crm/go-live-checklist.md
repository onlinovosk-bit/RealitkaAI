# Revolis.AI CRM - Go-Live Checklist (1 page)

Date: ____ / ____ / ______
Release: __________________
Owner sign-off: __________________

## Owner

- [ ] Scope freeze potvrdený (žiadne nové featury do release)
- [ ] Pilot kancelárie/makléri vybraní (min. 3) a UAT scenáre potvrdené
- [ ] Pricing/Billing pravidlá finálne schválené (Starter/Pro/Enterprise)
- [ ] GDPR/obchodné podmienky/Privacy texty sú aktuálne
- [ ] Go/No-Go meeting prebehol, rozhodnutie zaznamenané
- [ ] Komunikačný plán na launch deň pripravený (status page, support kanál)

## Dev

- [ ] `npx supabase db push --yes` na staging: bez chyby
- [ ] `ai_insight` stĺpec overený na staging a endpoint `/assistant` funguje
- [ ] Legacy alias `/sofia` ponechaný (min. 1 release cyklus)
- [ ] `npm run lint` bez nových kritických chýb
- [ ] `npm run build` bez blokujúcich chýb
- [ ] Smoke test flowov:
  - [ ] login
  - [ ] lead detail
  - [ ] AI chat (`/assistant`)
  - [ ] pipeline presun
  - [ ] properties edit panel
- [ ] Billing sanity:
  - [ ] checkout endpoint
  - [ ] customer portal endpoint
  - [ ] webhook signature validation
- [ ] Service-role kľúč používaný iba server-side (žiadny client leak)
- [ ] RLS policy check pre `public.leads` a kritické tabuľky
- [ ] Backup/restore plán overený (snapshot + test obnovy)
- [ ] Rollback runbook pripravený (app rollback + DB postup)

## Support

- [ ] Incident kanál aktívny (on-call meno + kontakt)
- [ ] Pripravené odpovede na top 10 support otázok
- [ ] Billing support postup (zlyhaná platba, zmena plánu, refund)
- [ ] Eskalačný matrix (L1/L2/Dev) potvrdený
- [ ] Monitoring dashboardy dostupné pre support tím
- [ ] Post-launch 24h/72h kontrolné okná naplánované

## Monitoring gates (launch day)

- [ ] API 5xx error rate pod dohodnutým prahom
- [ ] p95 latency `/assistant` pod dohodnutým prahom
- [ ] Stripe webhook failures = 0 (alebo trend klesá)
- [ ] Cron/job chyby bez kritických výpadkov
- [ ] Tenant izolácia bez bezpečnostných incidentov

## Final Go / No-Go

- [ ] GO
- [ ] NO-GO
Reason: _______________________________________________
Approved by: __________________________________________
