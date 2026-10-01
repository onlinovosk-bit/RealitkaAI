# RUFLO SWARM — Listing Score + Export Diagnostics (staviteľné TERAZ)

> Obe NEpotrebujú lead dáta — počítajú zo zákaziek (máš 91 realvia) a audit dát.
> Preto sa dajú predpripraviť hneď, kým čakáš na Smolkovu CSV odpoveď.

## ⛔ FÁZA 0 — write-probe + dôkaz nekrižovateľnosti
Write-probe (ak nová session). Over reálne dotknuté cesty (git diff --name-only):
- A (Listing Score): `apps/crm/src/lib/capabilities/listing-score/` + rozšírenie K1 Guardiana.
- B (Export Diagnostics): `apps/crm/src/lib/capabilities/export-diagnostics/`.
Disjunktné → paralelne. Prekryv (napr. obe menia Guardian) → sekvenčne.

## VLNA A — Property Completeness Score (rozšírenie K1 Guardian)
`apps/crm/src/lib/capabilities/listing-score/`
- Vstup: REÁLNA zákazka z properties (source_system='realvia', máš 91).
- Spočíta completeness skóre z toho, čo zákazka REÁLNE má vs. čo chýba:
  fotky (počet), video/virtual_tour, popis (dĺžka), cena (>0?), GPS, energetický cert,
  kategória, lokalita. Skóre = % vyplnených hodnotných polí.
- Výstup: skóre + KONKRÉTNY zoznam čo chýba ("chýba video, energetický cert, 0 cena").
- GUARDRAIL (AP-001): skóre počíta len z reálnych polí, žiadne vymyslené váhy bez dát.
  Ak pole v zákazke nie je, ráta sa ako chýbajúce, nevymýšľa sa hodnota.
- Prejde K1 Guardian. → PR A.

## VLNA B — Export Diagnostics
`apps/crm/src/lib/capabilities/export-diagnostics/`
- Vstup: audit dáta o exportoch (realsoft_import_logs / realvia_webhook_logs result_code).
- Analyzuje: koľko zákaziek prešlo / zlyhalo, aké result_code, aké dôvody.
  (Smolkov reálny problém zo screenshotov: "310 nepodarilo zverejniť na Bazoši".)
- Výstup: prehľad úspešnosti + KONKRÉTNE dôvody zlyhaní (nie "niečo zlyhalo").
- GUARDRAIL: hlási len to, čo je v audit dátach. Žiadne vymyslené príčiny (AP-001).
  Ak dôvod nie je v dátach → "dôvod neznámy z audit logu", nie hádanie.
- → PR B.

## BRÁNA
- A aj B: buildable, AUTO-SAFE na vetve, PR + CI + Kontrolór. Žiadny PROD write.
- Žiadne vymyslené čísla/skóre. Reálne dáta, nie mock (AP-003).

## ZAMKNUTÉ
Lead-features (attribution, dedup, buyer intent, recovery, enrichment, lead radar, seller
discovery, market gap) — čakajú na lead dáta. Genome/simulation/scoring-engine — Vlna 3.
NESTAVAŤ.

## ZHRNUTIE
Tabuľka: úloha → vetva → commit → CI → artefakt. Test na reálnej zákazke (13303557),
nie mock. Žiadne "hotovo" bez git dôkazu.
