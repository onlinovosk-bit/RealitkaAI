# Segmentácia A/B/C + outreach protokol

**Dátum:** 2026-09-18 · **Stav:** AKTÍVNY (founder GO 2026-09-18, S3 + A8) · **Engineering:** 0 €
**Nadradené:** `docs/sales/gtm-playbook-2026-09-18.md` §2/S3, §4/A8 · `docs/sales/positioning-v1-zdroj-predavajucich.md`
**Rieši nález:** D5-7 „Košice outreach nemerateľný" (`docs/audit/d5-akvizicia-2026-07-09.md`)

---

## 1. Prečo segmentovať podľa CRM, a nie podľa veľkosti

Najdrahšia námietka v predaji CRM nie je cena — je to **migrácia**. Segment preto určuje
systém, ktorý kancelária dnes používa, lebo ten určuje, či je naša ponuka *doplnok* alebo *výmena*.

| Segment | Kto to je | Naša ponuka je | Dĺžka cyklu |
|---|---|---|---|
| **A** | beží na **Realvii** | doplnok (nulová migrácia) | **najkratší** |
| **B** | iný CRM (RealSoft, vlastné, Nehnuteľnosti admin) | doplnok, ale bez hotovej integrácie | stredný |
| **C** | Excel / e-mail / papier | náhrada (a je to v poriadku) | najdlhší, ale najmenší odpor |

**Poradie práce: A → C → B.** Áno, C pred B — v C nie je čo migrovať, kým v B narazíš
na integráciu, ktorú ešte nemáš.

---

## 2. Ako segment rozpoznať (bez pýtania sa)

| Signál | Záver |
|---|---|
| Inzeráty exportované cez Realviu, Realvia branding v päte webu | A |
| Vlastný systém v URL inzerátov, iný export formát | B |
| Žiadny systém — inzeráty len na portáloch, kontakt cez Gmail | C |
| Web bez kalkulačky / bez formulára na ocenenie | **všetky** — toto je náš hák |

Pri pochybnosti sa pýtaj až v hovore: *„V čom dnes vediete zákazky?"*

---

## 3. Hovorový skript podľa segmentu

### Segment A — Realvia (najsilnejší hák)

> „Realviu si nechávate. My nič nemigrujeme. Len dorobíme dve veci: kalkulačku na váš web,
> ktorá vyrobí rozhovor s majiteľom, a ranný zoznam, komu volať a prečo."

**Hlavná námietka:** *„Už máme systém."*
**Protiargument:** *„Presne preto volám. Nechcem ho nahradiť — chcem, aby vám nosil viac zákaziek."*
**Prvá požiadavka:** 20-minútové video.

### Segment B — iný CRM

> „Nepýtam vás, aby ste menili systém. Začneme mimo neho: kalkulačka na webe a zoznam,
> komu volať. Ak sa to osvedčí, napojenie riešime potom."

**Hlavná námietka:** *„A napojí sa to na to, čo máme?"*
**Protiargument (poctivý):** *„Na Realviu áno, máme to hotové. Na {ich systém} zatiaľ nie —
preto navrhujem začať tam, kde napojenie netreba."*
**Neklam o integrácii, ktorú nemáš.** Zarobený claim > krátkodobý podpis.

### Segment C — Excel / e-mail

> „Zákazky máte v hlave a v mobile. To funguje, kým vám neujde jeden telefonát.
> Dám vám jeden ranný e-mail: päť mien a päť dôvodov, prečo im dnes zavolať."

**Hlavná námietka:** *„Sme malí, nepotrebujeme systém."*
**Protiargument:** *„Súhlasím. Preto nezačíname systémom, ale jedným e-mailom denne."*

---

## 4. Kvalifikačné otázky (max 4, v hovore)

1. Koľko maklérov reálne pracuje na zákazkách?
2. V čom dnes vediete zákazky?
3. **Koľko dopytov na ocenenie vám príde za mesiac — a do koľkých hodín na ne stíhate reagovať?**
4. Platíte dnes za tipy na predávajúcich? Koľko?

Otázka 3 je najdôležitejšia — určuje, či im vieme pomôcť a či majú SLA problém.
Otázka 4 kalibruje cenu proti overenej kotve **300 €/tip**
(`docs/sales/call-list-2026-07-w30.md`, REALITY KAMZÍK).

---

## 5. Diskvalifikátory (nepredávaj, ušetri čas)

- Žiadny web alebo web bez možnosti pridať kalkulačku.
- Majiteľ nie je na hovore a nedá sa k nemu dostať.
- Očakáva, že dodáme leady bez ich vlastného kanála (Ads/web) — **to nesľubujeme**.
- Chce predovšetkým kúpiť databázu kontaktov → právna brána, default OFF.

---

## 6. Čo sa MUSÍ zaznamenať pri každom kontakte

Toto rieši D5-7. Bez týchto polí je outreach opäť nemerateľný.

| Pole | Hodnota |
|---|---|
| `firma` / `IČO` | z RPO (keď pobeží A1) |
| `segment` | A / B / C |
| `kanál` | e-mail / telefón / odporúčanie / event |
| `dátum_kontaktu` | ISO dátum |
| `pokus_č.` | 1 / 2 / 3 |
| `výsledok` | bez odpovede / odmietnutie / demo dohodnuté / demo prebehlo / podpis |
| `dôvod_odmietnutia` | voľný text — **toto je najcennejšie dáta, ktoré máme** |

Jeden zdroj pravdy, nie xlsx na disku. Kým nebeží A1, stačí jedna tabuľka — ale **musí byť jedna**.

---

## 7. A8 — sezónnosť a načasovanie

**Mechanizmus (hypotéza na overenie vlastnými dátami, nie prevzatá štatistika):**
realitné transakcie majú jarný a jesenný vrchol; v tých obdobiach je majiteľ RK najmenej
dostupný na hovor o softvéri, lebo rieši obchody. Rozhodnutie o nástroji padá v pokojnejších týždňoch.

| Obdobie | Čo robiť |
|---|---|
| **Jar (mar–jún)** | vrchol transakcií → menej studeného volania, viac onboardingu už podpísaných |
| **Júl–august** | dovolenky, B2B outreach má najhoršiu odozvu → príprava zoznamov, obsah, partnerstvá |
| **September–november** | **hlavné okno pre studený outreach** — trh beží, majiteľ bilancuje rok |
| **December** | posledné dva týždne mŕtve → nezačínať kampaň |
| **Január–február** | **druhé okno** — rozpočty a plány na nový rok |

**Dnes je 18. 9. 2026 — si na začiatku hlavného okna.** To je argument nezdržiavať sa
a rozbehnúť segment A tento týždeň.

**Overenie:** po prvej vlne porovnaj odozvu podľa mesiaca v trackeri (§6).
Ak dáta hypotézu nepotvrdia, prepíš túto sekciu — netvárme sa, že to vieme.
