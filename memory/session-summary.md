## Session 2026-09-24 (UPTM governance — uptm-runner)

> **PRVÁ VEC PRE NOVÚ SESSION:** `uptm-runner` PR #22 je otvorená a čaká na
> founderov merge. Bez nej **Evidence Rule A nie je na `main`**, hoci PR #21 je
> na GitHube označená ako merged. Detail nižšie v „Riziká".

### Dokončené

- **UPTM-006 / PS-R1, PS-R2** — enforcement cesty pre strážcu APS-001
  (`runner/enforcement.py`). Zmergované (PR #19 → #18 → `main`).
- **`NON_PRINCIPLE_GUARDS`** — nové stojace pravidlo: každá skupina ciest mimo
  `ENFORCED` princípov musí byť deklarovaná s napísaným dôvodom, inak padne
  coverage test. Zmergované.
- **`REDUNDANT_GUARDS`** — zápis vyvrátenej predpovede o PS-R1 (drží ho
  required-field list *aj* binding validátor, každý samostatne). Zmergované.
- **DEC-UPTM-APS** — `docs/decisions.md`: APS-001 je *guard*, nie princíp.
  Zmergované (PR #20 → `main` = `7aa25b9`).
- **Evidence Rule A** (`runner/provenance.py`, `docs/evidence-rule-a.md`,
  `tests/test_evidence_rule_a.py`, `.github/workflows/pytest.yml`,
  DEC-UPTM-RULEA, oprava `governance-map.md`) — hotové, otestované, CI zelená.
  **ALE NIE JE NA `main`** — viď Riziká.

### Rozpracované / Pending

- **PR #22** `dec-uptm-aps → main` — draft, zelená, clean. Merge je founderov
  akt. Toto je jediná otvorená PR.
- **Otvorené founderove rozhodnutia:**
  - `evidence_expiry_days` — nenastavené, drží **P12 na `PARTIAL`**.
    `expires_at` je `null` a manifest čestne píše prečo.
  - Štyri zvyšné governance otázky z `docs/architecture/governance-map.md`
    (otázka 4 = Rule A je odteraz zodpovedaná): či wave gate musí spĺňať
    kapitálovú ústavu; ktorého repa verdikt vyhráva pri nezhode; ako súvisí
    €700 a €750; ktorý wave slovník je kanonický.
- **W8** — špecifikácia prijatá s dodatkami P2/P13 (`onlinovosk-bit-uptm#28`,
  zmergované). **Implementácia naďalej odmietnutá**: P2 nie je nikde vynútené,
  takže harness postavený teraz opisuje cestu, ktorú reálny beh neprejde.

### Riziká — prečítaj pred akoukoľvek prácou

**„Merged" sa nerovná „na `main`".** PR #21 (Rule A) bola vetvená z
`dec-uptm-aps`. O 07:37:35Z sa `dec-uptm-aps` zmergovala do `main` (#20),
a o 07:37:55Z sa #21 zmergovala do `dec-uptm-aps` — teda do vetvy, ktorú už
nikto nemergoval. GitHub ukazuje #21 ako merged; `main` z nej nemá nič:

```
git merge-base --is-ancestor 193f17d origin/main   -> NIE
git ls-tree -r main | grep provenance.py           -> nič
```

Stranded commity: `ff9d261`, `193f17d`, `5967fec`. PR #22 ich dostane na `main`.
Stackovanie vetiev bola moja voľba, takže aj táto medzera. **Pri stackovaných PR
vždy over `merge-base --is-ancestor`, nie farbu na GitHube.**

**Paralelné session bez zdieľaného nároku na prácu** (`DEC-UPTM-DUP`) sa dnes
prejavili už tretíkrát — raz ako duplicita (UPTM-003 postavené dvakrát), raz ako
opomenutie (APS-001 strážca hodinu bez cesty). Problém je stále otvorený.

**Tri moje tvrdenia za dva dni vyvrátilo meranie:** P10-R2 conditional guard,
PS-R1 predpoveď, a „manifest si vie dosvedčiť vlastnú čerstvosť" v governance
mape. Vzorec je zakaždým rovnaký — vierohodná úvaha, vyslovená s istotou, nikdy
nespustená proti tomu, čo opisovala. Všetky tri zostávajú zapísané v kóde a
v mape, nie potichu opravené.

### Kľúčové súbory zmenené

- `runner/provenance.py`: nový — `read_head()` číta evaluated head z repa,
  `--expect-head` je krížová kontrola, nie zdroj; špinavý strom / žiadne repo =
  `null` s uvedeným dôvodom, nikdy vierohodný default.
- `runner/enforcement.py`: `manifest()` berie `HeadProvenance` namiesto
  `commit`; pribudli `NON_PRINCIPLE_GUARDS`, `REDUNDANT_GUARDS`, PS-R1, PS-R2.
- `runner/cli.py`: `--commit` odstránený, `--expect-head` pridaný; `ok` je
  `false` pri akomkoľvek probléme s provenienciou.
- `.github/workflows/pytest.yml`: krok enforcement-evidence už neodovzdáva
  commit — CI nemôže artefaktu povedať, čo dokazuje.
- `docs/evidence-rule-a.md`: nový — ktorá polovica Rule A platí a prečo tá druhá
  nie (podmienečne, s testom ako poistkou). Vrátane nameraného faktu, že na PR
  builde je `evaluated_head` pominuteľný merge commit.
- `docs/architecture/governance-map.md`: otázka 4 zodpovedaná; presilené tvrdenie
  opravené **na mieste, s pôvodným znením ponechaným viditeľne**.
- `docs/decisions.md`: DEC-UPTM-APS, DEC-UPTM-RULEA.
- `tests/test_evidence_rule_a.py`: nový, 9 testov.

### Stav systému (zmerané, nie predpokladané)

```
uptm-runner main = 7aa25b9      343 passed (po merge #22)
enforcement-evidence  ok: true, tree_clean: true
                      routes_reaching_pass: [], unproven_claims: []
P8  ENFORCED    P10 ENFORCED    P12 PARTIAL (chýba evidence_expiry_days)
LIVE_TRADING = false            CONSTITUTION-CAPITAL.md v1.0 LOCKED
19 enforcement routes, APS-001 deklarovaný v NON_PRINCIPLE_GUARDS
```

### Ďalší krok

Zmergovať **PR #22** (`dec-uptm-aps → main`), aby Evidence Rule A reálne
pristála. Potom: founder nastaví `evidence_expiry_days` → P12 sa dá posunúť na
`ENFORCED` rovnakou cestou ako P8 a P10 (preregistrované kritériá, potom
meranie). Žiadna implementácia bez explicitného GO.
