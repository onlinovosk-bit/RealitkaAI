---
id: brain.engine
title: Revolis Brain OS Engine
type: governance
status: active
version: 1.0.0
owner: founder
created_at: 2026-07-19
updated_at: 2026-07-19
review_by: 2026-08-19
confidentiality: internal
canonical: true
sources:
  - CLAUDE.md
  - docs/architecture/revolis-constitution-v2.md
  - docs/architecture/engineering-os-revolis-rightsized.md
  - docs/architecture/antipatterns-log.md
  - memory/decisions.md
  - memory/session-summary.md
  - memory/open-tasks.md
depends_on: []
supersedes: []
---

# Revolis Brain OS Engine

## 1. Účel

Revolis Brain OS je riadiaca vrstva nad existujúcimi zdrojmi pravdy v
repozitári. Jeho úlohou je:

1. nájsť relevantnú pravdu bez čítania celého repozitára,
2. rozlíšiť fakt, hypotézu, rozhodnutie a neznámu,
3. zistiť, ktoré dokumenty ovplyvnila zmena,
4. pripraviť malý a kontrolovateľný update,
5. overiť konzistenciu, pôvod tvrdení, súkromie a čerstvosť,
6. nechať rizikové rozhodnutia na človeku.

Brain OS nie je sklad ďalších stoviek strán. Hodnotu má iba vtedy, ak znižuje
čas potrebný na správne rozhodnutie alebo zabraňuje opakovaniu chyby.

## 2. Rozsah rozhodnutia

Founder dal 2026-07-19 GO na vytvorenie prvého engine dokumentu.

Toto GO znamená:

- vytvoriť brain/ENGINE.md,
- definovať zdroje pravdy a aktualizačný protokol,
- definovať bezpečnostné a rozhodovacie brány,
- použiť engine pri prvom reálnom update cykle.

Toto GO zatiaľ neznamená:

- generovať 200 až 300 strán dokumentácie,
- vytvoriť päť šablón bez opakovanej potreby,
- implementovať brain/update.ts,
- automaticky meniť kanonické rozhodnutia,
- vytvoriť founder dashboard,
- exportovať celý systém do DOCX.

Tieto položky majú samostatné odomykacie podmienky v časti 18.

## 3. Constitution verdict

Veľký Knowledge Brain neprináša dnešnému klientovi priamy príjem, nevytvára
nové proprietárne dáta a môže sa stať formou customer avoidance. Existujúci
Engineering OS preto správne odložil rozsiahlu taxonómiu a 200-stranový systém.

Verdikt pre tento release:

| Scope | Verdikt | Dôvod |
|---|---|---|
| Jeden engine kontrakt | BUILD-LIGHT | explicitný founder GO, malý rozsah, znižuje drift |
| Ručný update cyklus | VALIDATE | musí preukázať praktickú úsporu času |
| Registry a validator | BACKLOG | odomkne opakovaný update problém |
| Automatický updater | BACKLOG | najprv treba stabilný a opakovateľný ručný proces |
| 200 až 300 strán | REJECT NOW | complexity bias a vysoký oportunitný náklad |
| DOCX export | BACKLOG | až keď existuje konkrétny externý čitateľ |

ENGINE.md nesmie obísť Revolis Constitution. Ak sa Brain OS stane väčšou
investíciou než zákaznícky experiment alebo produkčný blocker, práca na ňom sa
zastaví.

## 4. Čo je Single Source of Truth

Single Source of Truth nie je jeden veľký súbor ani samotný priečinok brain.
Je to jednoznačná odpoveď na otázku, ktorý artefakt je kanonický pre konkrétny
typ informácie.

Pravidlá:

1. Jedna informácia má jedného kanonického vlastníka.
2. Brain OS zdroje registruje, nekopíruje ich obsah.
3. Generovaný prehľad nikdy nenahrádza zdroj.
4. Súbor v brain nie je automaticky pravdivejší než produkčný kód alebo
   prijaté rozhodnutie.
5. Novší dátum sám osebe neznamená vyššiu autoritu.
6. Konflikt sa označí a zastaví, nie potichu prepíše.

## 5. Hierarchia dôkazov

