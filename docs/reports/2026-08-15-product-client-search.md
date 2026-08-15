# Product GoogleAdsClient.search() — live read-only (Test MCC)

**Datum:** 2026-08-15
**Read-only.** Ziadny mutate, ziadny Google Ads write.
**Klient:** produktovy `GoogleAdsClient.search()` z `apps/crm/src/lib/acquisition/google-ads-client.ts` na `main` po #413 (`f1ad3fbeb`).
**API:** v25 `POST https://googleads.googleapis.com/v25/customers/{id}/googleAds:search`
**Login MCC:** `7024414113` (guard ako pri seede). Child ucty: RK A `3726370609`, RK B `2272781649`.
**GAQL kampane:** verbatim `CAMPAIGN_SYNC_GAQL` (campaigns.ts).
**GAQL search-terms:** verbatim `SEARCH_TERM_GAQL` vcetne `WHERE segments.date DURING LAST_7_DAYS` (search-terms.ts po #413).
**Runner:** lokalny throwaway, necommitnuty. Token cez SA JWT; secrets nie su v tomto subore.

## Verdikt

**PASS.** Produktovy `search()` bije na oficielnu REST cestu `googleAds:search` (HTTP 200). Kampane maju **rovnake ID** ako live sync 15.8. a ako production dashboard. Search-terms s date filtrom uz nepadaju na `EXPECTED_FILTERS_ON_DATE_RANGE` — HTTP 200, 0 riadkov (PAUSED test MCC, bez serving).

## Namerane (sanitized)

Beh: `2026-08-15T18:57:14.661Z`

| Tenant | customer_id | Worker | URL | HTTP | Vysledok |
|---|---|---|---|---|---|
| RK A | 3726370609 | campaigns | `.../customers/3726370609/googleAds:search` | **200** | fetched 1; `24134657673` RKA-test-byty **PAUSED** |
| RK A | 3726370609 | search-terms | `.../customers/3726370609/googleAds:search` | **200** | fetched 0 |
| RK B | 2272781649 | campaigns | `.../customers/2272781649/googleAds:search` | **200** | fetched 1; `24134894838` RKB-test-domy **PAUSED** |
| RK B | 2272781649 | search-terms | `.../customers/2272781649/googleAds:search` | **200** | fetched 0 |

Rovnake campaign ID ako:

- seed / live-sync report `docs/reports/2026-08-15-live-sync.md`
- `acquisition_campaigns` display persist
- production `/acquisition` screenshot 15.8.

## Co toto nie je

- HTTP/cron sync v CRM.
- Persist ad groups / keywords / search-terms (stale ziadne tabulky).
- Serving data (0 search-term riadkov je ocakavane).
