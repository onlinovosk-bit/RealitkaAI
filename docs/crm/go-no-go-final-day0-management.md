# Revolis.AI CRM - Go/No-Go Brief (Management)

Date: 2026-04-13  
Release: CRM Day-0 Live  
Status owner: Product + Tech Lead

## Executive summary

**Decision: GO**

Platform is ready for live rollout under pragmatic release mode.  
Core technical, data, billing, and security gates are satisfied.

## Traffic light status

### GREEN
- Aplikácia je build-ready a prešla release kontrolami.
- Kľúčové produktové flow fungujú (dashboard, príležitosti, pipeline, properties, AI endpoint).
- Billing endpointy sú funkčné.
- Bezpečnostné minimum je splnené (RLS uzavreté aj na legacy tabuľkách).
- `ai_insight` backfill dosiahol cieľové pokrytie pre launch (87.7%).

### YELLOW
- Automatizované login E2E testy (Playwright) čakajú na test prihlasovacie údaje.
- Backfill bude pokračovať počas Day-1 monitoringu do vyššieho pokrytia (>95%).

### RED
- Žiadne aktuálne release-stop blokery.

## Deploy sequence (business view)

1. Final preflight potvrdenie (tech + product).
2. Deploy aplikácie podľa runbooku.
3. Krátke post-deploy sanity overenie kľúčových obrazoviek.
4. Otvorenie 24h monitoring okna.
5. Priebežná komunikácia v internom launch kanáli.

## 24h post-launch watchpoints

- Chybovosť API (hlavne AI a billing trasy)
- Odozva AI endpointu a fallback trend
- Billing webhook chyby
- Rast `ai_insight` pokrytia
- Incidenty od pilot používateľov

## Rollback policy

Rollback spustiť len pri kritickej regresii (auth/billing/data integrity).  
Aplikačný rollback je pripravený, DB zmeny sú kompatibilné, alias `/sofia` ostáva aktívny počas prechodného obdobia.

## Go/No-Go sign-off

- Product: ____________________
- Tech Lead: __________________
- Operations: _________________
