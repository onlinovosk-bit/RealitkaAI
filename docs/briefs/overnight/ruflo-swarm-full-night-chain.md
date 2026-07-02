# RUFLO SWARM — CELONOČNÝ REŤAZEC so SELF-GATE

> **⚠️ SUPERSEDED (2026-06-20):** Vlna 1 (#228/#229) a Vlna 2 (#230) sú merged a verified.
> Pre ďalší nočný beh používaj **`ruflo-overnight-brief-231-tests.md`**. Tento súbor nechaj
> ako historický referenc — nespúšťaj ho na produkčný swarm.

> Cieľ: swarm pracuje cez noc bez Andyho, ale s bránou. Auto-postup LEN pri zelenom
> CI + nedeštruktívnej vlne. STOP a čakaj na ráno pri deštruktívnom/externom/nejasnom.
> Trvanie nie je cieľ — kvalita je. Lepšie 4 čisté PR + STOP než 10 nedorobkov.
> Cesta: docs/briefs/overnight/ruflo-swarm-full-night-chain.md

## ⛔ FÁZA 0 (raz na začiatku)
Write-probe: vetva test/write-probe-night, 1 riadok do docs/audit/, commit, push, over.
Ak nezapíše → STOP celý reťazec, hlás ráno. Bez write capability noc nemá zmysel.

## SELF-GATE PRAVIDLO (medzi každou vlnou)
Po dobehnutí vlny swarm SÁM vyhodnotí:
- CI zelené na všetkých PR vlny? Ak NIE → STOP, čakaj na ráno (Andy pozrie zlyhanie).
- Vlna obsahovala len nedeštruktívne kroky (kód na vetve, PR, žiadny PROD write,
  žiadny externý send)? Ak ÁNO → pokračuj na ďalšiu vlnu.
- Vlna obsahuje PROD write / externý send / nejasnosť? → NEVYKONÁVAJ, priprav a STOP.
- Agent narazil na novú scope mimo reťazca? → zaznamenaj do backlogu, NEROB, pokračuj.
Auto-merge NEROBIŤ — PR nechaj otvorené pre Andyho ranný review. Reťazec stavia
ďalšiu vlnu na PREDOŠLEJ VETVE (stacked), nie na nemergnutom main, aby závislosti sedeli.

---

## VLNA 1 — Listing Score + Export Diagnostics (dáta máš)
Viď: ruflo-swarm-listing-score-export-diag.md
- A: feat/listing-completeness-score — skóre + čo chýba, fixture 13303557, AP-001.
- B: feat/export-diagnostics — úspešnosť + dôvody z audit dát, AP-001.
- Paralelne (disjunktné cesty). PR A, PR B. → SELF-GATE → ak zelené, Vlna 2.

## VLNA 2 — K4 UI route + Playbook smoke (stacked na Vlne 1)
Viď: ruflo-swarm-k4-playbook-cleanup.md (časť A + A2, BEZ A3 cleanup)
- A (K4 UI): route zobrazí banner/deck/listing/score pre reálnu zákazku 13303557.
  Stacked na feat/listing-completeness-score (potrebuje skóre na zobrazenie).
- A2 (Playbook): runtime smoke na last_contact fix (#221).
- A3 cleanup VYNECHANÉ z noci — je to PROD write = STOP/GO, rieši Andy ráno.
- → SELF-GATE → ak zelené, Vlna 3.

## VLNA 3 — Listing Score: rozšírenie + AI completeness suggestions (stacked na Vlne 2)
- Rozšír Listing Score (Vlna 1) o KONKRÉTNE AI návrhy, ako doplniť chýbajúce:
  napr. "chýba popis lokality" → návrh textu z reálnych polí zákazky (GPS, mesto).
- Vstup: reálna zákazka + výstup Listing Score. Prejde K1 Guardian (žiadny vymyslený fakt).
- AP-001: návrhy len z reálnych dát zákazky, nevymýšľa parametre, čo tam nie sú.
- → SELF-GATE → ak zelené, Vlna 4.

## VLNA 4 — Test coverage + dokumentácia capabilities (stacked, čisto bezpečné)
- Doplň unit testy pre listing-score, export-diagnostics, K4 route na reálnych fixtures.
- Vygeneruj docs/capabilities/*.md pre každú Vlnu 1 capability (čo robí, vstup, výstup).
- Žiadny nový kód logiky — len testy + docs. Najbezpečnejšia vlna, ideálna na koniec noci.
- → SELF-GATE → ak zelené, STOP (koniec reťazca) alebo Vlna 5 ak je čas.

## ČO JE Z NOCI VYLÚČENÉ (STOP/GO ráno — Andy)
- A3 processed=false cleanup → PROD write.
- Smolko Dopyty CSV import → čaká na CSV od Smolka.
- Lead-features, Genome, simulation, scoring engine → dáta/scope, nestavať.
- Akýkoľvek merge do main → Andyho ranný review.

## RANNÉ ZHRNUTIE PRE ANDYHO (povinné)
Tabuľka za každú vlnu: vlna → úloha → vetva → commit → CI stav → artefakt áno/nie.
Kde reťazec ZASTAL a prečo (zelené dobehlo / CI zlyhalo / narazil na STOP).
Čo čaká na ranný GO (merge, A3 cleanup). Žiadne "hotovo" bez git dôkazu (AP-009).
