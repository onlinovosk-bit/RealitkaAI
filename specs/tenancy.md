# Tenancy (implementácia)

## Postgres RLS

RLS politiky v projekte viažu prístup na **`auth.uid()`** a tabuľku `profiles` (`agency_id`). Sú to zdroj pravdy pri použití **anon / publishable** klienta so session cookies.

## `withTenant()` (`apps/crm/src/db/withTenant.ts`)

- Vyžaduje **user-scoped** `SupabaseClient` (nie service role).
- Pred spustením `run` overí, že `profiles.agency_id === agencyId` pre aktuálneho používateľa.
- Vnútri `run` ostávajú platné RLS pravidlá; aplikačná kontrola dopĺňa konzistentnosť „tenant scope“.

## RLS middleware (`apps/crm/src/auth/`)

- `tenant-headers.ts` — rezolvovanie profilu, merging a čítanie `x-tenant-*` bez závislosti na Next.
- `rls-middleware.ts` — `nextResponseWithForwardedTenant` (Next `NextResponse` + cookies).

### Zapojenie do `middleware.ts` (ručne)

Po `supabase.auth.getUser()` a kontrole `user`:

1. Zavolaj `resolveTenantFromSupabaseSession(supabase)`.
2. Ak kontext existuje, vráť `nextResponseWithForwardedTenant(request, tenant, response)` namiesto holého `NextResponse.next()`, kde `response` je objekt, na ktorý Supabase zápisuje cookies.

Bez tohto kroku route handlery nevidia forwarded tenant hlavičky (voliteľné podľa feature).

## Testy

`apps/crm/tests/tenancy/` — unit testy pre `withTenant` a hlavičkovú vrstvu.
