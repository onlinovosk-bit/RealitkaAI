# RUFLO OVERNIGHT BRIEF — aktuálny stav (#231 + testy + docs)

> **SUPERSEDES:** `ruflo-swarm-full-night-chain.md` (Vlna 1–2 už merged #228/#229/#230).
> Vlna 1 (#228/#229) a Vlna 2 (#230) sú UŽ v kóde a verified (Smolko: 6/6 capability PASS, completeness **44 %** = 4/9 polí v rubrike `scoreListingCompleteness` — pozri `listing-score/score.ts`).
> Tento brief stavia LEN to, čo je reálne otvorené. Nestavia hotové veci.
> Self-gate: auto-postup len pri zelenom CI + nedeštruktívnej vlne. STOP pri PROD/externom.
> Cesta: `docs/briefs/overnight/ruflo-overnight-brief-231-tests.md`
> Anti-style: `.claude/anti-style.md` · Fáza 0: `ruflo-swarm-activation-prompt.md`

## ⛔ FÁZA 0 (write-probe — povinná)
Write-probe: vetva `test/write-probe-night`, 1 riadok do `docs/audit/write-probe.md`, commit, push, over.
Ak nezapíše → STOP celý reťazec, hlás ráno. Bez write capability noc nemá zmysel.

## SELF-GATE (medzi každou vlnou)
Po dobehnutí vlny swarm SÁM vyhodnotí:
- CI zelené na všetkých PR vlny? Ak NIE → STOP, čakaj na ráno.
- Vlna = len nedeštruktívne kroky (kód na vetve, PR, žiadny PROD write, žiadny externý send)? Ak ÁNO → ďalšia vlna.
- PROD write / externý send / nejasnosť? → NEVYKONÁVAJ, priprav a STOP.
- Nová scope mimo briefu? → backlog, NEROB, pokračuj.
- **Auto-merge NEROBIŤ** — PR nechaj otvorené pre Andyho ranný review.
- Ďalšia vlna **stacked** na predchádzajúcej vetve (nie na nemergnutom main).

## VLNA 1 — #231 HTML sanitizácia (reálny bug z vizuálu, najvyššia hodnota)
Vetva: **`feat/capabilities-strip-html-description`** (PR [#231](https://github.com/onlinovosk-bit/RealitkaAI/pull/231) už existuje — **nevytváraj duplicitnú vetvu**)
- PROBLÉM: description zo zákazky obsahuje HTML; presakuje do listing/deck/microsite.
  Guardian to správne flagol (FLAG namiesto PASS) na Smolko zákazke **13303557**.
- FIX: checkout PR vetvu; dokonči/rozšír `stripHtmlToPlainText` v `realviaRowToUcListing` tak,
  aby HTML zmizlo PRED renderom vo všetkých capabilities (listing-score, banner, deck, microsite).
  Ak treba, jeden zdieľaný util v `apps/crm/src/lib/` — nie duplicitná logika.
- TEST: fixture 13303557 — Guardian PASS (nie FLAG), popis bez tagov; skip „Cena 0 EUR“ pri `price=0`.
- AP-001: žiadne vymyslené dáta; test na reálnom riadku.
- CI flake (Supabase 502): re-run pred self-gate, ak padne infra — zaznamenaj, pokračuj len ak testy lokálne zelené.
- → PR #231 (update existujúceho). → SELF-GATE → ak zelené, Vlna 2.

## VLNA 2 — Test coverage capabilities (stacked, bezpečné)
Vetva: test/capabilities-coverage
- Doplň unit testy pre listing-score, export-diagnostics, banner, presentation,
  microsite — na reálnych fixtures (13303557, 2772732443). Pokry hlavne edge cases:
  chýbajúca cena, chýbajúce GPS, HTML v popise (po #231).
- Žiadna nová logika — len testy. → PR. → SELF-GATE → ak zelené, Vlna 3.

## VLNA 3 — Dokumentácia capabilities (stacked, najbezpečnejšie, nevyčerpateľné)
Vetva: docs/capabilities
- docs/capabilities/*.md pre každú capability: čo robí, vstup, výstup, príklad z 13303557.
- Aktualizuj ARTIFACT prehľad (čo je verified, čo FLAG).
- → SELF-GATE → STOP (koniec reťazca) alebo pokračuj ak je čas.

## VYLÚČENÉ Z NOCI (STOP/GO ráno — Andy)
- A3 processed=false cleanup (2 riadky) → PROD write.
- Smolko Dopyty CSV import → čaká na CSV.
- Akýkoľvek merge do main → ranný review (PR nechaj otvorené).
- Lead-features, Genome, Kit artefakty → mimo scope tohto briefu.

## RANNÉ ZHRNUTIE (povinné)
Tabuľka: vlna → úloha → vetva → commit → CI → artefakt áno/nie.
Kde reťazec zastal a prečo. Čo čaká na GO (merge #231, A3, email Smolko CSV). Git dôkaz povinný (AP-009).

---

## RUFLO SPUSTENIE (večer — Andy GO)

```powershell
cd C:\RealitkaAI

npx ruflo@latest swarm stop --force 2>$null
npx ruflo@latest swarm init -t mesh -m 5
npx ruflo@latest swarm start -o @"
REVOLIS OVERNIGHT (231+tests+docs): Read docs/briefs/overnight/ruflo-overnight-brief-231-tests.md
AND docs/briefs/overnight/ruflo-swarm-activation-prompt.md AND .claude/anti-style.md.
FÁZA 0 write-probe first. Then Vlna 1: finish PR #231 on feat/capabilities-strip-html-description
(HTML in Realvia description → Guardian FLAG on 13303557). SELF-GATE. Vlna 2: test coverage only.
Vlna 3: docs/capabilities/*.md. Stacked branches. NO main merge. NO PROD write (A3 excluded).
NO rebuild #228/#229/#230. maxTokens >= 16384 on agent_execute. Output: docs/audit/overnight-report-231.md
"@
npx ruflo@latest swarm status
```

**Brány:** spustenie = Andy (Ruflo prístup). Merge #231 + A3 = ranný review Andy.
