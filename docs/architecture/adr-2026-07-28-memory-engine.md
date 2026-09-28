# ADR — Memory Engine: architektúra organizačnej pamäte Revolis

**Cieľová cesta v repe:** `docs/architecture/adr-2026-07-28-memory-engine.md`
**Zrkadlo rozhodnutí:** zapísať zhrnutie do `memory/decisions.md` (12 riadkov, jeden na otázku)
**Stav:** NÁVRH — čaká na GO foundera
**Dátum:** 2026-07-28 · **Autor:** Claude (architektúra) · **Vlastník rozhodnutia:** founder

---

## 0. Kontrolór blok — prečítaj toto pred zvyškom

Nerozhodujem za teba. Pomenúvam tri rozpory, ktoré vzniknú v momente, keď
tento ADR schválíš, aby si ich schválil vedome a nie omylom.

**R1 — Brána 3 platiacich zákazníkov nepadla.**
`COMPANY.md` odkladá GraphRAG, hybrid retrieval, rolové agenty a L99 komponenty
za bránu **3 platiaci zákazníci**. Aktuálny stav: **1 platiaci** (Smolko) + 1
ústne dohodnutý (Kamzík). Otázky 8, 9, 10 sa pýtajú presne na to, čo je za
touto bránou.

**R2 — „Neo4j zamietnutý" je uzamknuté rozhodnutie.**
Prenosový sumár v3, sekcia 5: *„Žiadna druhá DB ani graph store — `entity_edges`
v Supabase, keď príde čas; Neo4j zamietnutý."* Otázky 1 a 2 toto rozhodnutie
otvárajú. Ak ho meníš, treba to zapísať ako zmenu, nie ako novú informáciu —
inak sa v repe objaví druhý rozpor toho istého typu, aký už máš pri bráne pre VPS.

**R3 — Anti-dokument pravidlo.**
`FOUNDER.md`: *„ak existuje konkrétna nedokončená exekučná úloha, má prednosť
pred ďalšou analýzou."* Otvorené sú: Simi Real opt-out v **živej** n8n inštancii
(právne riziko, ~5 minút práce), koniec n8n trialu **~5.8.**, Kamzík balík
(2. platiaci zákazník), GARANT REAL demo **3.8.**

**Modelová veta, ktorá platí pre celý tento dokument:**
Vidím tieto riziká. Napriek tomu — ak je Memory Engine strategické rozhodnutie
zakladateľa — navrhujem tento spôsob realizácie, ktorý ho vie doručiť bez toho,
aby zhodil obchod alebo vytvoril nezvratný technický dlh.

**Ako to riešim v návrhu:** rozdelil som Memory Engine na tri brány. Brána 0 je
**lacná, reverzibilná a plne kompatibilná s doterajším „capture-now / learn-later"**
— je to presne tá vrstva, ktorá už beží (`deal_outcomes`, `moat_ai_recommendations`),
len dotiahnutá do kontraktu. Drahé časti (graph engine, agenti, samoreorganizácia)
zostávajú za bránou, ale architektúra je navrhnutá tak, aby ich neskôr prijala
bez prepisovania.

---

## 1. Kontext a rámec rozhodovania

North Star: *Revolis je organizačná pamäť realitnej kancelárie, ktorá sa s každým
obchodom stáva neskopírovateľná.*

Z toho plynie jediné kritérium, ktorým meriam každú z 12 odpovedí:

> **Zvyšuje to množstvo a kvalitu zachytených neskopírovateľných dát, alebo len
> zvyšuje sofistikovanosť ich spracovania?**

Moat nie je graph engine. Moat sú **výsledky obchodov a dôvody prehier**, ktoré
konkurencia nemá. Graph engine je vymeniteľný za víkend; 18 mesiacov histórie
rozhodnutí kancelárie nie. Preto všetky odpovede uprednostňujú **zachytávanie
pred spracovaním** a **vymeniteľnosť pred optimalitou**.

Druhé kritérium je prevádzkové: **solo founder, ktorý nie je programátor.**
Každý beh navyše, každý kontajner navyše, každá databáza navyše je trvalá daň
na tvojom čase. Architektúra, ktorú nevieš o polnoci sám reštartovať, je zlá
architektúra bez ohľadu na to, aká je elegantná.

---

## 2. Odpovede na 12 otázok

### Q1 — Je Graphiti finálne rozhodnutie?

**Odpoveď: NIE. Graphiti nie je základ. Je to kandidát na implementáciu za
rozhraním, o ktorom rozhodneš meraním, nie teraz.**

Čo z Graphiti prevziať **hneď a zadarmo** — jeho **dátový model**, nie jeho kód:

- **epizóda** (raw vstup: email, hovor, poznámka, commit),
- **entita** (kontakt, nehnuteľnosť, obchod, kancelária),
- **fakt s bi-temporálnou platnosťou** (`valid_from` / `valid_to`) — fakt sa
  nemaže, **invaliduje sa**.

Bi-temporalita je pre reality mimoriadne dobrý fit: „klient chcel predať do 3
mesiacov" je fakt, ktorý bol pravdivý v marci a nepravdivý v júni. Klasické CRM
to prepíše a históriu stratí — a **presne tá história je moat**. Toto je tá časť
Graphiti, ktorá ti dáva 90 % hodnoty a stojí ťa jednu SQL tabuľku.

