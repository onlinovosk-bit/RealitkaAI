# External Subscription Capacity — implementácia

**GO:** Founder 16. 11. 2026, P0 na AI Control Tower. Merge/LIVE/PROD SQL zakázané.
**Vetva:** `cursor/external-subscription-capacity-611f` (cloud prefix; požadovaný názov `external-subscription-capacity`).
**Base:** `origin/main` obsahuje #955 (`d7f28fe1`) aj #956 (`41819133`).

## Dôkaz

- Model Gateway: `npm run model-gateway:test` **26/26**, `npm run model-gateway:typecheck` **0**.
- CRM vitest (route + write + verification + nav): **14/14**.
- CRM eslint zmenených súborov **exit 0**.
- CRM typecheck baseline: **53** chýb (strop 54).
- CRM `npm run build`: exit 0, routy `ƒ /ai-control-tower` a `ƒ /api/ai-control-tower/snapshots`.
- Schema-gap: **0** nových medzier.
- Izolovaný Postgres (docker `revolis-subcap-pg`, nie PROD): migrácia 20261116140000 druhýkrát **ON_ERROR_STOP=1 exit 0**; stĺpce percent + unique `ai_quota_pools_identity`.
- PROD projekt `ypgajkhqtbriqqmyawyv`: 7 agentúr / 526 leadov / 177 ponúk. `to_regclass('public.ai_quota_snapshots')` je **null**. Migrácia **neaplikovaná**.

## Bezpečnosť

- Čítanie `/ai-control-tower`: `canViewFounderMetrics` (platform admin **alebo** FOUNDER_EMAILS).
- Zápis POST `/api/ai-control-tower/snapshots`: `requirePlatformAdmin` → `profiles.is_platform_admin === true`. E-mailový allowlist nestačí.
- Service-role klient len na serveri. Validácia percent, IANA timezone, identita poolu, zákaz credentials v note/alias.
- RLS deny-by-default, revoke anon/authenticated (keď role existujú).

## Mimo rozsahu

Merge, production deploy, apply migrácie na PROD, platené API, vypínanie Grok/Claude.
