# VEOS — kompilovaný engineering balík (integrácia do Revolis architektúry)

**Cieľová cesta:** `docs/architecture/veos-integration.md`
**Vstup:** VEOS Founding Constitution v1.0 (12-modulový návrh)
**Kompilované:** 23.07.2026 · formát podľa `docs/prompts/veos-voice-compiler.md`

---

## 1. Executive Summary

VEOS sa integruje do Revolisu ako **konverzačná vrstva, nie ako runtime
systém**: dva skutočne nové moduly (Voice Compiler, Prompt Compiler) sa
stávajú pracovným štandardom Claude↔founder, zvyšných 10 modulov sa mapuje
na existujúcich vlastníkov (Memory Engine, .cursor/rules, docs/architecture).
Nevzniká žiadny nový kód, DB objekt ani scheduler — vzniká vynútiteľný
štandard s kvalitatívnou bránou a meraním na 5 pilotných diktátoch.

## 2. Vyčistený diktát (zámer bez straty informácie)

Founder chce systém, ktorý z jednej minúty neštruktúrovaného hlasového
diktátu vytvorí produkčne použiteľný engineering balík (summary, prompt
pre cieľový nástroj, architektúra, plán, riziká, testy, acceptance,
otázky) — v kvalite konsenzu senior tímu, bez straty technických detailov
(súbory, tabuľky, endpointy), bez vymýšľania faktov, s explicitnými
predpokladmi. Dlhodobo modulárny systém (12 modulov), nie monolitický
prompt. Zámer: rýchlosť od myšlienky k realizácii pri zachovaní kvality.

## 3. Profesionálny prompt (pre Cursor — repo integrácia, malý PR)

> Ulož priložené súbory: `docs/prompts/veos-voice-compiler.md` a
> `docs/architecture/veos-integration.md` na uvedené cesty. Do
> `.cursor/rules/architecture.mdc` pridaj do sekcie o dokumentácii jednu
> vetu: "Hlasové diktáty foundera sa spracúvajú podľa
> docs/prompts/veos-voice-compiler.md — pred návrhom nového modulu over
> brain/registry (REUSE/EXTEND pred NEW)." Zaregistruj oba dokumenty
> v brain registry (typ: process-standard, vlastník: founder+Claude).
> Jeden branch + PR, žiadny iný scope. STOP po zelenej CI.

## 4. Architektonické odporúčania (mapovanie 12 modulov → vlastníci)

| VEOS modul | Rozhodnutie | Kanonický vlastník |
|---|---|---|
| Founding Constitution | NEW (docs) | `docs/prompts/veos-voice-compiler.md` |
| Voice Compiler | NEW (proces) | Claude chat, podľa štandardu |
| Prompt Compiler | NEW (proces) | Claude chat — výstup šitý na Cursor/Code/Fable |
| Architecture Engine | REUSE | `docs/architecture/` + `architecture.mdc` |
| Decision Auditor | REUSE | `brain/src/audit-core.ts` (Memory Engine) |
| Memory Compiler | REUSE | `brain/registry/` + `brain/decisions/` |
| Agent Orchestrator | DEFER | L99 roadmap, brána 3 zákazníci (nezmenené) |
| Quality Gates | REUSE | `.cursor/rules/*.mdc` + CI |
| Security & Compliance | REUSE | `security-review` flow + testy (auth suite) |
| Performance & Cost | DEFER→čiastočne | Graph Audit Fáza 1 (už zadaná) |
| Documentation Engine | REUSE | docs/ štandard + file-path pravidlo |
| Continuous Learning | REUSE | `brain:weekly` |

Kľúčový princíp: **jeden kanonický vlastník na schopnosť** — VEOS mená sa
mapujú, neduplikujú. Toto mapovanie je záväzné; budúce návrhy "postavme
modul X" sa najprv konfrontujú s touto tabuľkou.

## 5. Implementačný plán