Čo **neprevziať teraz** — samotnú knižnicu. Dôvody, konkrétne:

1. Graphiti je Python služba. Tvoj stack je TypeScript/Next.js/Vercel. Pridáš
   druhý runtime, druhý deploy, druhý zdroj výpadku.
2. Vyžaduje graph DB (Neo4j / FalkorDB) → druhá produkčná databáza → druhý
   backup, druhé RLS-ekvivalentné riešenie multi-tenancy, druhé miesto pre GDPR
   výmaz. Multi-tenant izolácia v graph DB je práca, ktorú ti Supabase RLS dnes
   robí zadarmo.
3. Jeho ingest volá LLM na extrakciu entít pri každej epizóde. Pri tvojom objeme
   je to dnes lacné, ale je to nedeterministický krok v zapisovacej ceste —
   najhoršie miesto na nedeterminizmus.

**Meratelný spúšťač na návrat ku Graphiti (zapíš do repa, aby nešlo o pocit):**
- potrebuješ traverz **≥3 hopy** v interaktívnej ceste (používateľ čaká) **a**
  p95 rekurzívneho CTE v Postgrese na reálnom objeme je **>300 ms**, **alebo**
- **>5 mil. hrán** na jedného tenanta, **alebo**
- zákazník s on-prem požiadavkou, ktorá vylučuje Supabase.

Kým ani jeden nenastal, Graphiti rieši problém, ktorý ešte nemáš.

**Zamietnuté alternatívy a prečo:** vlastná implementácia grafu = presne to, čo
navrhujem (`entity_edges`), len bez ambície volať to frameworkom. GraphRAG
(Microsoft) je batch-orientovaný, drahý na re-indexáciu, navrhnutý pre statické
korpusy — tvoje dáta sa menia denne. Mem0 je conversational memory pre chatboty,
nie organizačná pamäť firmy; jeho jednotka je „user", nie „obchod".

---

### Q2 — Je Neo4j produkčný databázový štandard?

**Odpoveď: NIE. Žiadna druhá produkčná databáza. Graf žije v Postgrese ako
`entity_edges` + rekurzívne CTE.**

Toto potvrdzuje tvoje existujúce uzamknuté rozhodnutie — nemením ho.

Prevádzkový argument, ktorý je pre teba rozhodujúci: plánovaný VPS je **Hetzner
CX22 (2 vCPU / 4 GB RAM) za ~5 €/mes.**, a už na ňom má bežať Docker + n8n +
Caddy. Neo4j Community je JVM aplikácia, ktorej rozumné minimum je ~2 GB RAM
(heap + page cache). To je koniec toho VPS. Nasleduje upgrade na väčší stroj,
teda ekonomika, kvôli ktorej si sa práve rozhodol odísť z n8n Cloudu, sa vráti
zadnými dverami.

**Poradie, ak by brána predsa padla** (aby si nemusel túto analýzu robiť znova):

1. **FalkorDB** — jeden kontajner, Redis-based, rádovo nižšia pamäťová stopa,
   podporovaný Graphitim. Pre jednočlenný tím jediná rozumná voľba.
2. **Neo4j Community** — najlepšia dokumentácia a nástroje, ale ops váha a
   1 inštancia bez klastrovania.
3. **Kuzu** — embedded, bez servera, výborný na read-heavy analytiku; slabší na
   súbežné zápisy, mladý projekt. Kandidát na offline analytické dávky, nie na
   produkčnú cestu.
4. **Memgraph** — in-memory, výkonný, ale pamäť je jeho cena a to je presne tvoj
   nedostatkový zdroj.
5. **Neo4j Enterprise** — licenčný náklad neúmerný 1 platiacemu zákazníkovi.

---

### Q3 — Čo je source of truth?

**Odpoveď: Supabase (Postgres). Vždy. Graf a vektory sú odvodená, kedykoľvek
znovu-postaviteľná projekcia.**

Platí tvoj prvý diagram: `Supabase → Events → Memory Pipeline → Knowledge Graph`.

**Invariant, ktorý to drží pravdivé (a je testovateľný):**

> Zmaž celý graf a všetky embeddingy. Systém musí byť schopný ich obnoviť
> jedným príkazom z `memory_events` a domain tabuliek, s identickým výsledkom.

Tento test píš ako CI test hneď v prvom PR (`rebuild()` → porovnanie počtu
faktov a hrán). V momente, keď prestane prechádzať, si nepozorovane vytvoril
druhý source of truth a architektúra sa začne rozpadať.

Tri dôvody, prečo je to neprerokovateľné:

- **GDPR výmaz.** Jedna žiadosť o výmaz = jedno miesto na zmazanie + rebuild.
  Pri dvoch autoritatívnych úložiskách je výmaz distribuovaná transakcia a ty
  ju nemáš ako auditovať.
- **Multi-tenancy.** RLS máš vyriešenú v Postgrese. Druhé autoritatívne úložisko
  = druhá implementácia izolácie tenantov = najpravdepodobnejší zdroj úniku dát
  medzi kanceláriami.
- **Vymeniteľnosť.** Ak je graf odvodený, výmena graph enginu je víkendová
  práca. Ak je autoritatívny, je to migračný projekt na mesiace.

---

### Q4 — Chcete Event Sourcing?

