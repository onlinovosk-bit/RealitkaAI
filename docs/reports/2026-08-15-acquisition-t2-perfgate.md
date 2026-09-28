# Acquisition `/acquisition` T2 perfgate — FAIL

**Datum:** 2026-08-15
**Zdroj:** founder T2 ("opat to trvalo asi 2 minuty") + Supabase edge logy CRM `ypgajkhqtbriqqmyawyv`, Demo tenant
**Rozhodnutie:** Stage 0 PASS sa nerealizuje. Nie je to jednorazovy cold start.

## Namerane

| Beh | Cas (founder) | Okno v logoch (UTC) |
|---|---|---|
| T1 prve nacitanie po deployi #414 | ~2 min | auth ~18:45:43, acquisition SELECT ~18:46:42 a znova ~18:50:15 |
| T2 druhe nacitanie | ~2 min (~21:08 CEST) | auth + profiles 19:06:07, layout do ~19:06:12, acquisition SELECT 19:08:15-17 |

## Co je rychle

`acquisition_accounts`, `acquisition_campaigns`, `acquisition_events`: HTTP 200, spolu <2 s. Nie GAQL. Nie dashboard loader.

## Co je pomale

Medzera ~2 min medzi koncom layout/agency dopytov a prvym `acquisition_*` SELECT-om.

V T2 okne pred tou medzerou:

1. `auth/v1/user`
2. desiatky duplicitnych `profiles` GET (auth_user_id, email ilike, id) — `(dashboard)/layout.tsx`: `linkProfileToAuthUser` + `resolveProfileForAuthUser` na kazdom requeste
3. workdesk shell: `properties?order=created_at.desc&limit=500`, `leads?select=*&limit=500`
4. stranka `/acquisition` ma `export const dynamic = "force-dynamic"`

## Zaver

Pomalost je dashboard layout / workdesk shell (SSR + N+1 profil + tazky client hydrate), nie Acquisition OS query.

Oprava = samostatny PR, vlastne founder GO. Do #415 (docs+evidence) sa neriesi kod.

Stage 1 sa nespusta. Production webhook kluc sa nevracia.
