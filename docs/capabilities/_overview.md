# Capabilities — prehľad

> Stav: Wave 1 (K1–K4) verified na Smolko PROD zákazke `source_id=13303557`.
> Všetky capabilities používajú reálne dáta (AP-001/AP-003), žiadne mock hodnoty.
> HTML strip bol opravený v PR #231 (`feat/capabilities-strip-html-description`).

## Stav capabilities

| Capability | Súbor | Verified | Guardian |
|---|---|---|---|
| Quality Guardian | `quality-guardian/review.ts` | ✅ | n/a (je Guardian) |
| Listing Generator | `listing-generator/generate.ts` | ✅ 13303557 PASS | PASS |
| Listing Score | `listing-score/score.ts` | ✅ 44% | PASS |
| Banner Factory | `banner-factory/build.ts` | ✅ 4 banners | PASS (všetky) |
| Presentation Builder | `presentation-builder/build.ts` | ✅ owner + buyer | PASS |
| Property Microsite | `property-microsite/build.ts` | ✅ publishBlocked | PASS |
| Export Diagnostics | `export-diagnostics/analyze.ts` | ✅ | n/a |
| Vertical Pack Demo | `vertical-pack-demo/build.ts` | ✅ full demo | PASS |

## Zdieľaná infraštruktúra

- `_shared/strip-html.ts` — `stripHtmlToPlainText()` — HTML → plain text
- `_shared/realvia-property-row.ts` — `realviaRowToUcListing()` — DB row → `UcListingMapped`
- `_shared/audit-log.ts` — in-memory audit log pre capabilities
- `_shared/human-approval.ts` — `assertPublishAllowed()` — publish gate
- `_shared/fixtures/realvia-smolko-13303557.ts` — reálna zákazka pre testy

## HTML sanitizácia (PR #231)

**Problém:** Realvia descriptions obsahujú HTML tagy (napr. `<p>`, `<br/>`, `<strong>`).
Pred opravou tieto tagy presakovali do listing/deck/microsite výstupov → Guardian FLAG na 13303557.

**Oprava:** `realviaRowToUcListing()` volá `stripHtmlToPlainText()` na `description` pri mapovaní.
Všetky capabilities dostanú čistý text — HTML nikdy nedorazí do draftu.

`listing-score` navyše volá `stripHtmlToPlainText()` priamo na `row.description`
pre meranie dĺžky (plain text length, nie raw HTML).

## Test coverage (po Vlne 2)

35 unit testov, 9 test súborov, všetky zelené.
Pokryté edge cases: chýbajúca cena, chýbajúce GPS, HTML v popise, prázdne vstupy.
Referencovaná zákazka: `source_id=13303557` (Smolko PROD, nie mock).

## Čo chýba / FLAG na ráno

- Fixture `2772732443` nie je dostupná — testy používajú len 13303557 s override hodnotami
- Human approval flow pre microsite je stub (`assertPublishAllowed` vždy `ok: false`)
- `publishBlocked=true` na všetkých microsites — čaká na human approval implementáciu