**Odpoveď: NIE plný Event Sourcing. ÁNO append-only event log vedľa CRUD —
vzor „transactional outbox".**

Plný ES (stav = fold eventov, žiadne mutovateľné tabuľky) by znamenal prepísať
~80+ call sites nad `leads`, vzdať sa priamych SQL dotazov, riešiť snapshoty a
verzovanie eventov. Pre solo foundera je to niekoľkotýždňová prestávka v obchode
výmenou za elegantnosť.

**Čo navrhujem namiesto toho:**

- Doménové tabuľky (`leads`, `deal_outcomes`, `contacts`) zostávajú autoritatívne
  a normalizované — nič sa neprepisuje.
- Každá doménová zmena zapíše **v tej istej transakcii** riadok do
  `memory_events`. Nie cez trigger na aplikačnej logike, ale explicitne v service
  vrstve — trigger nevie, kto a prečo zmenu urobil, a `actor` + `prečo` sú presne
  tie stĺpce, kvôli ktorým to celé staviame.
- Worker číta nespracované eventy a projektuje ich do `memory_facts` a
  `entity_edges`.

Dostaneš 90 % hodnoty ES — replayovateľnú históriu, audit, znovupostaviteľné
projekcie, „prečo systém povedal toto v marci" — za ~10 % ceny. A keby si o rok
chcel plný ES, event log už existuje a je to potom evolúcia, nie prepis.

**Jediná časť, kde trvám na disciplíne:** event sa zapisuje v **tej istej
transakcii** ako doménová zmena. Ak sa zapisuje „potom" alebo cez webhook,
budeš mať tichú stratu eventov a projekcia sa rozíde s realitou — to je presne
trieda incidentu z 22.07 (kód pred migráciou), len ťažšie odhaliteľná.

---

### Q5 — Aké typy pamäte budú produkčne?

**Odpoveď: jedno fyzické úložisko, typy sú diskriminátor a namespace — nie 8
subsystémov. A nestavaj všetkých 8, stavaj 3.**

Osem „pamätí" ako osem systémov = osem schém, osem pipeline, osem miest na
chybu, jeden človek. Fyzicky sú to tie isté tri tabuľky s `subject_type`.

**Priorita podľa moat hodnoty (nie podľa toho, ako dobre to znie):**

| Pamäť | Moat | Dáta už tečú? | Verdikt |
|---|---|---|---|
| **Deal Memory** (výsledky, dôvody prehry) | **najvyšší** — nikto iný ho nemá | áno (`deal_outcomes`) | **Brána 0 — stavaj** |
| **Customer / Relationship Memory** | vysoký | áno (`leads`, `lead_consents`) | **Brána 0 — stavaj** |
| **Decision Memory** (firemné rozhodnutia) | vysoký, ale interný | áno (`brain/`, markdown) | **Brána 0 — len index, markdown ostáva kanonický** |
| Communication Memory (emaily, hovory) | vysoký | čiastočne | Brána 1 |
| Property Memory (nehnuteľnosti, cenová história) | stredný | čiastočne | Brána 1 |
| Organizational / Project Memory | stredný, interný | áno | Brána 1 — nízka priorita, nepredáva |
| **Market Memory** | **žiadny** | ŠÚ SR / NBS | **Nestavaj ako pamäť** |
| Legal Memory | nízky, malý objem | markdown | Nestavaj — markdown stačí |

**Market Memory rozvediem, lebo je to najlákavejšia pasca v tomto zozname:**
dáta ŠÚ SR a NBS si vie stiahnuť ktokoľvek. Uložiť ich do „pamäte" nevytvára
žiadnu neskopírovateľnosť — je to cache verejného datasetu. Neskopírovateľné je
až **spojenie** trhových dát s tvojimi výsledkami: *„v tejto lokalite sa
odhad −7 % oproti našej kalkulačke predáva o 40 dní rýchlejšie."* To je odvodený
insight nad Deal Memory, nie samostatná pamäť. Ostáva to `regional-prices.json`
plus výpočet.

---

### Q6 — Má byť Memory Constitution povinná?

**Odpoveď: ÁNO povinná — ale ako jedna zapisovacia cesta a schéma validácia,
nie ako LLM sudca v synchrónnej ceste.**

Platí tvoj diagram `Event → Guardian → Constitution → Memory`, s jednou
zásadnou opravou: **Guardian je asynchrónny audítor nad logom, nie synchrónna
brána.** Ak Guardian volá LLM pri každom zápise, kúpil si si latenciu, náklad a
nový zdroj výpadku — a v deň, keď má OpenAI incident, prestane tvoj CRM
zapisovať leady. To je neprijateľná väzba.

**Constitution = 7 invariantov vynútených schémou a DB constraintmi:**

- **K1** `agency_id` povinné, nikdy NULL, vždy RLS-filtrované.
- **K2** Provenance povinná — každý fakt vie `source_event`, `actor`, `origin`.
- **K3** `occurred_at` ≤ `now() + 5 min` — žiadne eventy z budúcnosti.
- **K4** `payload` validovaný Zod schémou podľa `event_type`; neznámy typ →
  dead-letter, nikdy tichý zápis.
- **K5** Pre `subject_type ∈ (lead, contact)` povinný `consent_basis` a
  `retention_class`.
