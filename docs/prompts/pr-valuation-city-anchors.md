# CURSOR ZADANIE — mestské kotvy + priznané rozpätie

**Cieľová cesta:** `docs/prompts/pr-valuation-city-anchors.md`
**Nahrádza:** `pr-a2-valuation-band.md` *(to zadanie neposielaj — riešilo len prezentáciu
okolo zlej kotvy, čo dávalo pásmo 165–260 tisíc, teda nepoužiteľné)*
**Riziko:** HIGH — widget platiaceho zákazníka. Nasadzuje founder pri klávesnici.
**Rozsah:** 2 PR, sekvenčne

---

## Prečo dve PR a v tomto poradí

PR-1 opraví **číslo** — a samo osebe odstráni väčšinu škody.
PR-2 opraví **spôsob, akým sa číslo tvrdí**.
Keby išli naraz, nevieš pri regresii povedať, ktorá polovica ju spôsobila.

---

## PR-1 — Mestské kotvy a koniec tichého fallbacku

```
KONTEXT
Repo RealitkaAI, monorepo. Prečítaj brain/identity/FOUNDER.md, COMPANY.md, CONSTITUTION.md.
Overené cesty: docs/architecture/repo-inventory-2026-08-05.md

PROBLÉM
Neznáma lokalita spadne v resolve-region.ts:49 na regionCode "SK", potom
regional-data.ts:73-86 vráti národný typový priemer (byty 3378 EUR/m2).
Pre Poprad to dáva 3378 x 70 = 236 460 EUR, kým realita je 160-170 tisíc.
Chyba je +43 % a systém ju nikde nehlási — tvári sa ako odpoveď.

NAJPRV ZISTI (napíš mi, kým začneš písať kód)
1. Aká je presná štruktúra data/regional-prices.json? Vypíš mi kľúče objektu
   "regions" — sú tam len SK, alebo aj krajské kódy? Aký tvar má jeden záznam?
2. Ako presne resolve-region.ts:39-50 mapuje location na región — porovnáva
   presné reťazce, normalizuje diakritiku, alebo má zoznam?
3. Vracia lookupVerifiedPricePerSqm niekam informáciu o tom, ktorá vetva
   fallbacku sa použila? (usedFallback existuje — kam sa dostane?)
4. Rešpektuje band_rules typ zdroja, alebo je pásmo vždy -12/+8?

ÚLOHA A — dáta
Doplň do data/regional-prices.json mestské kotvy pre východoslovenské mestá,
kde pôsobia naši zákazníci. Zachovaj existujúcu štruktúru súboru, needituj
národné hodnoty.

Hodnoty (EUR/m2, byty, staršia zástavba):
  Poprad      2361
  Presov      2482
  Michalovce  1960
  Humenne     1614

Ku každej kotve ulož metadáta v tom tvare, aký súbor už používa:
  source: "Realitna unia SR - Realitny barometer"
  period: "2026-Q2"
  priceType: "ponukova"
  segment: "byty, staršie, 3-izbové"

DÔLEŽITÉ K METODIKE — napíš to aj do PR description:
Tieto čísla sú za STARŠIE 3-IZBOVÉ byty, kým národných 3378 je za VŠETKY byty.
Koeficient teda nesie aj lokalitu, aj segment. Pre staršie paneláky na východe
je to približne správne, pre novostavby by prekorigoval nadol.
Je to verzia v0, ktorú nahradia NBS krajské dáta, keď ich founder stiahne.

ÚLOHA B — mapovanie lokality
V resolve-region.ts pridaj mapovanie týchto miest na ich kotvy.
Mapovanie musí byť odolné voči diakritike a veľkosti písmen
(Poprad / poprad / Popradu → tá istá kotva). Použi normalizáciu, ktorú
projekt už niekde má; ak žiadnu nemá, napíš mi to a navrhni jednu, nepridávaj
npm závislosť.

ÚLOHA C — koniec tichého fallbacku
lookupVerifiedPricePerSqm musí spolu s cenou vracať aj zdroj:
  'city'      - našla sa mestská kotva
  'region'    - našiel sa krajský záznam
  'national'  - použil sa národný priemer
  'none'      - nič sa nenašlo

Ten údaj threadni cez estimate-engine.ts až do odpovede API ako priceSource.
Pri 'national' a 'none' zaloguj console.warn s vypísanou lokalitou —
ten log je zoznam miest, ktoré treba doplniť.

ÚLOHA D — šírka pásma podľa zdroja
  city / region  ->  -12 % / +8 %   (bez zmeny, existujúce band_rules)
  national       ->  -18 % / +8 %
  none           ->  žiadne číslo, stav insufficient_data

NEROB
- Nemeň buildDeterministicEstimate inak, než že prijme koeficient a vráti priceSource.
- Nepridávaj npm závislosť.
- Nemeň persist-estimate.ts ani schému DB.
- Nemeň národné hodnoty v regional-prices.json.

TESTY (Ústava Čl. 7 — test zlyhá, ak sa tvrdenie PR vráti späť)
1. GOLDEN CASE: byt, Poprad, 70 m2 -> odhad v rozsahu 145 000 - 185 000 EUR.
   Pred touto zmenou vracal ~236 000. Tento test je dôvod existencie celého PR.
2. Poprad, poprad, POPRAD aj Popradu vrátia tú istú kotvu.
3. Neznáma lokalita ("Xyzabc") vráti priceSource='national' alebo 'none',
   NIKDY nie 'city'.
4. priceSource='none' -> odpoveď neobsahuje numerický odhad.
5. Existujúce testy valuácie prechádzajú.

ROLLBACK
git revert. Žiadna migrácia, žiadna zmena schémy, žiadna zmena dát v DB.
```