1. **Dnes:** commit oboch dokumentov + 1 veta v architecture.mdc (prompt
   v sekcii 3) — jediná repo zmena celej integrácie.
2. **Pilot (najbližších 5 diktátov):** Andy prilepí surový diktát +
   "compile"; Claude produkuje balík podľa formátu. Každý balík dostane
   v závere riadok VEOS-METRIKA (viď sekcia 8).
3. **Po 5 pilotoch:** vyhodnotenie metrík → rozhodnutie: (a) štandard
   funguje, pokračovať; (b) upraviť formát; (c) zvážiť automatizáciu
   (CLI nad audio) ako novú, samostatne filtrovanú úlohu.

## 6. Riziká

- **Formátová rigidita:** 10 sekcií na triviálny diktát = byrokracia.
  Mitigácia: pravidlo "sekcie vynechať s vysvetlením" je súčasť štandardu;
  pre drobnosti (oprava textu, jeden email) sa VEOS nepoužíva vôbec.
- **Plazivá duplicita:** budúce "vylepšenia" VEOS začnú stavať moduly
  z DEFER/REUSE riadkov. Mitigácia: mapovacia tabuľka je záväzná;
  brain:audit + Kontrolór ju strážia.
- **Strata zámeru pri kompilácii:** kompilátor "vylepší" myšlienku na
  nepoznanie. Mitigácia: sekcia 2 (vyčistený diktát) je vždy prítomná
  a founder ju vie porovnať so svojím zámerom.

## 7. Edge Cases

- Diktát obsahuje viac nezávislých zámerov → kompilátor ich rozdelí na
  samostatné balíky a označí závislosti.
- Diktát protirečí existujúcemu rozhodnutiu v brain/decisions →
  kompilátor to explicitne pomenuje v Otvorených otázkach, nerozhodne sám.
- Diktát žiada niečo zo ZAKÁZANÝCH AKCIÍ → kompilátor to vyznačí
  a ponúkne najbližšiu povolenú alternatívu (Kontrolór jazyk, nie blok).
- Slovensko-anglický mix a prepisové chyby hlasu (napr. "RealView" →
  Realvia) → kompilátor normalizuje s poznámkou o predpoklade.

## 8. Testovacia stratégia + metriky pilotu

Každý pilotný balík končí riadkom:
`VEOS-METRIKA: vstup N slov → balík za 1 odpoveď | predpokladov: X |
otázok: Y | zmena zámeru: žiadna/aká`
Po 5 pilotoch: priemerný počet doplňujúcich kôl (cieľ ≤1), počet prípadov
straty detailu (cieľ 0), founder subjektívne skóre užitočnosti 1–5 (cieľ ≥4).

## 9. Acceptance Criteria (integrácia hotová, keď)

- [ ] Oba dokumenty v repe, veta v architecture.mdc, brain registry záznamy
- [ ] Prvý reálny diktát skompilovaný podľa formátu s VEOS-METRIKA riadkom
- [ ] Žiadny nový kódový modul, DB objekt ani cron nevznikol
- [ ] Mapovacia tabuľka (sekcia 4) referencovaná pri najbližšom návrhu
      nového modulu (dôkaz: odkaz v diskusii/PR)

## 10. Otvorené otázky (s odporúčanými odpoveďami)

1. Má sa VEOS formát aplikovať automaticky na každý dlhý neštruktúrovaný
   vstup? → **Odporúčanie: NIE, explicitné "compile"** — automatika by
   formátovala aj bežné maily či poznámky; prehodnotiť po pilote.
2. Majú sa kompilované balíky ukladať do repa? → **Odporúčanie: len tie,
   ktoré vedú k realizácii** (do docs/prompts/ ako doteraz); ostatné
   zostávajú v chate, inak vznikne dokumentačný šum.
3. Patrí Prompt Compiler výstup pre "Claude Code" do V1? → **Odporúčanie:
   ÁNO formátom, použije sa keď Andy začne Claude Code používať** — žiadna
   práca navyše teraz.
