# TASK: DOPYTY — z mŕtvych dát na zákazky

**Pre:** Cursor agent
**Repo:** `onlinovosk-bit/RealitkaAI` · main po backfille (#528/#529)
**Merge:** NIKDY agentom. Tri samostatné PR, merguje founder.
**Poradie:** A → B → C. **A a B sa nekrížia, môžu ísť paralelne.** C až po A.

---

## 0. Stav po backfille (overené v produkcii 2026-09-04)

```
properties (Smolko)   132     Ostatné 0 · Neznáme 0
  Predaj               68
  Prenájom             53
  Dopyt                11     ← inzeráty, ktorými kancelária HĽADÁ nehnuteľnosti

leads (Smolko)        448
  z toho s kritériami    9     property_type/budget/location vyplnené
  bez kritérií         439     Realvia import — VŠETKY štyri polia prázdne
```

Párovací engine skóruje podľa typu, lokality a rozpočtu. **439 leadov nemá ani jedno
z toho.** Preto sa párovanie v tomto zadaní nespúšťa — nemá palivo.

Tých 11 dopytov je jediný zdroj dopytu s kritériami, ktorý dnes existuje.

---

# PR A — verejná stránka `/hladame`

**Branch:** `feat/hladame-verejne-dopyty`
**PR:** `feat(public): "Máme kupca" demand page with seller lead capture`
**Prečo prvé:** Smolko nepotrebuje kupujúcich, potrebuje zákazky. Toto je jediná
vec v celom zadaní, ktorá privádza **predávajúcich**.

## Čo to je

Verejná stránka `app/(public)/hladame/page.tsx`, ktorá vypíše nehnuteľnosti
s `transaction_type = 'Dopyt'` — teda konkrétnych kupujúcich, ktorých kancelária
už má. Pri každom tlačidlo **„Mám takúto nehnuteľnosť"**.

```
Hľadáme 3-izbový byt · Prešov · do 150 000 €      [Mám takúto nehnuteľnosť]
Hľadáme rodinný dom · Sabinov a okolie            [Mám takúto nehnuteľnosť]
Hľadáme sklad pre podnikanie · do 50 000 €        [Mám takúto nehnuteľnosť]
```

Formulár posiela na **existujúci** `/api/leads/inbound` (slug + token, honeypot,
rate limit, povinný súhlas — všetko už funguje). Od PR #521 z neho odchádza
automatická odpoveď. **Nepíš nový endpoint.**

Do `note` daj odkaz na konkrétny dopyt (`dopyt=<property.id>`), nech maklér vie,
na ktorý dopyt človek reaguje.

## Čo zobraziť a čo nie

**Zobraz:** typ, transakciu (vždy „Hľadáme"), rozpočet ak `price > 0`, a **titulok
inzerátu tak, ako je** — je to Smolkov vlastný text, už verejne publikovaný na Realvii.

**Nezobrazuj:** nič, čo v tých záznamoch nie je. Päť z 11 má `price = 0` — pri nich
rozpočet jednoducho vynechaj. **Nedopĺňaj „dohodou" ani žiadnu inú vymyslenú
hodnotu** (AP-001).

**Lokalita:** 10 z 11 má `location = '-'` a payload nemá `city` ani `locality`.
Mesto je len v texte titulku. **Neparsuj ho** — je to odvodzovanie z názvu, ktoré
nás už raz stálo 53 zle označených prenájmov (AP-005). Titulok mesto obsahuje,
človek si ho prečíta.

## Tenant scope

Stránka je verejná a beží cez admin klienta. **Musí** filtrovať na jednu agentúru
explicitne — nespoliehaj sa na RLS. Pozri, ako to rieši `(public)/nehnutelnosti`,
a rob to rovnako. Pri chýbajúcom agency scope **fail closed** (prázdna stránka),
nie „ukáž všetko". Dôvod: incident `docs/reports/2026-09-03-realvia-cross-tenant-source-id.md`.

## Akceptačné kritériá
- [ ] `/hladame` vypíše presne 11 záznamov, žiadnu ponuku na predaj/prenájom
- [ ] pri `price = 0` sa rozpočet nezobrazí a nenahradí sa ničím
- [ ] formulár vytvorí lead cez `/api/leads/inbound` s `dopyt=<id>` v `note`
- [ ] odíde automatická odpoveď (v teste mockovaná)
- [ ] bez agency scope stránka nevypíše nič
- [ ] cookie banner a GA fungujú (dedí `(public)` layout z #525)

---

# PR B — inbound formulár prestane vymýšľať kritériá

**Branch:** `fix/inbound-lead-no-invented-criteria`
**PR:** `fix(leads): stop writing invented criteria on inbound leads`
**Súbor:** `app/api/leads/inbound/route.ts`

## Problém

Insert dnes obsahuje natvrdo:

```ts
property_type: "Byt",
financing: "Hypotéka",
rooms: "",
budget: "",
location: "",
```

Formulár sa na typ ani na financovanie nepýta. Zapisujeme zákazníkovi do CRM
údaje, ktoré nikto nepovedal — to je AP-001 a je to ten istý vzor, ktorý sme
v PR #523 opravili v Sprievodcovi (`rooms: "2 izby"`).

Dôsledok: každý lead z formulára je rovnako nepárovateľný ako tých 439 z importu,
navyše s falošným „Byt".

## Čo urob

`property_type` a `financing` nastav na `""`, kým sa na ne formulár nepýta.
Prejdi celý insert a v PR vymenuj **každé** ďalšie pole, ktoré sa vypĺňa bez
vstupu od používateľa.

**NEROB:** nepridávaj do formulára nové polia. To je samostatné rozhodnutie —
viac otázok znižuje konverziu a to sa rozhoduje s dátami, nie odhadom.

## Akceptačné kritériá
- [ ] žiadne vymyslené pole v inserte; test, ktorý to stráži
- [ ] existujúce testy route prechádzajú
- [ ] v PR zoznam všetkých polí, ktoré sa vypĺňajú bez vstupu

---

# PR C — dopyt → lead + buyer_intent + doplnenie maklérom

**Branch:** `feat/dopyt-to-buyer-intent`
**PR:** `feat(matching): convert demand adverts into leads with buyer intents`
**Závisí na:** PR A zmergovaný

## Cieľ

Dať párovaciemu enginu palivo. `buyer_intents` už existuje, Sprievodca ju plní,
`lib/matching.ts` vie skórovať. Chýba len obsah.

## C1 — konverzný skript `scripts/demand-to-buyer-intent.ts`

Pre každú nehnuteľnosť s `transaction_type = 'Dopyt'` vytvor lead + `buyer_intent`.

**Čo vieme a mapujeme:**

| buyer_intents | zdroj |
|---|---|
| `deal_type` | `"buy"` — Realvia kód 122 je kúpa |
| `property_type` | z `properties.type` (Byt/Dom/Komerčná/Pozemok → flat/house/commercial/land) |
| `budget_max` | `properties.price`, keď `> 0`; inak `0` |
| `raw_focus_text` | `properties.title` **doslovne**, neprepisovať |

**Čo NEVIEME a nesmieme vymyslieť:**

`primary_city` je `NOT NULL`, ale 10 z 11 má `location = '-'` a payload nemá
`city` ani `locality`. Mesto je iba v texte titulku.

→ **`primary_city = ''`.** Prázdny reťazec vyhovie `NOT NULL` a `lib/matching.ts`
má guard `if (!left || !right) return false`, takže prázdna lokalita ticho neskóruje.
**Titulok neparsuj.** To isté platí pre `budget_min`, `time_horizon_months`
(daj `"12+"` ako najkonzervatívnejšiu hodnotu a napíš to do PR), `new_build_only`
a `needs_mortgage_help` → `false`.

Lead: `source = "realvia_dopyt"`, `status = "Nový"`, meno = titulok skrátený,
kontakt prázdny (kupujúci je Smolkov klient, nie náš).

**Skript má `--dry-run` ako predvolený režim, `--agency-id` povinný, fail-closed
bez neho. Agent ho NESPÚŠŤA.** Rovnaké pravidlá ako pri backfille.

## C2 — obrazovka na doplnenie

`(dashboard)` stránka so zoznamom dopytov, kde má maklér doplniť **mesto** a
**rozpočet**. Jedenásť riadkov, dve polia. Desať minút práce.

Toto je zámerne prvá konkrétna úloha pre maklérov: ohraničená, zrozumiteľná
a hneď vidno výsledok — po doplnení začne párovanie fungovať.

Zobraz pri každom riadku titulok, aby maklér videl kontext. Ulož do `buyer_intents`,
nie do `properties`.

## C3 — čo sa v tomto PR NEROBÍ

```
spustenie recalculateAllMatches()
pridanie /api/cron/daily-match do vercel.json
notifikácie maklérom o zhodách
akékoľvek párovanie nad 439 leadov bez kritérií
```

Párovanie sa zapne až vtedy, keď bude aspoň päť dopytov doplnených o mesto —
a bude to samostatné rozhodnutie foundera po pohľade na výstup.

## Akceptačné kritériá
- [ ] dry-run vypíše 11 dopytov s tým, čo by sa zapísalo, a nič nezapíše
- [ ] test: `primary_city` je `''`, nikdy odvodené z titulku
- [ ] test: `budget_max = 0` pri `price = 0`, nikdy vymyslená hodnota
- [ ] obrazovka uloží mesto a rozpočet do `buyer_intents`
- [ ] žiadne DDL, žiadny nový stĺpec, žiadna nová tabuľka
- [ ] `pnpm test` + `pnpm build` zelené

---

## Latentná chyba na zapísanie (nie na opravu v tomto PR)

`lib/matching.ts`, `calculateLeadPropertyMatch`:

```ts
if (normalize(lead.propertyType) === normalize(property.type)) {
  score += 25;
  reasons.push("typ nehnuteľnosti sedí");
}
```

Prázdne sa rovná prázdnemu → +25 „typ sedí" pre dva neznáme typy. Po backfille
nemá žiadna nehnuteľnosť prázdny typ, takže to dnes nevybuchne. **Zapíš to ako
nález do PR C**, aby sa na to nezabudlo pred zapnutím párovania.