---

## PR-2 — Priznané rozpätie v UI

```
ÚLOHA
V ValuationWidgetForm (a v (marketing)/odhad/[agencySlug]/page.tsx) zobraz
výsledok tak, aby nebol tvrdením.

A) Pásmo zostáva dominantné, formát "145 000 – 179 000 €".

B) Pod pásmom viditeľná veta (nie šedý drobný text v pätičke):
   "Orientačný odhad z oficiálnych dát. Presnú cenu určí maklér po obhliadke."

C) Pri priceSource='national' pridaj druhú vetu:
   "Pre vašu lokalitu zatiaľ nemáme podrobné dáta, preto je rozpätie širšie."

D) Pri priceSource='none' nezobrazuj žiadne číslo:
   "Pre vašu lokalitu pripravíme odhad individuálne — je presnejší než
    automatický výpočet. Nechajte nám kontakt a maklér vám ho pripraví."
   Formulár na kontakt musí zostať plne funkčný — toto je stále lead.

TESTY
1. Render test: v odpovedi je prítomná veta "Presnú cenu určí maklér".
2. Render test: pri priceSource='none' sa v DOM nenachádza žiadna cena v EUR.
3. Kontaktný formulár je funkčný aj pri insufficient_data.

ROLLBACK
git revert, iba UI vrstva.
```

---

## Overenie po nasadení (2 minúty, na mobile)

1. `app.revolis.ai/odhad/demo` → 3-izbový byt, **Poprad**, 70 m² → musí vyjsť pásmo okolo **145–179 tisíc**, nie 236 tisíc
2. To isté s **Prešov** → okolo 153–188 tisíc
3. Lokalita **„Xyzabc"** → buď široké pásmo s vetou o chýbajúcich dátach, alebo žiadne číslo — nikdy nie sebavedomé číslo
4. Formulár na kontakt funguje vo všetkých troch prípadoch

## Čo napísať Smolkovi po nasadení

> Kalkulačka od dnes počíta z cien pre konkrétne mestá, nie z národného priemeru —
> pre Poprad a Prešov to znamená rozdiel rádovo desiatok tisíc. Zároveň zobrazuje
> rozpätie a hovorí, že presnú cenu určí maklér. Vaši ľudia tým dostanú priestor
> a klient sa nezakotví na čísle, ktoré potom musia vyvracať.
