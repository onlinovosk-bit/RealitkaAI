# Cursor Automations — tri nočné automatizácie pre Revolis

**Cieľová cesta:** `docs/automations/2026-08-03-nocne-automatizacie.md`
**Dátum:** 3. augusta 2026
**Kde sa nastavuje:** Cursor → Automations → New · repo `RealitkaAI`

Každá je napísaná podľa `.cursor/rules/revolis-loops.mdc` — má rozpočet,
fázu a dôkaz. Bez toho by som ti ich nedal.

> **Aktuálne paste-ready + cron (CEST/UTC):** používaj  
> `docs/automations/2026-08-03-setup-karta.md` a  
> `a1-architecture-guardian.md` / `a2-strazca-vetiev.md` / `a3-ranny-brief.md`.  
> Okno behu: **02:00–03:00 CEST = 00:00–01:00 UTC**.  
> Každý report končí: `Verdikt (konal / vedel / zbytočné): ____`  
> Bloky nižšie sú historický zdroj (01:00/02:00/03:00); preferuj setup-kartu.

---

## ⚠️ NAJPRV TOTO — inak si urobíš škodu

Na screenshote je automatizácia nastavená na vetvu **`main`** a účet
`ONLINOVO GMAIL PRO` má zápisové právo.

> **Všetky tri nižšie sú FÁZA 1 — iba čítanie.** Nesmú commitnúť do `main`.
> Ak ich necháš písať, prvé pravidlo z `FOUNDER.md` („merge do main robí človek")
> padne hneď prvú noc.

**Nastav v každej:**
- Branch: nechaj `main` len ako **zdroj čítania**
- V inštrukciách je explicitný zákaz commitu a pushu (je tam napísaný)
- Report ide do výstupu behu (Run History), nie do repa

**K nástrojom (Tools):** ak pridáš MCP na Supabase, **nikdy nie `service_role` kľúč.**
Vytvor si samostatnú rolu `revolis_readonly` s `GRANT SELECT` a nič viac.
Autonómny agent s `service_role` kľúčom je jediná vec, ktorá vie spraviť
väčšiu škodu než všetko, čo audit našiel.

**Čas:** nastav ich v poradí 01:00 → 02:00 → 03:00. Tretia číta výsledky
prvých dvoch, preto musí byť posledná.

---

# A1 · Nočný regresný audit `main` — 01:00

**Prečo prvá:** CI kontroluje PR-ka. Nikto nekontroluje `main` po merge.
Po nasadení 14 patchov a štyroch migrácií je to najzraniteľnejšie miesto.

### Do poľa „Agent Instructions" skopíruj:

```
SPÚŠŤAČ: každý deň o 01:00

ROZSAH:
  Smieš: čítať celé repo, spúšťať príkazy uvedené v AKCIA.
  NESMIEŠ: commitovať, pushovať, otvárať PR, meniť akýkoľvek súbor,
  spúšťať migrácie, dotýkať sa produkčnej databázy.

AKCIA (v tomto poradí, každý krok samostatne):
  1. cd apps/crm && npm ci --prefer-offline
  2. npx tsc --noEmit
  3. npm run test -- --run
  4. node scripts/check-api-contract.mjs
  5. node scripts/find-dead-exports.mjs
  6. Porovnaj výstup krokov 4 a 5 s baseline súbormi v apps/crm/scripts/.
     Zaujíma ma DELTA, nie absolútne číslo.

DÔKAZ:
  Kroky 2 a 3 skončia s návratovým kódom 0.
  Kroky 4 a 5 hlásia 0 nových porušení a 0 nových mŕtvych exportov.

ROZPOČET:
  max 3 pokusy · max 25 minút
  STOP pri stagnácii: ak dva behy po sebe hlásia to isté zlyhanie, zastav sa
  a napíš to do reportu. Neopravuj to.

FÁZA: 1 — IBA ČÍTANIE. Nič nemeníš. Ak nájdeš chybu, POPÍŠ ju, neopravuj.

STOP + REPORT (presne v tejto štruktúre):
  ## Stav main — <dátum>
  - tsc: PREŠLO / ZLYHALO (+ prvých 5 chýb)
  - testy: X prešlo, Y zlyhalo (+ názvy zlyhaných)
  - zmluva API routes: N nových porušení (+ cesty)
  - mŕtve exporty: N nových (+ mená)
  - VERDIKT: main je zelený / main je červený
  - Čo potrebuje človeka: <zoznam, alebo „nič">

  Ak je všetko zelené, napíš presne: „main je zelený, žiadna akcia."
  Nevymýšľaj si nálezy, aby report vyzeral užitočnejšie.
```

---

# A2 · Strážca vetiev a PR — 02:00

**Prečo:** po aplikovaní 14 patchov budeš mať 14 vetiev, z toho päť v reťazi.
Každý deň, čo ležia, sa vzďaľujú od `main`. Toto ti povie, ktorá už zhnila.

### Do poľa „Agent Instructions" skopíruj:

```
SPÚŠŤAČ: každý deň o 02:00

ROZSAH:
  Smieš: git fetch, git log, git merge-tree, gh pr list, gh pr checks — všetko
  len na čítanie.
  NESMIEŠ: commitovať, pushovať, mergovať, mazať vetvy, riešiť konflikty,
  otvárať ani zatvárať PR.

AKCIA:
  1. git fetch --all --prune
  2. Pre každú vetvu, ktorá nie je main a je mladšia ako 30 dní:
     - koľko commitov je za main (git rev-list --count <vetva>..origin/main)
     - či sa dá čisto zmergovať (git merge-tree; hľadaj konflikty)
     - či má otvorený PR a v akom stave sú kontroly (gh pr checks)
  3. Osobitne označ vetvy z reťaze Inzerát Generátora:
     feat/listing-gen-persistence, fix/listing-gen-stream-harden,
     feat/listing-gen-ui, test/listing-gen-tests-docs, feat/listing-gen-variants
     — pri nich je poradie merge záväzné, konflikt v jednej blokuje ostatné.

DÔKAZ:
  Pre každú vetvu existuje jednoznačný stav: ČISTÁ / KONFLIKT / CI ČERVENÉ /
  BEZ PR. Žiadna vetva nesmie zostať nezaradená.

ROZPOČET:
  max 2 pokusy · max 15 minút
  STOP pri stagnácii: ak sa git fetch nepodarí dvakrát, zastav a nahlás to.

FÁZA: 1 — IBA ČÍTANIE.

STOP + REPORT:
  ## Vetvy — <dátum>
  Tabuľka: vetva | commitov za main | zlúčiteľná | CI | PR
  - Vetvy, ktoré treba mergovať dnes (konflikt hrozí):
  - Vetvy, ktoré sa dajú zahodiť (už sú v main):
  - Reťaz Inzerát Generátora: v akom je stave a čo blokuje čo

  Ak je všetko čisté, napíš: „všetky vetvy čisté, nič nehorí."
```

---

# A3 · Ranný prevádzkový brief — 03:00 ⭐

**Toto je tá najdôležitejšia z troch** a jediná, ktorá nie je o kóde.

Playbook hovorí: *„Najlepší prvý projekt je úloha, ktorá ti berie 15 až 30 minút
denne."* U teba je to presne toto — denná kontrola kampane, leadov a produkcie.
Máš ju v handoveri ako ručnú úlohu. Po tejto automatizácii ju budeš mať hotovú,
kým vstaneš.

### Do poľa „Agent Instructions" skopíruj:

```
SPÚŠŤAČ: každý deň o 03:00

ROZSAH:
  Smieš: HTTP GET na verejné endpointy, SELECT dotazy cez read-only databázové
  spojenie, čítanie výstupov automatizácií A1 a A2 z Run History.
  NESMIEŠ: akýkoľvek INSERT, UPDATE, DELETE. Žiadny commit, push ani PR.
  Žiadne odosielanie e-mailov — ani drafty, ani notifikácie zákazníkom.

AKCIA:
  1. ZDRAVIE PRODUKCIE
     curl -fsS -o /dev/null -w "%{http_code}" https://app.revolis.ai/api/healthz
     curl -fsS -o /dev/null -w "%{http_code}" https://app.revolis.ai/odhad/reality-smolko
     POZOR: /api/health NEEXISTUJE a vracia 401. Nepoužívaj ho.

  2. LEADY ZA VČERA (read-only SELECT)
     select count(*) filter (where created_at >= current_date - 1) as vcera,
            count(*) filter (where created_at >= current_date - 7) as za_tyzden,
            count(*) filter (where status = 'Nový') as nekontaktovane,
            count(*) filter (where note ilike '%predaj_do_12m=ano%') as chce_predat
     from public.leads
     where agency_id = '11111111-1111-1111-1111-111111111111'
       and source = 'valuation_widget'
       and email not ilike '%@revolis.test';

  3. NAJSTARŠÍ NEKONTAKTOVANÝ LEAD
     Vypíš meno, telefón a koľko dní leží. Toto je jediné číslo, ktoré
     priamo ohrozuje jediného platiaceho zákazníka.

  4. KONTROLA SANDBOXU — musí vrátiť 0 riadkov:
     select count(*) from public.leads
     where source = 'valuation_widget'
       and (email ilike '%@revolis.test' or note ilike '%demo%')
       and created_at >= now() - interval '1 day';
     Ak vráti čokoľvek iné než 0, je to INCIDENT — napíš to na prvý riadok reportu.

  5. VÝSLEDKY A1 A A2
     Prečítaj Run History predchádzajúcich dvoch automatizácií a zhrň ich
     jednou vetou každú.

DÔKAZ:
  Každý bod má číslo alebo HTTP kód. Žiadny bod nesmie skončiť slovným
  odhadom typu „vyzerá to v poriadku".

ROZPOČET:
  max 2 pokusy · max 10 minút
  STOP pri stagnácii: ak databáza neodpovie na druhý pokus, vynechaj body
  2 až 4, dokonči zvyšok a napíš, čo chýba.

FÁZA: 1 — IBA ČÍTANIE.

STOP + REPORT (toto čítam o 7:00, píš stručne):
  ## Ráno <dátum>
  🔴 / 🟢 na prvom riadku — červená len ak je niečo naozaj rozbité

  PRODUKCIA: healthz <kód> · widget Smolko <kód>
  LEADY: včera X · týždeň Y · nekontaktovaných Z · chce predať do 12m W
  NAJSTARŠÍ NEKONTAKTOVANÝ: <meno>, <telefón>, <N> dní
  SANDBOX: čistý / INCIDENT
  KÓD: main <zelený/červený> · vetvy <čisté / N s konfliktom>

  ČO MUSÍM DNES UROBIŤ:
  <max 3 body, zoradené podľa toho, čo ohrozuje platiaceho zákazníka.
   Ak nie je nič, napíš „nič nehorí, choď volať kanceláriám.">

  NEPÍŠ nič ďalšie. Žiadne odporúčania k architektúre, žiadne návrhy
  na refaktoring. Toto je prevádzkový brief, nie konzultácia.
```

---

## Prečo práve tieto tri a nie iné

| Kandidát | Prečo nie |
|---|---|
| Automatická oprava zlyhaných testov | Fáza 3 podľa `revolis-loops.mdc`. Najprv musia tri mesiace bežať fázy 1. |
| Nočný Swarm na feature | Feature vyžaduje rozhodnutia. Agent, ktorý ich robí sám, je presne to, pred čím `FOUNDER.md` varuje. |
| Monitoring widgetu každých 30 min | **Už máš** — n8n W2 heartbeat watchdog. Neduplikuj. |
| Follow-up drafty pre prospektov | **Už máš** — n8n W1. A odosielanie je zakázané. |
| Čistenie starých vetiev | A2 ich nájde. Mazať ich má človek. |
| Automatický merge zelených PR | Máš `auto-merge-policy.yml`. Nočný agent by s ním kolidoval. |

---

## Poradie zavádzania — nie všetky tri naraz

**Týždeň 1:** zapni len **A3**. Je najužitočnejšia, číta najmenej a keď zlyhá,
nestane sa nič. Po piatich ránach budeš vedieť, či ti ten report reálne
šetrí čas, alebo ho ignoruješ.

**Týždeň 2:** pridaj **A1**. Dovtedy budeš mať patche zmergované a bude
čo strážiť.

**Týždeň 3:** pridaj **A2** — má zmysel až keď máš viac otvorených vetiev
naraz. Ak ich do troch týždňov všetky zmerguješ, A2 nepotrebuješ vôbec.

> Zapnúť tri automatizácie naraz znamená tri neznáme naraz. Keď potom niečo
> nesedí, nevieš ktorá. To je tá istá chyba ako paralelné vlny bez dôkazu
> neprekrytia.

---

## Čo si over po prvom behu každej

- [ ] Agent naozaj **nič nezmenil** — `git status` na `main` je čistý
- [ ] Report má štruktúru, ktorú si zadal, nie voľný text
- [ ] Ak bolo všetko v poriadku, agent to **napísal krátko** a nevymyslel si nálezy
- [ ] Beh sa zmestil do rozpočtu (pozri trvanie v Run History)
- [ ] Databázové spojenie je **read-only** — skús ho donútiť k UPDATE a musí zlyhať
