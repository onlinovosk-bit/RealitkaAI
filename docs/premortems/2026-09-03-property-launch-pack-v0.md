# PREMORTEM: Property Launch Pack V0 (Reality Smolko)

**Cieľová cesta:** `docs/premortems/2026-09-03-property-launch-pack-v0.md`  
**Zdroj:** `docs/briefs/BO-property-launch-pack-v0.md`  
**Build Package:** `docs/briefs/build-package-property-launch-pack-v0.md`  
**Integration Report:** `docs/reports/2026-09-03-property-launch-pack-integration.md`  
**Šablóna:** `docs/templates/premortem.md`

## KROK 1 — Podklad

- [x] Plán/BO: cieľ (pack ≤20 min), metrika, scope IN/OUT, pilot 5, zákazy (nová DB, auto-publish, chatbot).

## KROK 2 — Perspektívy

1. **Founder:** Smolko uvidí „AI pack“, ale texty budú s `type=Ostatné` / cenou 0 → strata dôvery rýchlejšie než bez toolu.
2. **Adversariálny inžinier:** dve cesty sa „zjednotia“ len v dokumente; KF1 stále obíde Guardian; alebo sa pridá tabuľka napriek zákazu.
3. **Zákazník (Smolko):** „Za 20 minút som dostal FB text, ale fakty nesedia s PDF / Realvia“ — musí ručne opravovať všetko.
4. **Externý realizátor:** async hlas v tomto premorteme **nebol** — zapísané; výsledok slabší o 1 hlas.

## KROK 3 — Imaginácia zlyhania

Je **3. 10. 2026**. Property Launch Pack V0 zlyhal. Stalo sa toto:

1. **TECH:** Orchestrátor volal `generateListingContent` bez `reviewGeneratedListing` — maklér exportoval pack s vymyslenou výmerou.  
2. **TECH:** Pilot bežal na riadkoch s `type=Ostatné` (65 % inventory) — copy a score boli nezmyselné.  
3. **BIZNIS:** Stopky ukázali 45 min / ponuku (form + opravy faktov) — sľub 20 min sa nesplnil, Smolko prestal tool používať.  
4. **BIZNIS:** Tím opravil `mapCategory` v tom istom PR ako pack → CI/regresia syncu, 1 PR ≠ 1 zmena.  
5. **PRÁVO/GDPR:** Export ZIP obsahoval telefón majiteľa z `payload_raw` na zdieľanie s grafikom bez právneho základu.  
6. **PREVÁDZKA:** Persist išiel do `ai_generations`, tabuľka na prod neexistovala — tiché warn, maklér si myslel že je uložené, po reload stratil draft.  
7. **PREVÁDZKA:** Niekto zapol „publish microsite“ lebo demo vyzeralo hotovo — `human-approval` Map sa po deployi vymazala a publish prešiel inou dierou.  
8. **TRH:** Verejný chatbot „spýtaj sa na byt“ pribudol ako „nice“ — mimo scope, spotreboval týždeň, pack stále nebol.

## KROK 4 — Zlúčené riziká

| # | Riziko (minulý čas) | Hlas | Kategória |
|---|---|---|---|
| 1 | Pack export bez Guardian pass | adversár | TECH |
| 2 | Pilot na Ostatné / prázdnych faktoch | founder | TECH/BIZNIS |
| 3 | SLA 20 min nesplnené | zákazník | BIZNIS |
| 4 | Scope creep: mapCategory + pack v jednom PR | adversár | PREVÁDZKA |
| 5 | PII v export artefakte | adversár | PRÁVO |
| 6 | Falošný persist (`ai_generations` missing) | adversár | PREVÁDZKA |
| 7 | Publish napriek zákazu | founder | TECH |
| 8 | Chatbot / iná featura namiesto packu | trh | TRH |

## KROK 5 — Matica P×Z

| # | Riziko | P | Z | Sk | Mitigácia / Kill |
|---|---|---|---|---|---|
| 1 | Export bez Guardian | 3 | 3 | **9** | Hard gate v orchestrátore; verification test. Kill: ak existuje code path bez `guardian.ok` → merge stop |
| 2 | Zlé facts / Ostatné | 3 | 2 | **6** | Pilot len Byt/Dom alebo manuálny type z PDF; mapCategory mimo BO. Kill: >2/5 pilotov Ostatné bez manuálneho override → STOP pilot |
| 3 | >20 min | 2 | 3 | **6** | Meranie stopiek; UI max 1 obrazovka facts→generate→approve→export. Kill: medián >25 min na 5 → redesign, nie viac features |
| 4 | Scope creep mapCategory | 2 | 3 | **6** | Explicit OUT v BO. Kill: diff obsahuje `processQueue.ts` mapCategory → reject PR |
| 5 | PII v ZIP | 2 | 3 | **6** | Allowlist polí v exporte; žiadny raw payload. Kill: `payload_raw` v exporte → fail test |
| 6 | Falošný persist | 3 | 2 | **6** | V0 = download-first; žiadny sľub „uložené“ kým `ai_generations` nie je na prod |
| 7 | Publish | 1 | 3 | **3** | Žiadny write do portal; `publishBlocked`; assertPublishAllowed |
| 8 | Chatbot creep | 1 | 2 | **2** | OUT v BO |

**≥6 pred implementačným GO:** #1–#6 musia mať mitigáciu v pláne (Build Package §).

## KROK 6 — Revízia

| Riziko | Mitigácia v pláne | Kill |
|---|---|---|
| #1 | Wire Guardian pred approve | code path bez gate |
| #2 | Pilot criteria + manuálny type | >2/5 Ostatné |
| #3 | Single-flow UI + stopky report | medián >25 min |
| #4 | PR checklist zakáže processQueue type fix | diff hit |
| #5 | Export allowlist test | payload_raw v artefakte |
| #6 | Download-first copy v UI | „uložené v CRM“ bez tabuľky |
