# Build Order — oprava samoobslužného resetu hesla

**Status:** IN PROGRESS
**Cieľ:** Odstrániť produkčnú chybu 403, aby prihlásený používateľ vedel odoslať reset hesla na vlastný účet bez rozšírenia oprávnení na cudzie účty.

## Integration Report

| Položka | Existuje? | Cesta / rozhodnutie |
|---|---|---|
| UI komponent | áno | `apps/crm/src/components/settings/AuthEmailTestsCard.tsx` — bez nového komponentu |
| API route | áno | `apps/crm/src/app/api/settings/auth-email-tests/route.ts` — oprava autorizácie |
| Profil resolver | áno | `apps/crm/src/lib/profiles/resolve-profile-for-auth.ts` — jednotné určenie owner/founder |
| DB zmena | nie | Bez migrácie |

**Jediná nová vec:** regresný test autorizácie route.

## Verification map

| # | Akceptačné kritérium | Vitest unit |
|---|---|---|
| 1 | Prihlásený používateľ môže resetovať vlastný e-mail | `auth-email-tests/__tests__/route.test.ts` |
| 2 | Bežný používateľ nemôže resetovať cudzí účet | `auth-email-tests/__tests__/route.test.ts` |
| 3 | Owner/founder môže resetovať cudzí účet | `auth-email-tests/__tests__/route.test.ts` |
| 4 | Neprihlásený používateľ dostane 401 | `auth-email-tests/__tests__/route.test.ts` |

## Scope

- IN: autorizácia GET/recovery/recovery-link/invite a regresné testy.
- OUT: Supabase SMTP konfigurácia, zmena e-mailových šablón, databázové zmeny.

## Acceptance

- Cielený Vitest pre route prejde.
- TypeScript kontrola a produkčný build prejdú.
- Produkčný endpoint už pre vlastný účet nevráti 403.

## Rollback

Revert jedného commitu; bez dátovej migrácie.

## Effort

- [x] S (<0.5 d)
