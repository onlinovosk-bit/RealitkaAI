# 07 — Work-Block Execution Protocol (WBEP) v0.1

**Cieľová cesta:** `docs/prompts/multi-agent-protocol-v0/07-work-block-execution-protocol.md`
**Stav:** `NÁVRH v0.1 — NIE JE V PLATNOSTI`
**Autorita:** žiadna. Vstupuje do platnosti až founderovým `DECISION` podľa 03.
**Vzťah k 00–06:** 00–06 platia ďalej a pri konflikte vyhrávajú (nižšie číslo vyhráva, viď README).
Tento súbor mení **granularitu schvaľovania**, nie typovanie (02), nie ľudskú bránu (03), nie role (06).

> **Žiadny runtime enforcement neexistuje.** Nič v tomto súbore nie je vynucované kódom, CI ani
> hookom. Je to kontrakt, ktorý dodržiava executor. Ak ho executor poruší, systém to nezachytí.
> Každé tvrdenie typu „agent nesmie" tu znamená „agent sa zaviazal nerobiť", nie „agentovi je to
> technicky znemožnené". Toto rozlíšenie je zámerné a nesmie sa zo súboru odstrániť.

---

## 1. Problém, ktorý tento súbor rieši

Behy 2026-09-18 až 2026-09-21 ukázali **dva rôzne problémy, ktoré sa nesmú zamieňať**:

| | Friction problem | State integrity problem |
|---|---|---|
| **Prejav** | Founder schvaľuje jednotlivé kroky (inspect → analyze → edit → test → commit → push → PR) | Text preposlaný cez foundera nereprezentuje aktuálny stav repozitára |
| **Príčina** | Executor žiada GO aj na reverzibilné operácie, ktoré 03 nikdy nepodmienil | `origin/main` sa pohol 4× počas jednej úlohy; práca z inej session prišla cez chat ako „naša" |
| **Riešenie** | Work Blocks (§2–§7) | State binding a invalidácia (§8–§10) |
| **Pozor** | | **Väčšie bloky tento problém zhoršujú**, nie zlepšujú — dlhšie okno medzi autorizáciou a vykonaním |

