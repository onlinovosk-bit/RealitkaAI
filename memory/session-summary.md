## Session 2026-09-29 (UPTM-011 … UPTM-017 — uptm-runner)

> **PRVÁ VEC PRE NOVÚ SESSION:** Founder dal **GO na UPTM-018a**. Vetva
> `claude/map-q3-record-contradiction` je založená z `origin/main` (`5dfb832`),
> **bez commitov**. Nič nie je rozpracované na disku — začni preregistráciou
> špecifikácie (P4), viď „Ďalší krok".

**Repozitár:** `onlinovosk-bit/uptm-runner`, klon v `/home/user/uptm-runner`.
Primárny pracovný adresár session je `/home/user/RealitkaAI`.
**UPTM rozhodnutia patria do `uptm-runner`, nie do RealitkaAI.**

---

### Dokončené — všetko zmergované na `main`

`main` = **`5dfb832`**, strom čistý, **830 passed**, `mutation-gate` **32 mutácií,
`ok: true`**, `baseline_error: None`, `enforcement-evidence` `tree_clean: true`,
`unproven_claims: 0`.

| # | čo | PR |
|---|---|---|
| UPTM-011 | kontrakt pre Bearish Quasimodo; šesťosový status rebrík (`source, rules, implementation, no_leakage, stats, performance`) | #43 |
| UPTM-012 | **definícia swingu** — `runner/swing.py`, `Swing(index, price, kind, confirmed_at)`, invariant `confirmed_at = index + pivot_bars`; plató nedá swing; nič sa spätne nereviduje | #44 |
| UPTM-013 | ES/MES do sourcing mapy — `runner/data_sources.py`, stavy `NOT_IN_MAP → MAPPED_UNVERIFIED → VERIFIED_TERMS → LICENSED → CONNECTED`; `research/data_sources/es_mes_bars.json` | #45 |
| UPTM-014 | **pravidlo rollu** — `runner/roll.py`; zmerané, že back-adjusted séria **precení už potvrdené swingy** (105 → 115), preto je neprípustná | #46 |
| UPTM-015 | MAP-Q1 + MAP-Q2 zatvorené; `runner/cross_repository.py` (nezapojené do `gates.py` zámerne) | #47, #48 |
| UPTM-016 | MAP-Q5 zatvorené; `runner/wave_names.py`, kvalifikované ID `uptm-runner:W<n>` | #49 |
| — | **oprava červeného `main`** — časovaná bomba v `tests/test_kill_switch_detector.py` | #50 |
| UPTM-017 | **`at_risk` = risk-to-stop; účet je podlaha pod tranžou**; VC-I5 + VC-I6; MAP-Q3 zatvorené | #51 |

**Všetkých päť governance otázok (MAP-Q1…Q5) je rozhodnutých.**

#### UPTM-017 detailne (posledný blok)
- **VC-I5** — `capital.at_risk_basis` musí byť deklarovaný; prijíma sa len
  `risk_to_stop`. Zamietnuté: `notional` (700 notionalu nekúpi ES ani MES —
  strop, ktorý nepovolí žiadny test, nie je veľkosť testu) a `margin`
  (artefakt brokera/burzy, hýbe sa s volatilitou). Nedeklarovaný = `UNKNOWN`,
  nie `FAIL`.
- **VC-I6** — `cumulative_realised_loss` je strop len ak naň účet dosiahne.
  `account_equity < amount` → FAIL. Chýbajúca equity = `UNKNOWN`, pomenuje kľúč.
  **Žiadne číslo sa nevymýšľa.**
- Súbory: `runner/detectors/validation_capital.py`,
  `tests/test_at_risk_unit_and_floor.py` (28 testov, U1–U8),
  `runner/mutation_gate.py` (+`at-risk-basis-unchecked`, `account-floor-unchecked`;
  `map-q3-marked-decided` prenamierený na `map-q3-turned-into-a-ceiling`),
  `docs/architecture/governance-map.md`, `docs/decisions.md` (DEC-UPTM-017).

---

### Rozpracované / Pending