Pri konflikte sa používa táto hierarchia:

1. **Pozorovateľná realita:** produkčný stav, schéma, log, reálny payload,
   spustený test alebo reprodukovateľný výsledok.
2. **Prijaté rozhodnutie:** aktuálne ADR alebo explicitný záznam v
   memory/decisions.md.
3. **Záväzné governance:** Constitution, bezpečnostné pravidlá, privacy pravidlá
   a prijaté antipatterny.
4. **Aktuálny produktový kontrakt:** aktívny brief, runbook alebo architektúra
   pre konkrétny scope.
5. **Operačný stav:** session summary, open tasks, PR a CI stav.
6. **Hypotéza a explorácia:** návrhy čakajúce na experiment.
7. **Generovaný pohľad:** dashboard, súhrn alebo export.

Aktuálny pokyn foundera určuje scope práce. Ak má byť trvalým pravidlom, musí sa
po vykonaní zapísať medzi prijaté rozhodnutia. Pokyn v chate sa nesmie spätne
vydávať za historický fakt.

## 6. Počiatočný register zdrojov

Kým nevznikne samostatný strojovo čitateľný register, platí táto tabuľka:

| Doména | Kanonický zdroj | Vlastník | Čerstvosť |
|---|---|---|---|
| Brain update pravidlá | brain/ENGINE.md | founder | 30 dní |
| Agent initialization | CLAUDE.md | founder | pri zmene procesu |
| Feature rozhodovanie | docs/architecture/revolis-constitution-v2.md | founder | štvrťročne |
| Right-sized engineering | docs/architecture/engineering-os-revolis-rightsized.md | founder | štvrťročne |
| Prijaté rozhodnutia | memory/decisions.md a docs/adr | founder | pri rozhodnutí |
| Aktuálna session | memory/session-summary.md | aktívny agent | na konci session |
| Prioritizovaná práca | memory/open-tasks.md | founder | pri zmene priority |
| Zdroje dát | docs/architecture/master-data-sourcing-map.md | data owner | pred dátovou feature |
| Opakované chyby | docs/architecture/antipatterns-log.md | engineering owner | po incidente |
| Prevádzkové postupy | docs/runbooks | engineering owner | po zmene postupu |
| Produktové hypotézy | aktívny dokument v docs/architecture alebo docs/briefs | product owner | po experimente |
| Implementačná pravda | apps, packages, workers, infra | code owner | každý commit |
| Zákaznícky a sales stav | schválený tracker alebo CRM | founder | po kontakte |

Zákaznícke osobné údaje, emailové vlákna a surové exporty sa do registra
nevkladajú. Register môže ukázať iba bezpečný odkaz, klasifikáciu a vlastníka.

## 7. Typy artefaktov

### 7.1 Canonical

Obsahuje rozhodnutie alebo pravdu, ktorú nesmie generátor autonómne zmeniť.
Príklady: Constitution, ADR, data sourcing map a bezpečnostné pravidlá.

### 7.2 Operational

Obsahuje meniaci sa stav práce. Príklady: session summary, open tasks a runbook.
Môže sa aktualizovať v rámci schváleného tasku, ale nesmie meniť strategické
rozhodnutie.

### 7.3 Generated

Je odvodený pohľad, napríklad overview alebo DOCX. Musí uviesť zdroje, čas
generovania a upozornenie, že nie je kanonický. Môže sa vždy znovu vytvoriť.

### 7.4 Evidence

Je reprodukovateľný dôkaz: test, audit, log alebo anonymizovaná vzorka. Evidence
sa nesmie upravovať tak, aby spätne podporovala rozhodnutie.

### 7.5 Draft

Je návrh bez rozhodovacej autority. AI nesmie draft označiť ako schválený iba
preto, že ho vytvorila.

## 8. Metadata kontrakt

Každý nový Brain-managed Markdown dokument musí mať tieto polia:

