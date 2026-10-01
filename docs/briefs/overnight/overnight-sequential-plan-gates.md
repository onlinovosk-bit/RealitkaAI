# OVERNIGHT PLÁN — sekvenčné vlny s GATE (nie auto-reťaz)

> PRINCÍP: každá vlna DOBEHNE → napíše HOTOVO + git dôkaz → ZASTAVÍ a čaká na
> GATE (zelené CI + merge + ľudský GO od Andyho). Ďalšia vlna sa NEspustí sama.
> Toto je výber automatizovaný, vykonávanie za bránou. NIE stealth auto-reťaz.

## PREČO TOTO PORADIE (závislosti + dáta)
- Vlna 1 nezávisí od ničoho, dáta sú (91 zákaziek, audit) → ide prvá.
- Vlna 2 (K4 UI) ZÁVISÍ od capabilities z Vlny 1 + existujúcich K3 → až po merge V1.
- Vlna 3 (Lead-discovery) je ANALÝZA, nie build, a lead-features sú blokované dátami
  (439 prázdnych leadov, čaká na Smolkovu CSV odpoveď) → ide posledná, väčšina ako
  príprava/roadmapa, nie nasadenie.

---

## VLNA 1 — Listing Score + Export Diagnostics (staviteľné TERAZ)
Brief: `docs/briefs/overnight/ruflo-swarm-listing-score-export-diag.md`
- FÁZA 0: write-probe + dôkaz disjunktných ciest.
- A: Property Completeness Score (`lib/capabilities/listing-score/`) — skóre + čo chýba,
  z reálnej zákazky 13303557. Prejde K1 Guardian.
- B: Export Diagnostics (`lib/capabilities/export-diagnostics/`) — úspešnosť + dôvody
  z audit dát. Bez vymyslených príčin (AP-001).
- Paralelne (disjunktné cesty). Každá vlastný PR + CI.

### ⛔ GATE 1 (po Vlne 1 — Andy):
- [ ] CI zelené na oboch PR
- [ ] Kontrolór PASS
- [ ] Andy mergne A + B do main
- [ ] Andy povie "Vlna 2 GO"
→ Bez splnenia GATE 1 sa Vlna 2 NEspúšťa.

---

## VLNA 2 — K4 UI route + Playbook smoke + processed cleanup
Brief: `docs/briefs/overnight/ruflo-swarm-k4-playbook-cleanup.md`
- ZÁVISÍ od: mergnuté capabilities (K2/K3 + Vlna 1 Listing Score) — UI route ich zobrazí.
- FÁZA 0: write-probe + dôkaz disjunktných ciest (app/ vs domain/playbook/ vs DB).
- A (K4 UI): route zobrazí banner/deck/listing/score pre reálnu zákazku. Viditeľné demo.
- A2 (Playbook): runtime smoke na last_contact fix (#221).
- A3 (cleanup): ~8 processed=false — SQL/migrácia na vetve, PROD spustenie = GO REQUIRED.

### ⛔ GATE 2 (po Vlne 2 — Andy):
- [ ] CI zelené na PR (K4, Playbook)
- [ ] Andy mergne
- [ ] A3 PROD cleanup: Andy spustí SQL po overení (SELECT pred UPDATE)
- [ ] Andy povie "Vlna 3 GO"
→ Bez GATE 2 sa Vlna 3 NEspúšťa.

---

## VLNA 3 — Lead-discovery (ANALÝZA, nie build)
Prompt: `docs/prompts/L99-lead-discovery-prompt.md`
- POZOR: toto NIE je swarm build. Je to analytický prompt — panel 30 rolí nájde
  legálne lead kanály cez 5 právnych brán. Výstup = ZOZNAM kanálov + TOP 3, nie kód.
- Väčšina navrhnutých lead-features (attribution, dedup, buyer intent, enrichment...)
  je BLOKOVANÁ dátami — 439 leadov je prázdnych, čaká na Smolkovu CSV odpoveď.
- Preto Vlna 3 = SPUSTIŤ analytický prompt → dostať zoznam → zaradiť do backlogu
  ako roadmapu. Stavať sa začne AŽ keď doraziareálne lead dáta.
- Jediné staviteľné teraz z lead-strany: reaktivácia 439 existujúcich kontaktov
  (legálny enrichment so súhlasom) — ale to je samostatné rozhodnutie cez Ústavu, nie auto.

### ⛔ GATE 3 (po Vlne 3 — Andy):
- [ ] Výstup analýzy zaradený do backlogu (roadmapa)
- [ ] Žiadny lead-feature sa NESTAVIA, kým nie sú reálne lead dáta + Ústava check
→ Vlna 3 NEodomyká build lead-features. Tie čakajú na dáta.

---

## ČO TENTO PLÁN NEROBÍ
- NEspúšťa vlny samé za sebou — každá čaká na GATE (CI+merge+GO).
- NEstavia Vlnu 2 na nemergnutej Vlne 1 (závislosť).
- NEstavia lead-features bez dát (Vlna 3 je analýza, nie build).
- Žiadny PROD write bez GO (A3 cleanup). Žiadny drift mimo týchto troch vĺn.

## ZHRNUTIE PRE ANDYHO (ráno, po každej vlne)
HOTOVO: <čo, git hash, CI> · ODOMKLO: <čo ďalšia vlna potrebuje> ·
ĎALŠIA VLNA: <pripravená, čaká na GATE> · BRÁNA: <čo musíš spraviť pre GO>
