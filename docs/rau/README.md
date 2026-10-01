---
title: "RAU — Revolis Agentic University (README pre foundera)"
project: RAU
type: guide
status: foundation-v1.0
created: 2026-09-30
tags: [rau, prompts, routing, founder, l99]
related:
  - "[[RAU-v1.0]]"
  - "[[revolis-constitution-v2]]"
  - "[[agentic-system-blueprint-v1.0]]"
---

# RAU — Revolis Agentic University

**V jednej vete:** ty povieš, čo chceš; RAU zistí, o ktorý projekt ide, kam smie AI siahnuť, aký
postup a ktoré prompty treba — a vráti ti **jedno rozhodnutie** namiesto desiatich otázok.

**Čo to nie je:** nový agent, nový runtime ani dashboard — a **router nie je bezpečnostná kontrola**:
je to triedič kľúčovými slovami (namerané čísla a slabiny: [§Dôkaz](RAU-v1.0.md#11-dôkaz)). Je to
**skill + register projektov + deterministický router + knižnica 24 promptov** nad tým, čo už v repe
existuje (Ústava v2, task-loop, kontrolor, Runner kontrakt, control-contract). Špecifikácia:
[RAU-v1.0](RAU-v1.0.md).

## Čo si pamätať (verdikt po pokuse zabiť plán)

1. **Bottleneck nie sú prompty.** Vlastné meranie repa (26. 9.): agentná práca je 3,5 % cyklu PR;
   zvyšok (~74 %, odhad rozdielom mediánov) je čakanie na review, GO bránu a človeka; 27 % behov CI je
   červených. RAU preto šetrí **tvoje** čakanie: menej, lepšie pripravených rozhodnutí — či to naozaj
   funguje, zatiaľ **nemeriame**.
2. **Najrýchlejšia cesta k príjmu nie je RAU.** Je to krok C v `memory/open-tasks.md`
   (vytvoriť Stripe ceny; `/upgrade` zatiaľ nevie predať). Stav k 29. 9. — dnešný neoverený.
3. **Čo je naozaj postavené:** skill, register, router, prompty, testy. **Čo nie je** a je v
   Strategic Backlogu s podmienkou odomknutia: Control Center UI, Model Router, Cost Governor,
   Agent Factory, DB pamäť, autonómny režim.
4. **„Naživo" znamená:** po tvojom `merguj N` sa skill `rau` načíta v každej novej session. Pred mergom sa
   nič nenasadilo ani nezmenilo v PROD. Po merge Vercel zostaví `apps/crm` (v diffe sú testy, nie kód
   aplikácie) — build prebehne, správanie aplikácie sa nemení.

## Ako to používaš

Ty robíš iba toto:

| Ty | Čo to znamená |
|---|---|
| **VISION** | Kam ideme. |
| **PRIORITY** | Čo je teraz najdôležitejšie. |
| **DECISION** | Ktorú cestu volíme (z možností, ktoré ti AI pripraví). |
| **APPROVAL** | Slovo „GO" / „merguj N" — vždy pre konkrétnu vec. |
| **ASK** | AI ti povie: „toto nemôžem bezpečne rozhodnúť za teba." |
| **OBSERVE** | Pozrieš výsledok, dôkaz a odporúčanie. |

Zadanie napíšeš bežnou vetou. Rector (skill `rau`) spustí router a vráti napr.:

```
RAU ROUTE — BUILD · Revolis.AI · MODE STANDARD
BRÁNA: GO_REQUIRED
  • GO_REQUIRED: nová funkcia: najprv schválený Execution Contract (P03) a Ústava v2
REŤAZEC PROMPTOV: P00 CONTEXT-PACK → P01 REALITY-AUDIT → P02 ULTRATHINK → P03 EXECUTION-CONTRACT
                  → P10 CODING-LOOP → P11 QA-VERIFY → P15 CI-GATE → P22 MEMORY-LEARN → P23 NEXT-WAVE
NEZNÁME: rozpočet: NEMERANÉ (ledger nenesie model_calls ani tokeny)
```

(Skrátený výstup pre „postav v Revolise pripomienky pre follow-up leadov"; prvé dva riadky hlási test
z reálneho behu, zvyšok je zhustený.)

Ručne (krátke zadanie): `node scripts/ops/rau-route.mjs "postav v Revolise pripomienky pre follow-up leadov"`.
Text od tretích strán (mail, issue) vždy cez `--stdin` a heredoc v jednoduchých úvodzovkách — nikdy do
úvodzoviek na príkazovom riadku (shell by vykonal `$(…)`).

### Štyri brány

- **AUTO-SAFE** — čítanie, lokálny kód na vetve, testy. AI pokračuje.
- **GO_REQUIRED** — AI pripraví a **zastaví**. Merge, PROD, tajomstvá, odoslanie správy, publikácia,
  ceny, nová funkcia.
- **STOP** — rozpoznané: osobné údaje, vlastníci a list vlastníctva, projekt v inom repozitári. (Že zdroj
  dát chýba v sourcing mape, router neoveruje — to robí prompt P06.)
- **ASK** — router nevie (projekt alebo druh práce neznámy). Dostaneš jednu otázku s odporúčaním.

Brána je **podlaha pre rozpoznané výrazy**: AI ju môže len zvýšiť. Router je kľúčovými slovami, takže
metafora alebo dvojitá negácia môže prejsť — preto zadanie číta aj Rector a skutočné vynútenie ostáva na
úrovni akcie (control-contract, CI, tvoj merge). Poradenská otázka so spomenutým rizikom sa **nezahodí**:
dostaneš ASK „je to len otázka?" (odpovedz „len analýza").

## Poradie promptov (rebrík)

THINK → DESIGN → BUILD → VERIFY → ATTACK → RELEASE → OBSERVE → LEARN. Router z rebríka vyberie
**len to, čo zadanie potrebuje**; ostatné preskočí (minimum práce pre rovnaký overený výsledok).
Pri kóde sa používa existujúci Runner kontrakt (`docs/prompts/runner/`) — neduplikuje sa.

| ID | Prompt | Fáza | Po ľudsky: čo to je | Nepoužívaj, keď |
|---|---|---|---|---|
| [P00](prompts/P00-context-pack.md) | CONTEXT-PACK | THINK | „Zadávací list" pre AI. Skôr než začne pracovať, musí napísať, čo vie, čo nevie a čoho sa nesmie dotknúť. | ide o preklep alebo zmenu jedného riadka — vtedy stačí jedna veta kontextu. |
| [P01](prompts/P01-reality-audit.md) | REALITY-AUDIT | THINK | Kontrola, čo v systéme **naozaj existuje**, nie čo hovorí dokumentácia alebo predchádzajúci agent. | ide o opravu s jasným, už overeným dôkazom. |
| [P02](prompts/P02-ultrathink.md) | ULTRATHINK | THINK | AI sa najprv pokúsi dokázať, že tvoj nápad zlyhá. Až potom hľadá najrýchlejšiu cestu k peniazom. | chceš, aby AI niečo postavila — ULTRATHINK nikdy nič nevykonáva. |
| [P03](prompts/P03-execution-contract.md) | EXECUTION-CONTRACT | DESIGN | Jedna strana, ktorú schvaľuješ ty. Hovorí presne: čo sa urobí, čo sa **neurobí**, ako sa pozná „hotovo", koľko to smie stáť a kedy sa AI musí zastaviť. | ešte nevieš, či to chceš — najprv P02. |
| [P04](prompts/P04-product-contract.md) | PRODUCT-CONTRACT | DESIGN | Odpoveď na otázku „čo presne budujeme, pre koho a čo z toho má zákazník". | ide o opravu chyby bez zmeny správania produktu. |
| [P05](prompts/P05-architecture-contract.md) | ARCHITECTURE-CONTRACT | DESIGN | Technický plán: z akých častí sa to skladá, kadiaľ tečú dáta, čo smie AI a čo smie len človek. | zmena je lokálna a nedotýka sa rozhraní. |
| [P06](prompts/P06-data-event-contract.md) | DATA-EVENT-CONTRACT | DESIGN | Kontrola, že každý „event" a každý údaj má pôvod, autora, čitateľa a dôkaz, že naozaj vznikne. | zmena nečíta ani nezapisuje žiadne dáta ani eventy. |
| [P07](prompts/P07-workflow-design.md) | WORKFLOW-DESIGN | DESIGN | Návrh autonómnej „slučky", ktorá robí užitočnú prácu sama: spustí sa, zistí, rozhodne, urobí, overí, odovzdá človeku a poučí sa. | ide o jednorazovú úlohu, nie o opakovaný proces. |
| [P08](prompts/P08-agent-spec.md) | AGENT-SPEC | DESIGN | „Pracovná zmluva" pre jedného AI agenta: čo je jeho misia, čo smie, čo **nesmie** a kedy musí zavolať človeka. | úlohu zvládne skript — agent nie je potrebný. |
| [P09](prompts/P09-implementation-plan.md) | IMPLEMENTATION-PLAN | BUILD | Rozpis práce: ktoré súbory, v akom poradí, čo sa dá robiť naraz a ako sa to vráti späť. | ide o jednu malú zmenu v jednom súbore. |
| [P10](prompts/P10-coding-loop.md) | CODING-LOOP | BUILD | Pracovný postup kódovacieho agenta: najprv čítaj a pochop, potom plánuj, píš, testuj, skontroluj sám seba a odovzdaj s dôkazom. | kontrakt nie je schválený — vtedy agent len plánuje. |
| [P11](prompts/P11-qa-verify.md) | QA-VERIFY | VERIFY | Druhý, nezávislý pár očí. QA agent sa snaží **dokázať, že tvrdenie kódovacieho agenta je pravdivé**, nie len ho prečítať. | overovateľom by bol ten istý agent, ktorý kód napísal. |
| [P12](prompts/P12-evals.md) | EVALS | VERIFY | Meranie, **ako dobre** to funguje — nielen či to funguje. | feature je čisto mechanická a stačí ju pokryť testom. |
| [P13](prompts/P13-red-team.md) | RED-TEAM | ATTACK | AI s opačnou mentalitou: nesnaží sa overiť, že to funguje, ale **rozbiť to**. | ešte nie je čo napadnúť (nie je implementácia). |
| [P14](prompts/P14-security-rls.md) | SECURITY-RLS | ATTACK | Samostatná bezpečnostná kontrola: kto sa smie prihlásiť, čo smie vidieť a či jedna realitná kancelária nevidí dáta druhej. | zmena sa nedotýka API, dát, autentifikácie ani tajomstiev. |
| [P15](prompts/P15-ci-gate.md) | CI-GATE | RELEASE | Odpoveď na „môže sa to zmergovať?" — s dôkazom, nie dojmom. | PR ešte nemá posledný commit. |
| [P16](prompts/P16-staging-gate.md) | STAGING-GATE | RELEASE | Skúška v prostredí, ktoré sa podobá produkcii, ešte pred ostrým nasadením. | ide o zmenu, ktorá sa nedá na stagingu odlíšiť (dokumentácia). |
| [P17](prompts/P17-production-gate.md) | PRODUCTION-GATE | RELEASE | Posledný stop pred ostrým nasadením. AI povie **READY / NOT READY / BLOCKED** a presne prečo. | nejde o PROD — pre test a vývoj brána netreba. |
| [P18](prompts/P18-deploy.md) | DEPLOY | RELEASE | Vlastné nasadenie: commit, PR, merge, deploy — v rámci povolení. | nemáš GO, alebo GO bolo pre inú zmenu. |
| [P19](prompts/P19-production-verify.md) | PRODUCTION-VERIFY | RELEASE | Kontrola po nasadení: beží to naozaj tak, ako má, pre skutočného používateľa? | nič sa nenasadilo. |
| [P20](prompts/P20-observe.md) | OBSERVE | OBSERVE | Určenie, čo sa bude sledovať, aké hodnoty sú „normálne" a kedy sa má ozvať alarm. | ide o jednorazovú zmenu bez trvalého správania. |
| [P21](prompts/P21-recovery-rollback.md) | RECOVERY-ROLLBACK | OBSERVE | Plán „čo robiť, keď to v ostrom zlyhá": zastav, zaraď, vráť späť alebo oprav, over a napíš správu. | nič nezlyhalo. |
| [P22](prompts/P22-memory-learn.md) | MEMORY-LEARN | LEARN | Zápis toho, čo sme sa naučili, aby to ďalšia session vedela bez toho, aby to zisťovala znova. | nič sa nerozhodlo ani nenaučilo. |
| [P23](prompts/P23-next-wave.md) | NEXT-WAVE | LEARN | Na konci každej úlohy jedna odpoveď: „čo je ďalšia najhodnotnejšia vec?" — s jasnou bránou. | founder výslovne povedal, že dnes končíš. |

**Režimy:** FAST (žiadny rizikový znak) · STANDARD (aspoň jeden) · HARDENED (vysoké riziko,
overovateľ je iný agent, pridáva Red Team a Security) · AUTONOMOUS (nikdy sa nevyberá sám;
`autonomous_allowlist` je prázdny, rozšíriť ho môžeš len ty cez PR).

## Projekty (Campus registry)

Register je v `registry.json`. Zadanie sa vždy týka **jedného** projektu. 7 tvojich + RAU (00):
Revolis.AI, UPTM (iný repozitár, HARDENED), Mia Vellar, konkurent Nájomnej agentúry, konkurent
Proon, YouTube detské riekanky, YouTube dážď/ambient. Pri projektoch bez kódu v repe sú polia
`null` a otvorené neznáme — **nič sa nevymýšľa**.

## Čo potrebujem od teba (jedno rozhodnutie, s odporúčaním)

Pozri záver [RAU-v1.0](RAU-v1.0.md#rozhodnutia-foundera).