- **K6** AI-generovaný fakt má `origin='ai'`, `canonical=false`, `confidence<1.0`
  a **nikdy sa nestane kanonickým bez ľudského potvrdenia alebo potvrdenia
  výsledkom obchodu.**
- **K7** Idempotencia — `(event_type, subject_id, dedupe_key)` unikátne; retry
  nesmie duplikovať fakt.

Priame zápisy do grafu sú **nemožné konštrukciou**, nie zakázané pravidlom:
projekčné tabuľky sú zapisovateľné len service-role kľúčom, ktorý má jedine
worker. Pravidlo, ktoré vynucuje len dokument, sa raz o polnoci poruší.

**K6 je najdôležitejší riadok v celom ADR.** Bez neho systém po pár mesiacoch
číta vlastné dohady ako fakty a ty stratíš dôveru vo vlastnú pamäť — a to je
jediná porucha, z ktorej sa tento produkt nevie zotaviť.

---

### Q7 — Má sa ukladať úplne každý AI rozhovor?

**Odpoveď: NIE. Ukladaj rozhodnutia, meetingy, emaily, commity a CRM udalosti.
Z AI rozhovorov ukladaj *výstup*, nie prepis.**

Dvojvrstvový model:

- **Raw epizóda** — `retention_class='raw_ttl'`, TTL 90 dní. Slúži na
  debugovanie a na re-extrakciu, keď zlepšíš pipeline.
- **Destilát** — rozhodnutie, fakt, artefakt, akcia. Permanentný.

Tri dôvody proti ukladaniu všetkého:

1. **Retrieval sa otráví.** Prepisy majú nízku hustotu signálu; v embedding
   priestore vytláčajú dôležité fakty. Menej dobrých dokumentov poráža viac
   priemerných — toto je najčastejšia príčina, prečo RAG systémy v praxi
   nefungujú.
2. **GDPR.** Prepisy o klientoch sú osobné údaje s povinnosťou výmazu. Každá
   ďalšia kópia je ďalšie miesto, ktoré musíš pri žiadosti prehľadať.
3. **Náklad.** Embedovanie a re-embedovanie všetkého je opakujúca sa mesačná
   položka za dáta, ktoré nikto nikdy nevyhľadá.

Výnimka: rozhovor označený „pin" sa uloží celý natrvalo. Nech je to explicitné
gesto, nie default.

---

### Q8 — Aký retrieval bude finálny?

**Odpoveď: súhlasím so smerom, nesúhlasím s poradím. A pre dnešný objem dát je
plný hybrid predčasný.**

Tvrdé pravidlo, ktoré platí pred akoukoľvek optimalizáciou:

> **Najprv eval set, potom retrieval.** 50 reálnych otázok s očakávanou
> odpoveďou (`evals/memory/questions.jsonl`). Bez neho je ladenie retrievalu
> viera, nie inžinierstvo — nevieš povedať, či zmena pomohla alebo uškodila.

**Poradie podľa pomeru prínos/náklad:**

1. **Štruktúrovaný SQL filter + keyword (BM25)** — `tenant`, `subject`, čas.
   Pri ~440 kontaktoch rieši veľkú väčšinu reálnych otázok. Najlacnejšie,
   deterministické, vysvetliteľné.
2. **Vektor (pgvector, HNSW)** — a to **nad destilátmi, nie nad raw chunkami**.
3. **Fúzia cez RRF** (Reciprocal Rank Fusion) — nudné, bez ladenia váh, funguje.
4. **Recency decay + provenance boost** — `origin='human'` a `canonical=true`
   majú prednosť pred AI dohadom.
5. **Graph expansion (1–2 hopy)** — ako *rozšírenie a preskórovanie* kandidátov,
   nie ako primárny vyhľadávač.
6. **Cross-encoder rerank** — až keď eval ukáže, že kvalita je stále nedostatočná.

Kroky 5 a 6 sú za bránou 3 zákazníkov. Kroky 1–3 majú zmysel hneď, lebo sú to
tie isté indexy, ktoré potrebuješ na bežné produktové vyhľadávanie.

Odchýlka od tvojho návrhu: „Decision Memory" a „Summary Memory" nie sú
samostatné retrievery. Sú to filtre nad jedným indexom (`subject_type`,
`layer`). Samostatné retrievery = N systémov na ladenie a N miest, kde sa
skóre nedá porovnať.

---

### Q9 — Budeme mať Multi-Agent Learning?

**Odpoveď: ÁNO jedna zdieľaná organizačná pamäť. NIE viacero agentov teraz.**

Architektúra to musí umožniť, ty to teraz nemáš stavať — rolové agenty sú
explicitne za bránou 3 zákazníkov a nič sa tým nemení.

Ako to navrhnúť, aby to o rok fungovalo:

- **Čítanie široké, zápis úzky.** Každý agent má `write_scope` (množinu
  `event_type`, ktoré smie produkovať). Guardian nesmie zapisovať obchodné
  závery, Sales agent nesmie zapisovať systémové poplachy.
- **Provenance na každom fakte** — `agent_id`, `model_version`, `prompt_version`,
  `confidence`. Keď o pol roka zistíš, že jeden agent dva mesiace produkoval
  nezmysly, vieš jedným `UPDATE` invalidovať presne jeho fakty. Bez týchto
  stĺpcov je to nemožné a jediná záchrana je zahodiť pamäť.