| Pole | Význam |
|---|---|
| id | stabilný jedinečný identifikátor |
| title | ľudský názov |
| type | canonical, operational, generated, evidence alebo draft |
| status | draft, active, stale, superseded alebo archived |
| version | semantická verzia dokumentu |
| owner | osoba alebo rola oprávnená prijať zmenu |
| created_at | dátum vytvorenia |
| updated_at | dátum poslednej vecnej zmeny |
| review_by | najneskorší dátum kontroly |
| confidentiality | public, internal, restricted alebo customer-confidential |
| sources | priame zdroje tvrdení |
| depends_on | dokumenty ovplyvňujúce tento dokument |
| supersedes | explicitne nahradené dokumenty alebo verzie |

Pravidlá metadát:

- updated_at sa nemení pri čisto formátovacej zmene.
- review_by sa neposúva bez kontroly obsahu.
- status active bez ownera je neplatný.
- generated dokument bez sources je neplatný.
- customer-confidential obsah sa negeneruje do public výstupu.

Existujúce legacy dokumenty sa nemusia hromadne prepisovať. Metadata sa doplnia
iba vtedy, keď sa dokument vecne mení alebo vstúpi do registra.

## 9. Životný cyklus dokumentu

Povolené prechody:

1. draft -> active: schválenie vlastníkom.
2. active -> stale: prekročená review_by alebo zmenená závislosť.
3. stale -> active: vecná kontrola a potvrdenie.
4. active alebo stale -> superseded: existuje explicitný nástupca.
5. superseded -> archived: dokument už netreba pri bežnom onboardingu.

Zakázané prechody:

- draft -> superseded bez rozhodnutia,
- stale -> active iba zmenou dátumu,
- generated -> canonical bez ľudského schválenia,
- archived -> active bez vysvetlenia dôvodu.

## 10. Klasifikácia tvrdení

Brain OS pri syntéze používa štyri označenia:

- **FAKT:** má priamy zdroj alebo reprodukovateľný dôkaz.
- **ROZHODNUTIE:** bolo prijaté oprávneným vlastníkom.
- **HYPOTÉZA:** má validačný test alebo otvorenú otázku.
- **NEZNÁME:** chýba zdroj alebo existuje nevyriešený konflikt.

AI nesmie:

- zmeniť hypotézu na fakt opakovaním,
- zameniť implementáciu za produkčné nasadenie,
- zameniť completion rate za kvalitu leadu,
- zameniť nový dátum dokumentu za nové dôkazy,
- doplniť chýbajúce číslo odhadom bez označenia.

## 11. Update loop

Každý update prechádza rovnakou slučkou:

### Krok 1: Trigger

Zmena vznikne iba z konkrétneho podnetu:

- prijaté rozhodnutie,
- zmena kódu alebo schémy,
- výsledok experimentu,
- zákaznícky feedback,
- incident,
- zmena právneho alebo dátového zdroja,
- prekročenie review_by.

Bez triggera sa nový dokument negeneruje.

### Krok 2: Scope

Určiť:

- čo sa zmenilo,
- ktoré zdroje to dokazujú,
- ktoré dokumenty od toho závisia,
- čo sa vedome nemení.

### Krok 3: Classification

Každé nové tvrdenie označiť ako FAKT, ROZHODNUTIE, HYPOTÉZA alebo NEZNÁME.

### Krok 4: Impact

Zostaviť minimálny zoznam dotknutých artefaktov. Ak neexistuje dependency
záznam, vyhľadať odkazy a presné pojmy. Pochybnosť znamená review, nie hromadný
rewrite.

### Krok 5: Patch

Vytvoriť najmenší diff. Nekopírovať celý zdroj do ďalšieho súboru. Zachovať
ownerstvo, stav a históriu rozhodnutia.

### Krok 6: Validation

Spustiť kontroly z časti 13 a testy primerané dotknutému scope.

### Krok 7: Gate

Určiť AUTO-SAFE, REVIEW REQUIRED, GO REQUIRED alebo STOP.

### Krok 8: Record

Po schválení zapísať:

- zdroj triggera,
- zmenené artefakty,
- prijaté rozhodnutie,
- neuzavreté konflikty,
- ďalší review termín.

### Krok 9: Observe

Pri nasledujúcom cykle overiť, či update pomohol nájsť správnu odpoveď alebo
zabránil chybe. Počet strán ani commitov nie je úspech.

