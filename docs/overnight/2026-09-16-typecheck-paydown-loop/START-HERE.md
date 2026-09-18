# REVOLIS — Ruflo Swarm Runner · TYPECHECK PAYDOWN LOOP
## Balík `2026-09-16-typecheck-paydown-loop`

Pripravené 15. 9. 2026. Interný pracovný balík pre foundera a orchestrátora.

**Stav: `PREPARED`.** Spúšťa sa až po vyplnení `launch-record.md` na `LAUNCH_AUTHORIZED`.
**Rozsah: `implementation`.**

**Predpoklad, bez ktorého sa balík nesmie spustiť:**
PR **#554** (`chore/w0-engineering-gate`) musí byť **zmergovaný do `main`**.
Celý tento beh stojí na `judge.mjs` a `typecheck-baseline.mjs`. Bez nich nemá
slučka bránu ani merač.

---

## 1. Čo tento beh robí

Splatí typový dlh, ktorý bol 10. 9. zmeraný na **69 chýb** a ktorý je dnes skrytý
za `next.config.js: typescript.ignoreBuildErrors: true`.

Nie jednou veľkou vlnou. **Slučkou**, kde jedna iterácia = jeden súbor = jeden PR.

```
W0  baseline a mapa území
      ↓
W1  seed — front práce z reálneho výstupu tsc
      ↓
LOOP ──→ vyber voľné územie ──→ oprav ──→ Judge ──→ PR ──→ zapíš zámok
  ↑                                                            │
  └────────────────────────────────────────────────────────────┘
      ↓  (stop podmienka)
W2  záver — report, zníženie baseline, jedna otázka pre foundera
```

---

## 2. Prečo sa vlny nemôžu skrížiť — tri mechanizmy

Toto je jadro celého návrhu. Nie je to sľub, sú to tri kontroly.

### 2.1 Územie = súbor, a územia sú disjunktné z definície

Každá typová chyba patrí **práve jednému súboru**. Front práce je preto
rozdelený podľa súborov a dve iterácie sa nikdy nedotknú toho istého súboru.

Disjunktnosť tu nie je niečo, čo treba strážiť — vyplýva z toho, ako sa front
vyrobil. Nemôžeš mať dve úlohy na ten istý súbor, lebo front je podľa súborov.

**Výnimka, ktorá sa musí deklarovať:** dve úlohy majú územie väčšie než jeden
súbor, lebo oprava vyžaduje aj zmenu typu inde. Sú v `queue.json` označené
`territory` so zoznamom. Aj tak sú tie zoznamy navzájom disjunktné.

### 2.2 Tabuľka zámkov — otvorený PR drží svoje územie

```
.ai/bus/state/typecheck-loop-locks.json
```

Každá iterácia pred štartom zapíše zámok:

```json
{ "territory": ["src/lib/demo/synthetic-leads.ts"],
  "branch": "fix/tc-synthetic-leads",
  "pr": 561, "status": "OPEN", "locked_at": "..." }
```

Slučka **nikdy nevyberie územie, ktoré má zámok v stave `OPEN`**. Zámok sa uvoľní
až keď founder PR zmerguje alebo zavrie. Vďaka tomu nezmergované PR nikdy
nekolidujú — ani medzi sebou, ani so slučkou.

### 2.3 `typecheck-baseline.json` sa počas slučky **nemení**

Toto je najtichšia pasca celého návrhu a preto je tu explicitne.

Keby každá iterácia znížila baseline, každý PR by menil **ten istý súbor** —
a všetky by si navzájom konfliktovali. Územia by boli disjunktné, ale baseline
by ich zosobášil.

Preto:

> **Žiadna iterácia slučky nespúšťa `--write-baseline`.**
> Ratchet prechádza aj pri `count < baseline` — vypíše len „Ubudlo N".
> Baseline sa zníži **raz**, vo W2, po zmergovaní dávky.

---

## 3. Front práce — zmeraný, nie odhadnutý

`npx tsc --noEmit` na `origin/main @ c8d24b40`, 15. 9. 2026: **69 chýb v 21 súboroch.**

| tier | chýb | súborov | do slučky? |
|---|---:|---:|---|
| **T1** testy | 30 | 12 | áno — prvé, najnižšie riziko |
| **T2** skripty | 10 | 1 | áno |
| **T3** produkčný `src` | 4 | 4 | áno — posledné |
| **DEFERRED** | 1 | 1 | **nie** — `api/cron/notification-digest/route.ts`, 5 otvorených notification vetiev |
| **FROZEN** | 24 | 3 | **nie** — stealth-recruiter, čaká na rozhodnutie foundera |

```
loopovateľné:            44 chýb v 17 súboroch
cieľový baseline po behu: 25
```