**FINDING (overené proti repu):** per-step GO režim **nikdy nebol v protokole.** `03-human-decision-gate.md`
uvádza 6 triggerov (merge, prod/secrets/cron/external, nový scope, kolízia zápisov, prepis DECISION,
Grokovo „just ship it"). Commit na vlastnú vetvu, push na vlastnú vetvu, draft PR, test, lint ani
read-only dopyt medzi nimi **nie sú**. Per-step GO vznikol ako executorova nadmerná opatrnosť plus
founderov ad-hoc zoznam zákazov, nie ako pravidlo. WBEP teda z veľkej časti **nezavádza novú
autonómiu — obnovuje tú, ktorú 03 už dávno pripúšťa.**

---

## 2. Definícia Work Blocku („steny")

**Work Block = najmenší celok, ktorý founder dokáže prijať alebo odmietnuť na jedno prečítanie,
bez toho, aby potreboval poznať jeho interné kroky.**

Founder schvaľuje **výsledok** bloku, nie jeho interné kroky.

### Granularita

| Úroveň | Rozsah | Kto autorizuje |
|---|---|---|
| Micro-task | jeden súbor / jeden test / jeden dopyt | executor sám, nehlási sa |
| **Work Block (stena)** | jeden prijateľný/odmietnuteľný deliverable | **founder — jeden checkpoint na konci** |
| Fáza | niekoľko blokov s jedným cieľom | founder na začiatku (cieľ) a po každom bloku |
| Míľnik | fázy vedúce k zmene produktu | founder `DECISION` |

### Tok

```
GO WALL (cieľ + scope envelope)
   ↓
autonómna práca (discover · reason · implement · test · self-correct)
   ↓
VERIFY (§11) + STATE DELTA (§9)
   ↓
DECISION PACK (§12)
   ↓
Founder checkpoint → GO / NO-GO
```

---

## 3. Scope envelope

Každá stena má pred začiatkom obálku. Ak ju founder nezadá, **executor ju navrhne v prvej
odpovedi a čaká na potvrdenie** — obálka je súčasťou zadania, nie výsledku.

```
WALL: <id>
├── Objective            čo má na konci existovať
├── Allowed files/areas  cesty alebo oblasti, do ktorých smie zápis
├── Allowed operations   §5
├── Forbidden operations §6 + čokoľvek špecifické pre túto stenu
├── Expected deliverable čo founder dostane
├── Verification criteria ako sa overí, že je hotovo (§11)
└── Escalation conditions ktoré z A–F sa tu očakávajú
```

**Executor nesmie sám rozšíriť stenu.** Rozšírenie je founderovo rozhodnutie (§7).

---

## 4. Wall sizing

| Pravidlo | |
|---|---|
| Odhad | Executor v obálke uvedie odhad rozsahu (súbory / riadky / trvanie). |
| Strop | Ak reálny rozsah prekročí odhad o **viac než 2×**, stena sa zastaví. |
| Čo sa stane pri zastavení | Executor doručí **čiastkový, konzistentný výsledok** + presne, čo zostáva. Nezvyšuje rozsah sám. |
| Čo sa nikdy nestane | „Tri hodiny neskôr som zmenil 27 súborov a prerobil architektúru." |

Čiastkový výsledok musí byť sám o sebe konzistentný (nesmie nechať repo v rozbitom stave).
Ak sa to nedá, executor stenu **vráti späť** a doručí len nález.

---

## 5. Autonomous operations — čo executor robí bez pýtania

Vnútri autorizovaného scope, bez hlásenia a bez GO:

- čítanie kódu, dokumentov, histórie, PR, CI logov
- **read-only** dopyty do produkčnej DB
- písanie a úprava súborov v `Allowed files/areas`
- spúšťanie testov, lintu, typecheku, buildu
- vytvorenie vlastnej vetvy, commit, **push na vlastnú vetvu**
- otvorenie **draft** PR
- oprava vlastnej červenej CI na vlastnom PR
- príprava textov, ktoré **neodchádzajú von** (drafty)
- self-correction (§13)

---

## 6. Hard boundaries — nikdy sa nezlúčia do steny

Tieto vyžadujú samostatný explicitný founderov token (03), aj keby boli „logicky ďalší krok":

1. **merge** do `main` (alebo do akejkoľvek cudzej vetvy)
2. **push do `main`**
3. **zápis do produkčnej DB** a migrácie
4. zmeny **`.github/workflows`**
5. **force-push** a prepis histórie (vrátane amend a rebase cudzej vetvy)
6. **odoslanie čohokoľvek von** — email klientovi, komentár na cudzí PR, správa do externého systému
7. vlastné `DECISION` (03 — DECISION je founder-only)

Body 1–4 sú founderove stále zákazy. Body 5–7 doplnil executor a odporúča ich ponechať.

---

## 7. Escalation conditions — kedy sa stena zastaví

Executor zastaví Work Block **iba** ak nastane jedna zo šiestich podmienok:

| | Podmienka | Význam |
|---|---|---|
| **A** | Scope breach | Potrebná práca prekračuje autorizovanú obálku |
| **B** | Authorization boundary | Potrebná operácia je v §6 |
| **C** | Capability boundary | Executor nemá prístup/oprávnenie (403, chýbajúci token, odopretý nástroj) |
| **D** | Safety / invariant breach | Pokračovanie by porušilo hard invariant (GDPR, tenant izolácia, PII, strata dát) |
| **E** | Material ambiguity | ≥2 materiálne odlišné možnosti a kontrakt neurčuje, ktorú zvoliť (§14) |
| **F** | State invalidation | Relevantný stav sa zmenil tak, že by to zneplatnilo výsledok alebo autorizáciu (§10) |

Nič iné nie je dôvod na zastavenie. Nejasnosť sama o sebe **nie je** dôvod (§14).

### Wall Expansion Required (pri A)

Pri scope breach sa executor **nepýta „môžem zmeniť tento jeden súbor?"**. Doručí hotový balík:

```
WALL EXPANSION REQUIRED

Pôvodná stena:      <objective + obálka>
Nález:              <čo sa zistilo, s dôkazom>
Prečo scope nestačí: <mechanizmus, nie dojem>
Navrhované rozšírenie: <presné cesty a operácie>
Dopad:              <čo sa zmení, čo sa tým riskuje>
Možnosti:
  A  <rozšíriť — dôsledok>
  B  <nerozširovať, doručiť čiastkovo — dôsledok>
  C  <zahodiť — dôsledok>
Odporúčanie: <jedna z nich + prečo>
```

---

## 8. State binding

Každá stena je viazaná na stav, na ktorom bola autorizovaná. Nadväzuje na `P1 v0.2` poľa
`valid_for` (`base` + `depends_on`) a `on_state_change ∈ abort | re-audit | proceed`, **default `abort`**
(viď `docs/reports/2026-09-16-gate0-protocol-validation.md`, Amendment 2026-09-18).

Na začiatku steny executor zapíše **BASE STATE** — každú referenciu, od ktorej výsledok závisí:

```
BASE STATE
main    = <SHA>
branch  = <SHA>
PR      = #<n> @ <head SHA>
prod    = <čo bolo prečítané, kedy>
```

Na konci steny zapíše **FINAL STATE** v rovnakom tvare.

---

## 9. State delta — povinná časť každého Decision Packu

```
STATE DELTA
main changed?          YES → 9593ec08 (bolo 87e460aa)
branch changed?        NO
PR metadata changed?   ...
prod changed?          UNKNOWN / not re-read
```

**Executor sám vyhodnotí dopad** — neoznamuje len fakt zmeny:

- „Zmena `main` sa nedotkla žiadneho súboru v mojom diffe → **výsledok platí**." (s dôkazom: `git diff --name-only`)
- „Zmena `main` sa dotkla súboru, ktorý mením → **WALL INVALIDATED / RE-AUDIT REQUIRED**."

Samotné „`main` sa pohol, oznamujem" je **nedostatočné**. Vyhodnotenie je súčasťou práce.

---

## 10. State invalidation

| Situácia | Dôsledok |
|---|---|
| `depends_on` referencia sa zmenila, dopad žiadny (dokázaný) | `proceed` — zaznamená sa do Decision Packu |
| `depends_on` referencia sa zmenila, dopad neistý | `re-audit` — executor prácu preverí a prehlási znovu |
| `depends_on` referencia sa zmenila, dopad materiálny | `abort` — **GO vypršalo**, stena sa vyhlási za `EXPIRED`, nie `PAUSED` |
| Nedá sa zistiť, či sa zmenila | `abort` (default) |

**Kandidátsky core invariant (z behu 2026-09-18, zatiaľ bez founderovho DECISION):**

> Žiadna mutácia nesmie bežať proti stavu odlišnému od stavu, na ktorom bola autorizovaná,
> pokiaľ to protokol výslovne nedovolí cez re-audit / re-autorizáciu.

---

## 11. Verification — executor overuje sám, pred hlásením

Stena sa nehlási ako hotová, kým executor neoverí. Minimum:

- diff prečítaný **adverzárne** vlastnými očami (čo by CI odmietlo?)
- testy / lint / typecheck spustené lokálne, výsledok priložený **doslovne**
- pri oprave: reprodukovaná pôvodná chyba **pred** opravou a zelený beh **po** nej
- `git diff --stat` porovnaný s očakávaním v obálke
- **obsah v indexe**, nie len v pracovnom strome (lekcia z PII incidentu 2026-09-20 — index držal nescrubbovanú verziu)
- PII / tajomstvá: žiadne reálne mená, adresy ani e-maily v commit message, testoch ani fixtúrach

Ak overenie zlyhá, stena sa **nehlási ako hotová**. FAIL sa nezaokrúhľuje na PASS.

---

## 12. Decision Pack — jediný výstup steny

Founder dostane **jednu správu** v tomto tvare. Nie sériu fragmentov.

```
WALL <id> — <READY | PARTIAL | BLOCKED | EXPIRED>

1. Cieľ            čo bolo zadané
2. Čo som urobil   vecne, bez narácie krokov
3. Dôkaz           príkazy, výstupy, diffstat, čísla testov — doslovne
4. STATE DELTA     §9 vrátane vyhodnotenia dopadu
5. Čo som NEurobil a prečo    (hard boundary / mimo scope / zlyhalo)
6. Otvorené otázky (iba typu E podľa §14 — s odporúčaním)
7. Ďalší krok      presný token, ktorý má founder poslať
8. founder_relays  <číslo> (cieľ 0, podľa 06)
```

Pravidlo z 03 platí: founder nemá nikdy re-kopírovať kontext, ktorý už existuje na ceste v repe.

---

## 13. Self-correction

Vnútri steny executor opravuje vlastné chyby bez hlásenia a bez pýtania: zlyhaný test, zlý join,
nesprávny predpoklad, červená CI na vlastnom PR, vlastné preklepy. Do Decision Packu ide iba
**vecný dopad** opravy, ak nejaký je — nie kronika pokusov.

Výnimka: ak vlastná chyba už opustila stenu (zapísaná do artefaktu, odoslaná von, uvedená
founderovi), oprava sa **musí** uviesť explicitne a audit trail sa zachová. Záznam sa neprepisuje.

---

## 14. Question Budget

**Nejasnosť sama o sebe nie je dôvod na otázku.** Pred každou otázkou executor vyčerpá v poradí:

1. **repository evidence** — kód, testy, história, PR, migrácie
2. **existujúce pravidlá** — 00–06, CLAUDE.md, engineering-constitution, revolis-constitution-v2
3. **precedensy** — ako sa to v tomto repe rozhodlo naposledy
4. **canonical source** — master-data-sourcing-map, message.schema.md, ADR
5. **bezpečný default** — reverzibilná, užšia, menej deštruktívna možnosť

Až potom founder.

| | |
|---|---|
| ❌ | „Našiel som A a B. Čo preferujete?" — keď sa to dá objektívne rozhodnúť |
| ✅ | „A aj B boli možné. Pravidlo X jednoznačne preferuje A, preto som použil A." |
| ✅ | „A aj B majú materiálne odlišný dopad a kontrakt výber neurčuje → **Founder decision required**." (= eskalácia E) |

Otázka bez uvedeného vyčerpania 1–5 je **porušenie protokolu**, nie opatrnosť.

---

## 15. Authoritative-source rule

> **DESCRIPTION ≠ STATE.**
> Externý opis stavu sa nesmie považovať za autoritatívny stav, ak existuje dostupný
> authoritative source.

Text od foundera, od ChatGPT, od Groka alebo z inej session je **kontext, nie source of truth.**

| Tvrdenie o... | Authoritative source |
|---|---|
| obsahu vetvy | `git rev-parse` / `git diff` proti `origin` |
| stave PR | GitHub API (`pull_request_read`), nie preposlaný text |
| stave CI | check-runs daného commitu |
| produkčných dátach | dopyt do DB, nie tabuľka v chate |
| prijatom rozhodnutí | `.ai/bus/decisions/` |

Ak authoritative source **neexistuje alebo je nedostupný**, executor to označí `UNKNOWN` /
`NOT AVAILABLE`. Nedopĺňa si ho z opisu.

**Dôkaz, prečo toto pravidlo existuje:** 2026-09-20 prišla cez chat práca z inej session
(„7/7 mutations", `capital-rules.json`, UPTM, P1–P14) opísaná ako naša. Overením proti `main`
a vzdialeným vetvám sa ukázalo, že v repe neexistuje. Bez tohto pravidla by sa stala
súčasťou záznamu.

---

## 16. Cross-session identity

Executor je **jedna session**. Nemá pamäť iných sessions a nesmie ju predstierať.

- Prácu inej session prevezme **iba** cez PR číslo, názov vetvy alebo commit SHA — **nikdy cez
  preposlaný text.** Ak founder pošle opis bez referencie, executor si referenciu vyžiada; to je
  legitímna otázka podľa §14 (bod 1 zlyhal — artefakt neexistuje).
- Cudziu vetvu nikdy neprepisuje (§6.5). Merge base branch, nie rebase.
- Pred zápisom do zdieľaného súboru (`memory/`, `.ai/bus/`) executor **znovu načíta aktuálny
  `origin/main`** — iná session tam mohla medzitým zapísať. (Lekcia: PR #600 pridal +266 riadkov
  do `memory/` počas jednej steny.)
- **Jeden zapisovateľ na task** (06) platí ďalej.

---

## 17. Founder approval boundary — zhrnutie v jednej vete

> Founder schvaľuje **výsledok** pracovného bloku, nie jeho interné kroky. Executor má autonómiu
> vykonať všetky bezpečné a reverzibilné operácie potrebné na dosiahnutie cieľa **v rámci
> autorizovaného scope**. Founderovo schválenie sa vyžaduje až pri prekročení scope, authorization
> boundary, safety invariantu, capability boundary, pri materiálne nejednoznačnom rozhodnutí,
> alebo pri invalidácii stavu.

Founder nie je senior developer schvaľujúci shell príkazy. Founder je **approval authority, ktorá
dostáva hotové rozhodovacie balíky.**

---

## 18. Čo tento súbor zámerne NErobí

- Nezavádza runtime enforcement (viď hlavička).
- Nemení typovanie (02), ľudskú bránu (03) ani role (06).
- Nemení metriku `founder_relays` ani jej cieľ 0 (06).
- Neruší žiadny existujúci zákaz. §6 je nadmnožina founderových stálych zákazov.
- Nevytvára `DECISION`. Tento súbor je `PROPOSAL`.

---

## 19. Otvorené body pre foundera

| # | Otázka | Default ak sa nerozhodne |
|---|---|---|
| 1 | Prijať WBEP v0.1 ako default? | Neprijaté — platí per-step GO |
| 2 | §4 strop 2× — správne číslo? | 2× |
| 3 | §6 body 5–7 (force-push, externé odoslanie, DECISION) ponechať medzi hard boundaries? | Ponechať |
| 4 | §10 kandidátsky core invariant povýšiť na invariant? | Zostáva kandidát |
| 5 | Prvá stena podľa WBEP: `605-RECONCILIATION` (read-only snapshot + návrh riešenia konfliktu, **bez** merge/rebase/force-push/zmeny vetvy) | Nespustená |

## Revízia

Po **3 stenách** founder vyhodnotí, či WBEP ponechať, upraviť, alebo zrušiť. Metriky na vyhodnotenie:
`founder_relays` na stenu (cieľ 0), počet founderových zásahov na stenu (cieľ 1),
počet stien zastavených podľa §7 a ktorou podmienkou.