## 12. Trigger matica

| Trigger | Automatická akcia | Povinná brána |
|---|---|---|
| Zmena odkazu alebo cesty | navrhnúť opravu referencie | AUTO-SAFE po kontrole |
| Zmena implementácie | označiť závislý dokument na review | REVIEW REQUIRED |
| Zelený test alebo smoke | pridať dôkaz k existujúcemu tvrdeniu | REVIEW REQUIRED |
| Founder rozhodnutie | pripraviť decision patch | GO REQUIRED |
| Zákaznícky feedback | anonymizovať a zaradiť ako evidence | GO REQUIRED |
| Incident | pripraviť incident a antipattern patch | REVIEW REQUIRED |
| Osobné údaje alebo secret | nevkladať do Brain OS | STOP |
| PROD zásah, merge alebo externá správa | iba pripraviť podklady | GO REQUIRED |
| Prekročené review_by | označiť stale | AUTO-SAFE |
| Konflikt dvoch canonical zdrojov | vytvoriť conflict report | STOP |

## 13. Validácie

Každý Brain update musí overiť:

### Integrita

- všetky lokálne odkazy existujú,
- ID dokumentov sú jedinečné,
- required metadata sú prítomné,
- depends_on a supersedes neobsahujú cyklus,
- canonical informácia nemá dvoch aktívnych vlastníkov.

### Pravdivosť

- čísla majú zdroj,
- produkčný claim má produkčný dôkaz,
- hypotézy sú označené,
- neznáme nie sú doplnené fikciou,
- nová verzia nevygumovala dôvod starého rozhodnutia.

### Bezpečnosť a privacy

- žiadne .env hodnoty, tokeny, heslá alebo service-role kľúče,
- žiadne surové lead exporty, emaily, telefónne čísla ani klientsky payload,
- zákaznícke meno iba s oprávneným interným účelom a správnou klasifikáciou,
- public export neobsahuje internal ani customer-confidential obsah.

### Scope

- jeden commit rieši jednu logickú zmenu,
- update nevytvára novú feature,
- generated výstup nemení canonical zdroj,
- formátovací rewrite nie je vydávaný za vecný update.

### Verifikácia

- dokumentačný diff prejde whitespace a link checkom,
- kódový diff prejde lokálnymi testami podľa Constitution,
- side-effect sa overí samostatne od success response,
- agent ukáže artefakt alebo diff, nie iba textové vyhlásenie.

## 14. Rozhodovacie brány

### AUTO-SAFE

- označenie prekročeného review_by ako stale,
- regenerovanie derived overview bez zmeny významu,
- oprava jednoznačne presunutej lokálnej cesty,
- formátovacia oprava bez zmeny updated_at.

### REVIEW REQUIRED

- zmena runbooku po zmene kódu,
- doplnenie overeného dôkazu,
- nový antipattern po potvrdenom incidente,
- zmena dependencies alebo ownera.

### GO REQUIRED

- nové strategické alebo produktové rozhodnutie,
- zmena canonical pravidla,
- zmena confidentiality,
- externá komunikácia,
- merge, PROD, secrets alebo osobné údaje,
- nový automatický trigger.

### STOP

- konflikt canonical zdrojov,
- neznámy dátový zdroj,
- chýbajúci právny základ pre osobné dáta,
- automatický updater chce meniť rozhodnutie,
- patch obsahuje secret alebo nespracované zákaznícke údaje.

## 15. Definícia „samoaktualizujúci“

V Revolise samoaktualizujúci neznamená autonómne prepisujúci pravdu.

Povolený model:

1. systém deteguje trigger,
2. označí dotknuté dokumenty,
3. pripraví vysvetlený patch,
4. spustí validácie,
5. človek schváli canonical zmenu,
6. systém obnoví generated views.

Bez ľudskej brány sa môžu meniť iba jednoznačné derived artefakty a stav stale.

Zakázaný model:

- AI sama prijme obchodné rozhodnutie,
- AI prepíše minulý decision log podľa aktuálneho názoru,
- AI mergne alebo nasadí zmenu len preto, že validátor prešiel,
- AI odošle klientsku komunikáciu bez explicitného GO,
- AI vytvorí dokumenty iba preto, aby adresár pôsobil kompletne.