- **UPTM-018a — GO DANÉ, nezačaté.** `governance-map.md` si protirečí o Q3:
  - riadok **112**: „**DEC-UPTM-MAP-Q3 leaves that relation unadopted.**"
    (napísal PR #38, zarezervoval si label pre *otvorenosť*)
  - riadok **166**: „**DECIDED (DEC-UPTM-MAP-Q3, 2026-09-29): THE ACCOUNT IS A
    FLOOR UNDER THE TRANCHE.**"
  Nadpis Q3 je doslova *„How do €700 and €750 relate?"* — tá istá dvojica, nie
  dve rôzne otázky. **Kód je v poriadku** (VC-I6 číta `capital.account_equity`
  z packu, nie €750 z druhého repa; P11 drží). Chybný je len záznam rozhodnutia.
  **Prečo to nechytil test:** `test_map_q3_is_decided_as_a_floor_and_copies_no_number`
  overuje len, že rozhodnutie *je* v dokumente — nie že tam nie je zároveň opak.
  Guard je jednostranný.

- **Čaká na foundera, nezačaté:**
  - **Dve čísla pre UPTM-018:** `capital.account_equity` a
    `validation_capital.amount`. Bez nich VC-I5/VC-I6 končia na `UNKNOWN`.
    (700 EUR je dnes len fixture v testoch, nie rozhodnutie.)
  - **Štyri vendor otázky k ES/MES dátam** — egress blokovaný 3× na
    `databento.com`, `cmegroup.com`, `interactivebrokers.com`, `firstratedata.com`
    (403/407 z proxy = org policy). Nikdy som si podmienky nevymyslel.
    Diskvalifikačná otázka: *„dodávate surové per-contract dáta?"* (nie
    back-adjusted — UPTM-014 zmeral, prečo).
  - ebook strany pre Quasimodo + pp. 27–30; Hafez primárny zdroj;
    migrácia `mechanical_break_retest_hafez.json` na rebrík;
    183 packov, ktoré evidence schéma nepozná;
    zastaraná próza `founder_parameter_required` v `constitution/capital-rules.json`
    (ponúknuté, GO nedané).

---

### Kľúčové súbory zmenené

- `runner/detectors/validation_capital.py`: VC-I5 (`AT_RISK_BASIS`) + VC-I6 (podlaha)
- `runner/swing.py`, `runner/roll.py`, `runner/data_sources.py`, `runner/wave_names.py`,
  `runner/cross_repository.py`, `runner/pattern_contract.py`: nové moduly UPTM-011…016
- `runner/mutation_gate.py`: 32 mutácií
- `docs/architecture/governance-map.md`: všetkých 5 otázok DECIDED (**+ rozpor, viď UPTM-018a**)
- `docs/decisions.md`: DEC-UPTM-011 … DEC-UPTM-017, DEC-UPTM-MAP-Q1/Q2/Q3/Q5

---

### Stojace pravidlá (neporušiteľné)

1. **Žiadna implementácia bez explicitného GO.**
2. **Merge je akt foundera** — len na explicitné „merguj N". GO menujúce už
   zmergovanú PR **nie je** GO pre inú otvorenú; pýtaj sa, nesubstituuj.
   (Stalo sa 2× — „merguj 43" po merge #43.)
3. **Preregistrácia pred implementáciou (P4)** — spec vo vlastnom commite.
4. **Guardy sa prenamierujú, nemažú**, keď sa fakt zmení; docstring povie prečo.
5. **„Derived, never typed"** — množiny sa merajú, nie píšu.
6. **Čísla, ktoré sú apetítom na riziko, nevymýšľaj.** Founder ich stanovuje.
7. `LIVE_TRADING` zostáva `false`; bezpečnostná obálka sa nerozširuje.
8. **Merge overuj obsahom na `origin/main`**, nie zeleným odznakom.
9. Vzdialené vetvy: `git ls-remote origin refs/heads/...` — tento klon
   netrackuje `origin/<branch>`, `git rev-parse origin/X` fatalne padne.
10. **403/407 z proxy = org policy.** Nahlás blokovaný host, neobchádzaj,
    nikdy nevypínaj TLS verifikáciu ani `HTTPS_PROXY`.
11. `pytest`/`mutation-gate` **nikdy súbežne** — brána mutuje súbory na disku,
    paralelný pytest číta zmutovaný strom a hlási falošné red. (Stalo sa.)
12. `pyproject.toml` má `addopts = "-q"` → súhrnný riadok „N passed" sa nezobrazí
    pri `-q`; spusti bez neho, ak chceš počet.
13. Mutation-gate JSON má kľúč **`mutations`**, nie `cases`.

---

### Ďalší krok

**UPTM-018a** (GO dané): preregistruj spec, potom:
1. prepíš odsek na r. 112 `governance-map.md` tak, aby hovoril, čo
   DEC-UPTM-MAP-Q3 rozhodol (vzťah = *podlaha*; `account_equity` je deklarovaný
   údaj packu, **nie** €750 z druhého repa, ktoré `uptm-runner` nesmie prepísať);
2. pridaj **obojstranný test**: dokument nesmie niesť „unadopted" aj „DECIDED"
   pod tým istým labelom;
3. jeden mutation case;
4. draft PR, **nemergovať** bez „merguj N".
