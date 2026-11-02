# Starter Pack download: proxy 401 pred HMAC (2026-10-27)

## Bug

`fulfillStarterPackPurchase` posiela email s odkazom
`/api/starter-pack/download?token=…` (HMAC + overenie nákupu v route).
Cesta **nebola** v `PUBLIC_PATHS` v `apps/crm/src/proxy.ts`.

## Trigger

1. Stripe checkout `starter_pack` → webhook fulfill → Resend email.
2. Kupujúci (často ešte bez Revolis účtu / session) klikne „Otvoriť balík".
3. Proxy: `!user && pathname.startsWith("/api/")` → **401** JSON Unauthorized.
4. Route handler (token verify + bundle) sa **nikdy nespustí**.

## Impact

Zaplatený digitálny produkt sa nedá stiahnuť z emailu. Kreditový kód v tom istom
maili ostáva použiteľný po registrácii; HTML balík nie.

## Fix

- Pridať `"/api/starter-pack/download"` do `PUBLIC_PATHS` (presná zhoda cesty).
- Proxy unit test + verification test (žiadny prefix allowlist).

## Validation

- `npx vitest run src/proxy-starter-pack-download-public.test.ts tests/verification/starter-pack-download-public.verification.test.ts`