## 16. AI onboarding protokol

Nový AI spolupracovník vykoná v tomto poradí:

1. Prečíta brain/ENGINE.md.
2. Prečíta CLAUDE.md.
3. Prečíta memory/session-summary.md a memory/open-tasks.md.
4. Skontroluje git status a aktívnu vetvu.
5. Podľa scope otvorí iba relevantné canonical zdroje.
6. Vráti krátky State Sync: cieľ, fakty, otvorené rozhodnutia, riziká a ďalšia
   povolená akcia.
7. Pred editom pomenuje súbory, ktoré zmení.
8. Po práci ukáže artefakt, verifikáciu a zostávajúcu bránu.

Minimálny onboarding prompt:

> Si AI spolupracovník Revolis.AI. Najprv načítaj Brain Engine, aktuálnu session,
> open tasks, git status a canonical zdroje pre pridelený scope. Oddeľ FAKT,
> ROZHODNUTIE, HYPOTÉZU a NEZNÁME. Nevytváraj novú scope. Canonical zmenu,
> externú komunikáciu, merge, PROD, secrets a osobné dáta zastav na GO bráne.
> Hotovo znamená existujúci artefakt a overenie, nie iba slovný report.

## 17. Model-specific prompt library

Core pravidlá sú modelovo neutrálne. Adaptér pre Claude, Grok, Kimi, Codex alebo
iný model smie meniť iba:

- formát tool callov,
- veľkosť načítaného kontextu,
- podporovaný output schema formát,
- spôsob práce s cache alebo sessions,
- modelovo špecifické obmedzenia.

Adaptér nesmie meniť Constitution, source hierarchy, privacy ani GO brány.

Nový modelový prompt vznikne až vtedy, keď:

1. existuje reálny opakovaný task,
2. generický onboarding na ňom preukázateľne zlyhal,
3. rozdiel sa dá otestovať,
4. prompt má ownera, verziu, vstupný kontrakt a validačný príklad.

Samostatný prompt pre každý model bez nameraného rozdielu je duplicita.

## 18. Odomykacie podmienky ďalších komponentov

### Registry

Vytvoriť brain/registry.yaml až po prvom ručnom update cykle, keď bude jasné,
ktoré polia sa naozaj používajú. Register musí najprv pokryť najviac 10
kanonických zdrojov.

### Šablóny

Vytvoriť konkrétnu šablónu až po druhom výskyte rovnakého typu dokumentu.
Prvých päť šablón sa nevytvára naraz iba kvôli symetrii.

### Validator

Implementovať brain/check.ts, keď ručná kontrola dvakrát zopakuje rovnaké
deterministické kroky. Prvá verzia kontroluje metadata, odkazy, duplicitu ID,
stale stav a zakázané citlivé vzory.

### Updater

Implementovať brain/update.ts až po najmenej dvoch úspešných ručných update
cykloch. Prvá verzia musí byť dry-run only a vytvoriť patch plan, nie zapisovať.

### Founder overview

Vytvoriť generated overview až keď register obsahuje dostatok aktívnych zdrojov
na to, aby manuálne hľadanie spôsobovalo merateľné trenie. Overview ukáže
aktuálny cieľ, P0, čerstvé rozhodnutia, stale zdroje, konflikty a ďalšiu bránu.
Nebude zobrazovať vanity metriky.

### DOCX export

DOCX je derived výstup, nikdy canonical zdroj. Odomkne sa až na konkrétnu
žiadosť čitateľa, ktorý Markdown nepoužíva. Export musí uviesť dátum, verziu a
zdrojové dokumenty.

## 19. Plánovaný CLI kontrakt

Nasledujúce príkazy sú návrh rozhrania, nie existujúca implementácia:

| Príkaz | Účel | Zápis |
|---|---|---|
| npm run brain:check | validácia registra a metadát | nie |
| npm run brain:plan -- --since REF | impact report od zvoleného git ref | nie |
| npm run brain:update -- --dry-run | návrh patchov s dôvodmi | nie |
| npm run brain:overview | regenerovanie derived prehľadu | iba generated |
| npm run brain:render -- --format docx | explicitný export | iba derived |