**Riziko, ktoré musím pomenovať — otrava spätnou väzbou.** Agenti čítajúci
vlastné neoverené výstupy ako fakty vytvárajú sebapotvrdzujúci drift: systém je
čoraz sebavedomejší a čoraz nesprávnejší. Poistka je K6 — AI fakty nie sú
kanonické, kým ich nepotvrdí človek alebo výsledok obchodu. Táto poistka musí
existovať **pred** prvým agentom, nie po prvom incidente.

---

### Q10 — Má sa pamäť sama reorganizovať?

**Odpoveď: ÁNO rebrík Raw → Summary → Concept → Knowledge → Playbook. Ale
automaticky len prvé dva stupne, a dávkovo, nie priebežne.**

| Prechod | Režim | Prečo |
|---|---|---|
| Raw → Summary | automatický, nočná dávka, lacný model | deterministické, nízke riziko |
| Summary → Concept | automatický návrh + **ľudské schválenie** | koncept je tvrdenie o svete |
| Concept → Knowledge | **len dôkazom** (viď nižšie) | tu vzniká alebo umiera dôvera |
| Knowledge → Playbook | človek píše, AI navrhuje | playbook riadi správanie voči zákazníkom |

**Kritérium povýšenia na Knowledge — a toto je jadro moatu:**
vzor sa stane znalosťou, keď je pozorovaný **≥5×** naprieč **≥2 kanceláriami**,
**ALEBO** je potvrdený **výsledkom obchodu** (`deal_outcomes`).

Nie „keď to LLM zhrnie". Zhrnutie nie je dôkaz. Znalosť viazaná na výsledok je
neskopírovateľná; znalosť viazaná na sumarizáciu je preformulovaný priemer
internetu, ktorý má konkurencia tiež.

Dve prevádzkové poistky:
- Re-sumarizuj **len zmenené partície** (dirty flag). Nočná re-sumarizácia
  všetkého je tichá mesačná faktúra, ktorá rastie s úspechom produktu.
- Každý povýšený artefakt si drží odkazy na zdrojové fakty. Neodôvodniteľná
  znalosť sa nesmie objaviť v odpovedi zákazníkovi.

---

### Q11 — Aká je hranica projektu?

**Odpoveď: Claude = architektúra, kontrakty a review. Cursor / Ruflo Swarm =
produkčný kód. Tento model ti funguje, nemeň ho.**

Konkrétne, čo dodávam ja:

- ADR a rozhodnutia (`docs/architecture/`, `memory/decisions.md`),
- **SQL migrácie** (sú kontrakt, nie implementácia — viď §4),
- **TypeScript rozhrania a Zod schémy** (`MemoryStore`, event typy),
- eval harness a fixtures,
- premortem, kill kritériá, PR review checklist,
- prompty pre Cursor/Ruflo, jeden na PR.

Čo dodáva Cursor/Ruflo: implementácia workerov, API routes, UI, testy,
observability — na branchi, cez PR, s CI.

**Tvrdé obmedzenie tejto session, aby si s tým rátal:** bežím v cloude a **nemám
prístup** k `C:\RealitkaAI`, k Supabase, ani k n8n. Čokoľvek, čo tu napíšem ako
produkčný kód, je **neoverené** — nespustím test, nepozriem schému, neuvidím
existujúce typy. Preto dodávam kontrakty a migrácie (tie sa dajú prečítať a
schváliť očami) a nie 5 000 riadkov aplikačného kódu, ktorý by si musel debugovať
ty. Ak chceš, aby som písal produkčný kód, potrebujem prístup k repu — inak je
Cursor jednoznačne lepší nástroj na túto časť.

---

### Q12 — Má byť prompt „one-shot"?

**Odpoveď: ani jedno. 6 promptov = 6 samostatne mergovateľných PR. Nie jeden,
nie tridsať.**

- **One-shot** na systém tejto veľkosti = neskontrolovateľný diff a garantovaný
  drift. Keď v ňom niečo nefunguje, nemáš čo bisektovať.
- **30 promptov + orchestrátor + 5 auditov** = druhý produkt, ktorý musíš
  udržiavať. A je to presne tá vrstva (rolové agenty, orchestrácia), ktorá je za
  bránou 3 zákazníkov. Postavil by si meta-nástroj namiesto produktu.

**Navrhovaná postupnosť — každý PR samostatne mergovateľný, testovateľný a
revertovateľný:**

| PR | Obsah | Rizikovosť |
|---|---|---|
| **PR-1** | Migrácia: `memory_events`, `memory_facts`, `entity_edges`, RLS, indexy | nízka, aditívna |
| **PR-2** | Zod schémy event typov + `memory.ingest()` + Constitution K1–K7 + dead-letter | nízka |
| **PR-3** | Outbox zápis na 3 miestach (lead created, deal won/lost, consent) | **stredná — dotýka sa PROD ciest** |
| **PR-4** | Projekčný worker + `rebuild()` + CI test znovupostaviteľnosti | nízka |
| **PR-5** | Retrieval v1 (SQL + keyword + vektor + RRF) + eval harness 50 otázok | nízka |
| **PR-6** | Observability: lag projekcie, dead-letter alert, náklad na embeddingy | nízka |

Audity (architecture / QA / performance / security) nie sú samostatné prompty
s personami, ale **brány medzi PR-mi**: checklist v PR template. Persona
neprináša viac ako checklist, ale stojí ďalší beh a ďalší kontext.

