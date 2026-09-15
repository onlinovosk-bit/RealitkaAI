# W3 · ZÁVEREČNÝ REPORT — beh `2026-09-14-top-tier-gate`

**Okno:** 2026-09-15 12:30 → 16:00 (+02:00) · **BASE_SHA:** `c8d24b407c6ea1fa4cc2de98da534713317901c1`
**Rozsah:** `implementation` · **Model:** `claude-opus-5` · **Provider:** subscription-only
**Stav behu:** všetky tri lane dobehli pred stropom svojej vlny.

---

## 1. Výsledok podľa lane

| LANE | VETVA | PR | JUDGE VERDIKT | EXIT | SÚBORY MIMO SCOPE | STAV |
|---|---|---|---|---|---|---|
| **A** gate | `chore/w0-engineering-gate` | [#554](https://github.com/onlinovosk-bit/RealitkaAI/pull/554) | **ACCEPT** (4/4 PASS, risk=low) | 0 | 0 | **ARTEFAKT** |
| **C** business | `fix/w2-matching-guards` | [#553](https://github.com/onlinovosk-bit/RealitkaAI/pull/553) | **PASS** (3/3, bez Judge — zámerne) | 0 | 0 | **ARTEFAKT** |
| **B** bus | `feat/w1-bus-envelope-v1` | [#555](https://github.com/onlinovosk-bit/RealitkaAI/pull/555) (base `chore/w0-engineering-gate`) | **ACCEPT** (5/5 PASS, risk=medium) | 0 | 0 | **ARTEFAKT** |

Run IDs: `RUN-20260915112141-TASK-0100` (A) · `RUN-20260915125804-TASK-0101` (B)

**Žiadny `BLOCKED`, žiadny `REJECT`, žiadny `HUMAN`, žiadny súbor mimo scope.**

### Brána W2 — „3 real handoffs pass end-to-end"

Pravidlo z Master Contractu, WAVE 1. Tri handoffy tohto behu:

```
O0 → A    TASK-0100 → RESULT → VERIFIED (Judge ACCEPT)     ✅
A  → B    TASK-0101 → RESULT → VERIFIED (Judge ACCEPT)     ✅
O0 → C    TASK-0102 → RESULT → PASS (vlastné kontroly)     ✅
```

**Brána splnená.**

---

## 2. Kontrolný dotaz — čo sa v produkcii pohlo

Manifest hovorí: *„Ani jedno z tých čísel sa touto reťazou nemá pohnúť."*
Spustené 15. 9. o 15:0x:

| ukazovateľ | pred behom (14./15. 9.) | po behu | pohlo sa? |
|---|---|---|---|
| `posledny_webhook` | 2026-09-11 | **2026-09-15** | áno |
| `neprecitane` | 2 | **1** | áno |
| `odpovedane` | 0 | 0 | nie |
| `zhody` | 0 | 0 | nie |
| `intent` | 3 | 3 | nie |
| `leads` | 506 | **508** | áno |

### Tri pohyby — overená atribúcia, nie domnienka

Nestačí povedať „to nebolo od nás". Overil som, odkiaľ tie riadky sú:

```sql
select id, source, created_at from leads where created_at >= '2026-09-14';
-- 1178acea…  portal:Reality.sk  2026-09-15 08:55:25 UTC
-- 1c3b7ecb…  portal:Bazoš.sk    2026-09-15 07:20:13 UTC
```

Oba nové leady prišli **08:55 a 07:20 UTC**, čiže **10:55 a 09:20 CEST** —
teda **pred štartom behu o 12:30**. S behom nemajú nič spoločné.

`neprecitane` 2 → 1 je cron `notification-digest` o 07:15 UTC, ktorý beží denne
od opravy `FOUNDER_EMAILS`. Tiež pred štartom.

**Záver: beh nepohol ani jedným produkčným číslom.** Scope držal.

### Vedľajší nález, ktorý stojí za pozornosť

Zdroje nových leadov sú `portal:Reality.sk` a `portal:Bazoš.sk` — nie
`realvia_import_smolko`. Čiže Lead Factory **prijíma živé leady z portálov**,
nielen historický import. To je prvý znak, že SIGNAL krok loopu funguje aj mimo
Realvie. Nie je to výsledok tohto behu, ale je to informácia, ktorú by inak
nikto nezachytil.

---

## 3. Scorecard — čo sa merateľne pohlo

**Zásadné rozlíšenie, bez ktorého by bol tento report klamlivý:**

> Žiadny PR nie je zmergovaný. **Na `main` sa nezmenilo nič.**
> Scorecard `main` je dnes večer identický s ranným.

Preto sú nižšie dva stĺpce. Prvý je stav, ktorý si môžeš overiť dnes na `main`.
Druhý je to, čo existuje na vetvách a čaká na tvoj merge.

| # | vrstva | na `main` dnes | na vetvách po merge | dôkaz |
|---|---|---|---|---|
| G1 | Intelligence | RED | RED | bez zmeny |
| G2 | Agents | RED | RED | bez zmeny |
| G3 | **Bus** | **AMBER** | **GREEN-kandidát** | obálka 10 polí doplnená · `bus-validate.mjs --ci` exit 0 · ledger má reálne riadky · 3 handoffy prešli |
| G4 | Orchestrator | RED | RED | lifecycle v schéme má 9 stavov, ale stále sa reálne používajú 2 |
| G5 | MCP / Tools | AMBER | AMBER | bez zmeny |
| G6 | Memory | AMBER | AMBER | bez zmeny |
| G7 | Autonomy | RED | RED | `approval_required` teraz existuje ako pole, ale nič ho nevynucuje |
| G8 | Eval | AMBER | AMBER | bez zmeny |
| G9 | **Governance** | AMBER | **AMBER+** | prompt-injection testy **0 → 1**, guard zapojený na 1 mieste |
| G10 | Control Plane | RED | RED | bez zmeny |

**Skóre na `main`: 0 GREEN · 5 AMBER · 5 RED — nezmenené.**

### A ešte jedna vrstva, ktorá v scorecarde nie je

Princíp č. 9 Master Contractu — *„No DONE based on logs alone"* — bol dnes
ráno **nevynútený**. Teraz je vynútený strojom:

```
nevynútený → Judge s exit kódmi 0/1/2/3 + riadok v ledgeri
```

Dôkaz, že to nie je dekorácia: Judge dnes dvakrát vydal `ACCEPT` **až po tom**,
čo sám spustil 4 a 5 príkazov a porovnal ich exit kódy. Ani jeden verdikt
nevznikol z úsudku agenta.

---

## 4. Čo konkrétne pribudlo

### Lane A — `chore/w0-engineering-gate`
```
apps/crm/scripts/judge.mjs                  brána, 4 exit kódy, zápis do ledgeru
apps/crm/scripts/typecheck-baseline.mjs     ratchet, baseline 69 (potvrdené)
apps/crm/scripts/typecheck-baseline.json    69
.ai/bus/tasks/TASK-TEMPLATE.md              Task Contract v2 (acceptance + budget)
.ai/bus/tasks/TASK-0100.md                  prvý reálny kontrakt
apps/crm/package.json                       skripty judge + typecheck, js-yaml explicitne
.github/workflows/saas-grade-pipeline.yml   krok Typecheck (baseline gate)
```

### Lane C — `fix/w2-matching-guards` · PR #553
```
apps/crm/src/lib/matching.ts                 guardy: prázdny typ/izby/výbava neskórujú
apps/crm/src/lib/__tests__/matching.test.ts  testy na každý guard
docs/reports/2026-09-15-business-loop-baseline.md
```

Tri opravené chyby: `propertyType` (+25 za dve prázdne), `rooms` (+20 za dve
prázdne), `features` (`"x".includes("")` je v JS `true` → až +15 za prázdny
reťazec vo výbave). Pribudlo `comparedCriteria`.

**Gold test Poprad zostal nad 90.** To je dobrá správa: tých 90+ bodov bolo
zarobených na skutočne vyplnených hodnotách, nie na porovnávaní prázdnych.
Guardy neubrali nič zaslúžené.

### Lane B — `feat/w1-bus-envelope-v1`
```
.ai/bus/message.schema.md                    obálka +10 polí, lifecycle 9 stavov
.ai/bus/AGENT_PROTOCOL.md
.ai/bus/tasks/TASK-0101.md
apps/crm/scripts/bus-validate.mjs            ratchet podľa vzoru check-api-contract
apps/crm/scripts/bus-validate-baseline.json
apps/crm/scripts/ledger-report.mjs
apps/crm/src/lib/ai/prompt-guard.ts          sanitizeFreeText
apps/crm/src/lib/ai/rescue-message.ts        guard zapojený na leadName + lastNote
apps/crm/src/lib/ai/__tests__/prompt-guard.test.ts
```

**Amendment write-setu (limit 1, využitý):** `rescue-message.ts` a
`prompt-guard.ts` neboli v pôvodnom manifeste. Dôvod: guard, ktorý nikto nevolá,
je infraštruktúra bez zákazníka. Disjointnosť s lane A a C overená.

---

## 5. Známe obmedzenia — otvorene

| obmedzenie | dôsledok |
|---|---|
| `cost_usd` v ledgeri je **0** | runner ho neodovzdáva. Cost Governor zatiaľ nemá čo strážiť. Toto je položka 4 z plánu V1 Minimum. |
| `production_effect` je **null** vo všetkých riadkoch | meriame kód, nie produkt. Položka 5. |
| `ci_status` nebol overený | billing je odomknutý, ale žiadna lane nečakala na GitHub Actions — Judge bežal lokálne. Overí sa až pri merge PR. |
| `ruflo swarm_init` | nepoužitý; beh šiel cez worktree, ako povoľuje manifest |
| lifecycle 9 stavov | v schéme je, vo validátore je, ale reálne sa stále používajú 2 |

---

## 6. Čo teraz musí urobiť founder

Beh sa skončil tam, kde má — **pri tvojom rozhodnutí**. Agent nemerguje.

1. **Skontroluj a zmerguj tri PR** v tomto poradí, lebo B stojí na A:
   ```
   1. chore/w0-engineering-gate      (lane A · #554)
   2. feat/w1-bus-envelope-v1        (lane B · #555, base = A)
   3. fix/w2-matching-guards         (lane C · #553, base = main)
   ```
   Až po merge A prestane byť PR lane B „stacked" a bude čitateľný.

2. **Over, že CI po merge naozaj zbehne.** Billing je odomknutý od včera,
   ale ani jeden job sa od vtedy nespustil. Krok `Typecheck (baseline gate)`
   musí v Actions svietiť zeleno — inak je gate zapojený len lokálne.

3. **Doriešiť staré:** `#548`, `#549`, `#550` a
   `feat/hladame-verejne-dopyty`, `fix/inbound-lead-no-invented-criteria`.

4. **Rozhodnúť o stealth-recruiter súboroch.** CI guard má dieru v regexe
   (`recruiter` chýba vo vzore pre `apps/crm/src`) a 23 z 69 typových chýb je
   práve tam. Odstránením padne baseline na 46 bez jedinej opravy kódu.

5. **Zvážiť `ruflo@3.38.12`.** `latest` aj `alpha` dnes ukazujú na `3.41.4` —
   `latest` nie je stabilný release, čo je pravdepodobná príčina dvoch zlyhaní
   `swarm_init`.

### Upratanie worktrees — až po merge

```powershell
cd C:\RealitkaAI
git worktree remove C:\RealitkaAI-run\lane-A
git worktree remove C:\RealitkaAI-run\lane-B
git worktree remove C:\RealitkaAI-run\lane-C
git worktree prune
```

`git worktree remove` odmietne zmazať strom s nezacommitovanými zmenami.
To je správne — neobchádzaj to cez `--force`.

---

## 7. Úprimný záver

Dnešný beh vyrobil **tri PR**. To je presne tá metrika, o ktorej Master Contract
hovorí, že sa na ňu **nemá** optimalizovať — a mal by pravdu, keby to bolo všetko.

Rozdiel oproti predchádzajúcim 88 PR za 30 dní je v tom, čo je v nich:
brána, ktorá vie povedať `BLOCKED`, keď sa kontrola nedá spustiť; ratchet, ktorý
zčervenie pri 70. typovej chybe; validátor, ktorý odmietne task bez acceptance;
a ledger, ktorý si pamätá, čo sa naozaj spustilo.

Ani jedna z týchto vecí sama o sebe nepredá byt. Ale od dnešného merge už žiadny
agent nemôže povedať „hotovo" bez toho, aby to niekto — alebo skôr niečo —
overilo príkazom. To je ten rozdiel medzi 88 PR a 88 overenými PR.

**Business loop je stále červený od tretieho kroku.** Ten sa dnes neriešil
zámerne a je to ďalšia úloha, nie táto.