Žiadny Brain CLI príkaz nesmie implicitne mergovať, pushovať, volať PROD alebo
odosielať externú komunikáciu.

## 20. Founder overview kontrakt

Budúci overview musí odpovedať iba na tieto otázky:

1. Aký je aktuálny firemný a produktový cieľ?
2. Čo blokuje platiaceho klienta alebo získanie ďalšieho?
3. Ktoré rozhodnutia boli prijaté od poslednej kontroly?
4. Ktoré zdroje sú stale alebo v konflikte?
5. Ktoré hypotézy čakajú na experiment?
6. Aká je jedna ďalšia úloha a aká je jej brána?

Overview nesmie merať počet dokumentov, promptov, agentov ani strán.

## 21. Conflict protocol

Pri konflikte:

1. zachovať oba zdroje bez prepisu,
2. uviesť presné tvrdenia, ktoré si odporujú,
3. uviesť autoritu, dátum a dôkaz každého zdroja,
4. rozhodnúť, či ide o rozdiel scope, drift alebo skutočný konflikt,
5. navrhnúť vlastníka rozhodnutia,
6. zastaviť dependent update do vyriešenia,
7. po rozhodnutí použiť supersedes, nie vymazanie histórie.

Pravidlo „najnovší vyhráva“ je zakázané, ak novší zdroj nemá vyššiu autoritu
alebo nový dôkaz.

## 22. Security a data minimization

Brain OS nikdy nečíta ani neindexuje celý obsah týchto kategórií:

- .env a secret súbory,
- surové lead exporty,
- zákaznícke emaily a prílohy,
- databázové dumpy,
- dočasné pracovné adresáre,
- node_modules a build output,
- binárne súbory bez explicitného scope.

Pre sales feedback sa ukladá:

- anonymizovaný problém alebo citácia v povolenom rozsahu,
- dátum a kanál,
- stav FACT alebo HYPOTHESIS,
- dopad na rozhodnutie,
- odkaz na bezpečný systém záznamu, ak existuje.

Neukladá sa celý email, telefón, meno leadu ani zákaznícky export.

## 23. Definition of Done pre Brain update

Update je hotový, keď:

- existuje konkrétny trigger,
- dotknutý canonical zdroj je identifikovaný,
- diff je minimálny a vysvetlený,
- tvrdenia majú klasifikáciu a pôvod,
- metadata a odkazy prešli kontrolou,
- neunikli secrets ani osobné údaje,
- správna brána bola rešpektovaná,
- výsledok je artefakt, nie iba report,
- je pomenovaná jedna ďalšia úloha.

## 24. Meranie hodnoty a kill kritérium

Brain OS je užitočný iba ak v priebehu prvých troch reálnych update cyklov:

- skráti čas synchronizácie agenta,
- odhalí aspoň jeden stale zdroj alebo konflikt,
- zabráni duplicitnému dokumentu alebo zlému rozhodnutiu,
- nevytvorí viac údržby než ušetrí.

Kill alebo zjednodušenie nastane, ak:

- údržba presiahne 30 minút na bežný update,
- generated výstupy sa pravidelne rozchádzajú s canonical zdrojmi,
- founder ich nepoužije pri rozhodovaní,
- Brain OS začne odkladať zákaznícku exekúciu,
- systém rastie počtom strán bez merateľného zníženia chýb alebo času.

## 25. Prvý validačný cyklus

Prvý test Brain OS nebude ďalší dokumentačný projekt. Použije sa na jednu
skutočnú zmenu, napríklad výsledok concierge seller experimentu alebo uzavretie
existujúceho produkčného blockera.

Očakávaný výstup:

1. trigger a zdroj dôkazu,
2. impact report s najviac piatimi artefaktmi,
3. jeden minimálny patch,
4. validačný výsledok,
5. čas potrebný na celý cyklus,
6. rozhodnutie, či sa odomkne registry.yaml.

Kým tento cyklus neprebehne, ENGINE.md je jediný povinný artefakt v brain.