PR-3 je jediný, kde je riziko produkčného incidentu, a je to presne trieda
incidentu z 22.07. Preto: migrácia (PR-1) musí byť nasadená a overená **pred**
PR-3, a nikdy nie v jednom nasadení — pravidlo atomicity z
`.cursor/rules/architecture.mdc` tu platí doslova.

---

## 3. Zhrnutie 12 rozhodnutí

| # | Otázka | Rozhodnutie |
|---|---|---|
| 1 | Graphiti finálne? | **Nie.** Prevziať dátový model (epizóda/entita/bi-temporálny fakt), knižnicu nie. Návrat na meratelný spúšťač. |
| 2 | Neo4j štandard? | **Nie.** Žiadna druhá DB. Graf = `entity_edges` v Postgrese. Ak niekedy, tak FalkorDB. |
| 3 | Source of truth? | **Supabase.** Graf a vektory sú odvodené a znovupostaviteľné. CI test to vynucuje. |
| 4 | Event Sourcing? | **Nie plný.** Append-only log + transactional outbox vedľa CRUD. |
| 5 | Typy pamäte? | **Jedno úložisko, 3 typy do produkcie:** Deal, Customer, Decision. Market Memory nestavať. |
| 6 | Constitution povinná? | **Áno**, ako jedna zapisovacia cesta + 7 invariantov. Guardian asynchrónny, nie synchrónna brána. |
| 7 | Ukladať každý rozhovor? | **Nie.** Raw s TTL 90 dní, destilát permanentne. |
| 8 | Retrieval? | **Súhlas so smerom, iné poradie.** Najprv eval set. SQL+BM25 → vektor → RRF. Graf a rerank za bránou. |
| 9 | Multi-agent learning? | **Áno zdieľaná pamäť, nie agenti teraz.** Provenance a `write_scope` od začiatku. |
| 10 | Samoreorganizácia? | **Áno rebrík**, automaticky len Raw→Summary. Povýšenie na Knowledge len dôkazom (≥5× / ≥2 kancelárie / výsledok obchodu). |
| 11 | Hranica projektu? | **Claude = architektúra a kontrakty. Cursor/Ruflo = kód.** Táto session nemá prístup k repu. |
| 12 | One-shot prompt? | **Nie.** 6 promptov = 6 mergovateľných PR. Audity ako brány, nie ako persony. |

---

## 4. Kontrakty (schváliť očami, implementovať v Cursore)

> Nižšie uvedené SQL a TypeScript sú **návrh kontraktu**, nie overený kód —
> nemal som prístup k živej schéme. Pred aplikáciou nech Cursor overí názvy
> existujúcich tabuliek (`agencies`, `leads`, `deal_outcomes`) a `vector`
> dimenziu podľa reálne používaného embedding modelu.

### 4.1 Migrácia — event log

```sql
-- rozšírenia
create extension if not exists vector;
create extension if not exists pg_trgm;

-- 1) append-only event log (transactional outbox)
create table if not exists memory_events (
  id              bigserial primary key,
  event_uuid      uuid not null default gen_random_uuid() unique,
  agency_id       uuid not null references agencies(id) on delete cascade,
  occurred_at     timestamptz not null,               -- kedy sa to stalo vo svete
  recorded_at     timestamptz not null default now(), -- kedy sme to zapísali
  actor_type      text not null check (actor_type in ('human','system','ai')),
  actor_id        text,
  agent_id        text,                               -- pre budúce rolové agenty
  event_type      text not null,                      -- 'lead.created', 'deal.won', ...
  subject_type    text not null,                      -- lead|contact|property|deal|decision
  subject_id      text not null,
  payload         jsonb not null,
  schema_version  int  not null default 1,
  dedupe_key      text,                               -- K7 idempotencia
  consent_basis   text,                               -- K5 GDPR
  retention_class text not null default 'standard'
                  check (retention_class in ('raw_ttl','standard','permanent')),
  processed_at    timestamptz,
  process_error   text,
  constraint memory_events_not_future
    check (occurred_at <= recorded_at + interval '5 minutes')   -- K3
);

create unique index if not exists memory_events_dedupe
  on memory_events (agency_id, event_type, subject_id, dedupe_key)
  where dedupe_key is not null;                                  -- K7

create index if not exists memory_events_agency_time
  on memory_events (agency_id, occurred_at desc);
create index if not exists memory_events_unprocessed
  on memory_events (id) where processed_at is null;
create index if not exists memory_events_subject
  on memory_events (agency_id, subject_type, subject_id);

alter table memory_events enable row level security;
```

### 4.2 Migrácia — fakty (bi-temporálne) a hrany

