# Plan: gmail markError/markPulled ciphertext guard

## Rozsah
Opraviť race, kde in-flight Gmail pull po disconnect→reconnect (alebo rotácii tokenu) volá `markError(..., disable=true)` / `markPulled` podľa `agency_id` a tým vypne alebo „oživí“ **nový** OAuth riadok. #902 rieši len wipe→`status=revoked`; reconnect (`status=active` + nový ciphertext) ostáva.

## Znovupoužitie
Existujúce `markPulled` / `markError` v `gmail-connect-store.ts` + volania v `runGmailInboundPullAll`. Žiadny nový modul; pridá sa voliteľný `expectedCiphertext` filter (optimistic concurrency na tom istom stĺpci).

## Akceptačné kritériá
- `markPulled(agencyId, ciphertext)` a `markError(..., ciphertext)` filtrujú `.eq("refresh_token_ciphertext", ciphertext)` keď je ciphertext podaný.
- `runGmailInboundPullAll` podáva ciphertext z DB connection pri `onPulled` / `onError`.
- Unit test: po zmene ciphertextu update neprebehne (mock expect `.eq` s pôvodným blobom).
- Verification: boundaries test vyžaduje ciphertext filter v store.
- `npx vitest run` na gmail-connect-store + gmail-pull + gmail-connect-boundaries — PASS.

## Riziká
- Bez podaného ciphertextu ostáva staré správanie (legacy volania) — default wrappers vždy podajú.
- Prekrytie s otvoreným #902: ciphertext match subsumuje wipe race; status filtre z #902 doplníme pre defense-in-depth ak ešte nie sú na vetve.

## Brány
Žiadny merge/PROD/migrácia v tomto pláne. Founder GO na merge PR.

## Kroky
1. Upraviť `markPulled` / `markError` (+ status filtre ako #902).
2. Upraviť `runGmailInboundPullAll` signature + predanie ciphertextu.
3. Unit + verification testy.
4. Report `docs/reports/2026-10-21-gmail-reconnect-markerror-race.md`.
5. Commit, push, draft PR.

## Mimo rozsahu
Opravy acquire/Realvia/CRON-TRUTH/monthly-grant (po audite bez nového HIGH nálezu). Merge #902.