**Slučka nekončí na nule a je to zámer.** Končí tým, že founderovi zostane
**jedna otázka** namiesto kopy: *odstrániť stealth-recruiter súbory, alebo nie?*
Kladná odpoveď zoberie ďalších 24 chýb bez jedinej opravy kódu a otvorí cestu
k `ignoreBuildErrors: false`.

Celý front s počtami a poradím je v `queue.json`.

---

## 4. Anti-hromadenie — najdôležitejší limit tohto balíka

```
MAX_OPEN_PRS = 3
```

Keď má slučka **tri otvorené nezmergované PR**, **zastaví sa** a čaká.
Nepokračuje ďalšou iteráciou, nezakladá štvrtý.

Dôvod je zmeraný: za 30 dní do 14. 9. sa do `main` zmergovalo **88 PR** a za tie
isté dni pribudli v produkcii **3 aktivity**. Slučka, ktorá vyrába PR rýchlejšie,
než ich niekto merguje, ten pomer len zhoršuje. Front práce nie je úzke miesto —
úzke miesto je overenie a merge.

Tri otvorené PR sú strop, nie cieľ. Ak ti to príde málo, zdvihni to v launch
recorde vedome — nie potichu počas behu.

---

## 5. Jedna iterácia slučky — presný postup

```
1. načítaj queue.json a typecheck-loop-locks.json
2. ak OPEN zámkov >= MAX_OPEN_PRS      → STOP, dôvod "max_open_prs"
3. ak front prázdny                    → STOP, dôvod "queue_empty"
4. ak rozpočet/čas vyčerpaný           → STOP, dôvod "budget" / "deadline"
5. vyber prvú úlohu bez OPEN zámku
6. git worktree z origin/main, vetva fix/tc-<slug>
7. zapíš zámok status=PENDING
8. oprav typové chyby IBA v súboroch svojho územia
9. Task Contract .ai/bus/tasks/TASK-TC-<slug>.md, risk: low
10. node apps/crm/scripts/judge.mjs --task <...>
11. ACCEPT  → commit, push, PR, zámok status=OPEN, ďalšia iterácia
    REJECT  → revert vetvu, zámok status=FAILED, zapíš dôvod, ďalšia iterácia
    BLOCKED → STOP celej slučky, dôvod zapíš
12. 2 po sebe idúce non-ACCEPT → STOP, dôvod "two_consecutive_failures"
```

**Model je jeden (`claude-opus-5`), eskalácia je vypnutá.** Worker, ktorý dvakrát
neuspeje, nesmie skúšať iný model — zapíše `BLOCKED` a končí.

### Acceptance každej iterácie

```yaml
acceptance:
  - id: T1
    desc: "typových chýb ubudlo, nepribudlo"
    cmd: "node apps/crm/scripts/typecheck-baseline.mjs"
    expect: exit_code == 0
  - id: T2
    desc: "testy dotknutej oblasti prechádzajú"
    cmd: "npm --prefix apps/crm test -- <oblasť>"
    expect: exit_code == 0
  - id: T3
    desc: "API kontrakt bez nového porušenia"
    cmd: "node apps/crm/scripts/check-api-contract.mjs --ci"
    expect: exit_code == 0
  - id: T4
    desc: "bus schéma bez nového porušenia"
    cmd: "node apps/crm/scripts/bus-validate.mjs --ci"
    expect: exit_code == 0
  - id: T5
    desc: "diff nevyšiel z územia"
    cmd: "git diff --name-only origin/main...HEAD"
    expect: all_paths_in(scope.repo_paths)
risk: low
```

`T4` funguje len ak je zmergovaný aj **#555**. Ak nie je, vynechaj `T4`
a zapíš to do reportu — **nepredstieraj, že prešla.**

---

## 6. Čo sa pri oprave typov smie a nesmie

Toto je jediné miesto, kde sa dá tento beh pokaziť ticho.

**Povolené:**
- doplniť chýbajúci typ, generiku, `satisfies`
- doplniť chýbajúce pole do fixture tak, aby zodpovedalo skutočnému typu
- zúžiť `unknown` cez type guard
- opraviť skutočnú nezhodu typu v teste

**Zakázané — každé z toho je tichý no-op:**
```
`as any`, `as unknown as X`, `@ts-ignore`, `@ts-expect-error`
zmena tsconfig.json alebo jeho strict flagov
zmazanie alebo preskočenie testu (`it.skip`, `describe.skip`)
oslabenie assertion, aby test prešiel
zmena produkčného správania kvôli typu
```

Ak sa chyba nedá opraviť bez jedného z týchto, iterácia je **`BLOCKED`**
s dôvodom a ide ďalej. Nie `as any`.