```sql
-- 2) fakty: odvodené, znovupostaviteľné, bi-temporálne
create table if not exists memory_facts (
  id            bigserial primary key,
  agency_id     uuid not null references agencies(id) on delete cascade,
  subject_type  text not null,
  subject_id    text not null,
  predicate     text not null,     -- 'motivacia','cenove_ocakavanie','dovod_prehry'
  object_text   text,
  object_json   jsonb,
  valid_from    timestamptz not null,
  valid_to      timestamptz,       -- NULL = stále platí; fakt sa NEMAŽE, invaliduje sa
  confidence    numeric(3,2) not null default 1.00 check (confidence between 0 and 1),
  origin        text not null check (origin in ('human','system','ai')),   -- K6
  canonical     boolean not null default false,                            -- K6
  model_version text,
  prompt_version text,
  layer         text not null default 'fact'
                check (layer in ('raw','summary','concept','knowledge','playbook')),
  source_event  bigint not null references memory_events(id) on delete cascade, -- K2
  embedding     vector(1536),
  created_at    timestamptz not null default now(),
  constraint memory_facts_ai_not_canonical
    check (not (origin = 'ai' and canonical = true and confidence >= 1.00))  -- K6
);

create index if not exists memory_facts_current
  on memory_facts (agency_id, subject_type, subject_id) where valid_to is null;
create index if not exists memory_facts_pred
  on memory_facts (agency_id, predicate) where valid_to is null;
create index if not exists memory_facts_embedding
  on memory_facts using hnsw (embedding vector_cosine_ops);
create index if not exists memory_facts_text_trgm
  on memory_facts using gin (object_text gin_trgm_ops);

alter table memory_facts enable row level security;

-- 3) hrany: graf bez druhej databázy
create table if not exists entity_edges (
  id           bigserial primary key,
  agency_id    uuid not null references agencies(id) on delete cascade,
  src_type     text not null, src_id text not null,
  rel          text not null,          -- 'owns','interested_in','represented_by','similar_to'
  dst_type     text not null, dst_id text not null,
  weight       numeric(6,3) not null default 1.0,
  valid_from   timestamptz not null default now(),
  valid_to     timestamptz,
  source_event bigint not null references memory_events(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create index if not exists entity_edges_src
  on entity_edges (agency_id, src_type, src_id) where valid_to is null;
create index if not exists entity_edges_dst
  on entity_edges (agency_id, dst_type, dst_id) where valid_to is null;

alter table entity_edges enable row level security;
```

RLS politiky nech kopírujú existujúci vzor z `leads` — nevymýšľaj druhý.
Zápis do `memory_facts` a `entity_edges` výhradne service-role (worker).

### 4.3 Rozhranie (jediné miesto, cez ktoré sa píše a číta)

```ts
// apps/crm/lib/memory/types.ts

export type Origin = 'human' | 'system' | 'ai';
export type Layer = 'raw' | 'summary' | 'concept' | 'knowledge' | 'playbook';

export interface SubjectRef { type: string; id: string }

export interface MemoryEventInput {
  agencyId: string;
  occurredAt: Date;
  actor: { type: Origin; id?: string; agentId?: string };
  eventType: string;                 // validované proti registru Zod schém
  subject: SubjectRef;
  payload: unknown;                  // validované schémou pre eventType (K4)
  dedupeKey?: string;                // K7
  consentBasis?: string;             // K5
  retentionClass?: 'raw_ttl' | 'standard' | 'permanent';
}

export interface MemoryQuery {
  agencyId: string;
  query: string;
  subjectTypes?: string[];
  layers?: Layer[];
  asOf?: Date;                       // bi-temporálny dotaz: "čo sme vedeli v marci"
  limit?: number;
}

export interface MemoryHit {
  factId: string;
  subject: SubjectRef;
  predicate: string;
  text: string;
  validFrom: Date;
  validTo: Date | null;
  confidence: number;
  origin: Origin;
  canonical: boolean;
  sourceEventId: string;             // bez zdroja sa hit nesmie zobraziť
  score: number;
}

export interface MemoryStore {
  /** Jediná zapisovacia cesta. Musí bežať v tej istej transakcii ako doménová zmena. */
  ingest(e: MemoryEventInput, tx?: unknown): Promise<{ eventId: string }>;

  /** Hybridné vyhľadanie (SQL filter + keyword + vektor, fúzia RRF). */
  search(q: MemoryQuery): Promise<MemoryHit[]>;

  /** Kontext pre subjekt — to, čo dostane AI do promptu pred prácou. */
  context(agencyId: string, s: SubjectRef, asOf?: Date): Promise<MemoryHit[]>;

  /** Znovupostavenie projekcií z event logu. Chránené CI testom. */
  rebuild(agencyId: string, fromEventId?: number): Promise<{
    events: number; facts: number; edges: number; durationMs: number;
  }>;
}
```

### 4.4 Traverz grafu bez graph databázy (2 hopy)

```sql
-- "ktoré entity súvisia s týmto kontaktom do 2 hopov"
with recursive walk (node_type, node_id, hop, path) as (
  select $2::text, $3::text, 0, array[$2 || ':' || $3]
  union all
  select e.dst_type, e.dst_id, w.hop + 1, w.path || (e.dst_type || ':' || e.dst_id)
  from walk w
  join entity_edges e
    on e.agency_id = $1
   and e.src_type  = w.node_type
   and e.src_id    = w.node_id
   and e.valid_to is null
  where w.hop < 2
    and not (e.dst_type || ':' || e.dst_id) = any(w.path)   -- bez cyklov
)
select distinct node_type, node_id, min(hop) as hop
from walk where hop > 0
group by node_type, node_id
order by hop;
```

Toto je celá „graph databáza", ktorú pri tvojom objeme potrebuješ. Zmeraj p95.
Ak prekročí 300 ms na reálnych dátach, otvor Q1 znova — s číslom v ruke.

---