**Zvláštny prípad, ktorý v tomto fronte naozaj je:**
`src/lib/demo/synthetic-leads.ts:149` — `Record<LeadStatus, string[]>` nemá
`Uzavretý` a `Stratený`. Doplnenie tých dvoch kľúčov **zmení dáta**, ktoré
funkcia vracia. To nie je typová oprava, to je produktové rozhodnutie.
→ `BLOCKED`, otázka do `.ai/bus/inbox/`.

---

## 7. W0 — baseline a mapa území (iba orchestrátor)

1. Over, že **#554 je v `main`**: `git log origin/main --oneline | grep judge`
   a že `apps/crm/scripts/judge.mjs` na `main` existuje. Ak nie → **`NOT_LAUNCHED`**.
2. `git fetch origin`, zvoľ jediný `BASE_SHA`, zapíš plný hash.
3. `node apps/crm/scripts/typecheck-baseline.mjs` — zaznamenaj skutočný počet.
   **Ak nie je 69**, front v `queue.json` je zastaraný → prepočítaj ho
   z čerstvého `tsc` výstupu a zapíš odchýlku do `control/`.
4. Vytvor `.ai/bus/state/typecheck-loop-locks.json` ako `{"locks": []}`.
5. Over, že žiadna položka frontu nie je v zakázaných cestách (sekcia 9).
6. `RUN_ID`, výstupy do `output/overnight/<RUN_ID>/`.

**Worktree je povinný.** Každá iterácia má vlastný, z rovnakého `BASE_SHA`.
Žiadne `stash`/`reset`/`clean` cudzích zmien, žiadne obsadené worktree.

### Ruflo

`swarm_init` skús **raz**. Zlyhá → zapíš chybu, pokračuj cez worktree.
Neopakuj, nepíš workaround, nezastavuj beh. (`ruflo@latest` ukazuje na alpha
`3.41.4` — pravdepodobná príčina predošlých zlyhaní.)

---

## 8. W2 — záver (iba orchestrátor)

Až keď slučka zastala z ktorejkoľvek príčiny.

1. **Report** `final/typecheck-loop-report.md`:
   ```
   ITERÁCIA │ ÚZEMIE │ CHÝB PRED │ CHÝB PO │ VETVA │ PR │ VERDIKT │ STAV
   ```
   Plus dôvod zastavenia a zostávajúci front.

2. **Zníženie baseline — až tu, a len ak sú PR zmergované.**
   ```powershell
   git checkout main; git pull
   node apps\crm\scripts\typecheck-baseline.mjs
   node apps\crm\scripts\typecheck-baseline.mjs --write-baseline
   ```
   Ak časť PR ešte nie je zmergovaná, baseline sa **neznižuje** — zapíš,
   koľko by padlo po merge.

3. **Jedna otázka pre foundera**, sformulovaná ako rozhodnutie, nie ako report:

   > Zostáva 25 typových chýb. 24 z nich je v troch stealth-recruiter súboroch,
   > ktoré CI guard mal blokovať, ale jeho regex ich nepokrýva. Odstrániť ich?
   > Áno → baseline padá na 1 a `ignoreBuildErrors: false` je na dosah.

---

## 9. Zákazy pre celý beh

```
NIKDY nemergi do main. Push vetvy áno, PR áno, merge robí founder.
NIKDY as any / @ts-ignore / @ts-expect-error / skip testu.
NIKDY --write-baseline počas slučky.
NIKDY nemeň tsconfig.json ani next.config.js.
NIKDY nevymýšľaj hodnotu, ktorú si nevypočítal príkazom.
NIKDY nehlás DONE z logu ani z úmyslu — DONE je Judge s exit 0 a riadok v ledgeri.

ZAKÁZANÉ CESTY:
  src/app/api/stealth-recruiter/**            (FROZEN)
  src/app/api/cron/stealth-recruiter-ingest/** (FROZEN)
  src/app/api/cron/notification-digest/**      (DEFERRED)
  apps/crm/src/lib/infra/**
  apps/crm/vercel.json
  apps/crm/supabase/migrations/**
  apps/crm/next.config.js
  apps/crm/tsconfig.json
  apps/crm/scripts/judge.mjs
  apps/crm/scripts/typecheck-baseline.mjs
  .mcp.json
  .env*
```

---

## 10. Kontrolný dotaz do záverečného reportu

```sql
select
  (select max(received_at)::date from realvia_webhook_logs)                   as posledny_webhook,
  (select count(*) filter (where read_at is null) from routine_notifications) as neprecitane,
  (select count(*) from leads where auto_response_sent_at is not null)        as odpovedane,
  (select count(*) from lead_property_matches)                               as zhody;
```

**Ani jedno z tých čísel sa týmto behom nemá pohnúť.** Je to typový dlh, nie
produktová zmena. Ak sa niektoré pohne, niekto prekročil územie.