## 5. Brány a kill kritériá (Strategic Bet podľa klasifikácie v2)

> **STAV: BET KILLED 2026-08-10 rozhodnutím D-2026-08-10-01.**
> Kritériá nižšie sú historické — viď memory/decisions.md.

Memory Engine je podľa tvojej vlastnej klasifikácie **Strategic Bet**: nemá
zákaznícky signál pred buildom, je to sázka na North Star. Preto podľa
`FOUNDER.md`: max 1 otvorený, timebox, kill kritériá zapísané **pred prvým
commitom** — čo je tento dokument.

**Brána 0 — teraz (kompatibilné s capture-now, timebox 3 dni):**
PR-1 až PR-4. Event log, Constitution, outbox na 3 miestach, worker, rebuild
test. Žiadny nový runtime, žiadna nová DB, žiadny LLM v zapisovacej ceste.

**Brána 1 — po 50-otázkovom eval sete:**
PR-5 (retrieval v1) a PR-6 (observability). Communication a Property Memory.

**Brána 2 — 3 platiaci zákazníci:**
Graph engine (ak spúšťač z Q1 padne), rolové agenty, samoreorganizácia nad
stupeň Summary, playbooky, Luna, cross-tenant vzory.

**Kill kritériá pre Bránu 0 — ak nastane ktorékoľvek, projekt sa zastaví a
vyhodnotí (promote / re-bet / kill):**

- PR-1..PR-4 nie sú zmergované do **6.8.** (po dokončení n8n VPS migrácie).
- Projekcia spôsobí čo i len jeden incident na zákazníckych dátach.
- Latencia zápisu leadu (widget → DB) vzrastie o **>50 ms** p95.
- Obchodná aktivita klesne pod **1 obchodnú akciu denne** počas práce na tomto.
- Do **1.9.** nevznikol eval set — znamená to, že pamäť nikto reálne nepoužíva.

---

## 6. Následky pre existujúcu dokumentáciu

Ak toto schválíš, treba **v tom istom commite** opraviť tri miesta, inak vzniknú
ďalšie rozpory typu „brána pre VPS":

1. **`COMPANY.md`, sekcia „Čo je odložené a za akou bránou"** — spresniť, že
   *odvodená pamäťová vrstva (event log + fakty + `entity_edges`) nie je za
   bránou 3 zákazníkov*; za bránou zostáva graph engine, rolové agenty a
   samoreorganizácia nad Summary.

2. **`COMPANY.md`, brána pre VPS** (tvoja úloha z prenosového sumáru) — doplniť
   tretí spúšťač. Navrhované znenie:
   > VPS + lokálne modely → brána **API náklady >200 €/m ALEBO on-prem
   > požiadavka zákazníka ALEBO ekonomika prevádzky externej automatizácie
   > (koniec trialu / limit behov)**.

3. **Prenosový sumár, sekcia 5** — riadok *„Neo4j zamietnutý"* rozšíriť na
   *„Neo4j zamietnutý; graf v Postgrese (`entity_edges`); prehodnotenie len na
   meratelný spúšťač podľa ADR 2026-07-28."*

---

## 7. Čo potrebujem od teba (a čo nepotrebujem)

**Nepotrebujem** ďalšie architektonické otázky — 12 je zodpovedaných a ďalšia
vrstva analýzy pred prvým commitom je presne to, pred čím varuje anti-dokument
pravidlo.

**Potrebujem tri GO/NIE-GO:**

- **GO 1** — Brána 0 (PR-1..PR-4) ide, timebox 3 dni, kill kritériá podľa §5.
- **GO 2** — poradie voči obchodu: ide to **po** Simi Real opt-oute v živej n8n
  a **po** n8n VPS migrácii (termín ~5.8.), alebo pred nimi?
- **GO 3** — oprava troch miest v dokumentácii podľa §6.

---

## 8. Task-loop

**ODOMKLO:** kontrakt pamäťovej vrstvy, ktorý je kompatibilný s capture-now a
nevytvára nezvratný dlh; meratelné spúšťače namiesto názorov pri graph engine;
kill kritériá pre Strategic Bet zapísané pred prvým commitom.

**ODHALILO:** `SYSTEM_USAGE_AGENCY_ID` = Smolkovo `agency_id` (úloha 12) je
blokátor tohto ADR, nie samostatná úloha — systémové eventy by tiekli do
zákazníckej pamäte a znečistili by prvý dataset moatu. Treba to vyriešiť v PR-1,
nie neskôr.

**ĎALŠIA ÚLOHA (jedna, pripravená na štart):**
**PR-1 — migrácia `memory_events` + `memory_facts` + `entity_edges` + RLS +
oddelenie `SYSTEM_USAGE_AGENCY_ID`.** Aditívna, reverzibilná, nedotýka sa
zapisovacích ciest, dá sa nasadiť a nechať ležať bez efektu. Prompt pre Cursor
pripravím na tvoje GO.

**Príležitosť (rozhodnutie tvoje, len ukazujem):** `valuation_estimates`
(úloha 11 z prenosového sumáru) je ten istý problém ako Deal Memory — odhady sa
neukladajú, teda každý deň nezachytených odhadov je natrvalo stratený moat.
Ak ide Brána 0, `valuation_estimates` by mala ísť ako súčasť PR-3, nie ako
samostatný Build Package o mesiac.
