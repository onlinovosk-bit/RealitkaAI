# Positioning v1 — „zdroj predávajúcich", nie CRM

**Dátum:** 2026-09-18 · **Stav:** AKTÍVNY (founder GO 2026-09-18, S1) · **Engineering:** 0 €
**Nadradené:** `docs/architecture/clay-positioning-reframe.md` · `docs/sales/gtm-playbook-2026-09-18.md` §2/S1
**Platí pre:** web, e-mail, telefón, dashboard copy, onboarding, demo

> **Pravidlo č. 1:** Nikdy neveď komunikáciu technológiou. Veď ju výsledkom.
> **Pravidlo č. 2:** Netvrď nič, čo dnes nie je pravda. Claim sa zarába, nenárokuje.

---

## 1. Prečo sa mení kategória

Trh odpovedal trikrát nezávisle (`memory/decisions.md:501` — Molnár 7/2026, Suchý 5.8.2026, ARCHEUS):

> kancelárie odmietajú ponuky AI/CRM, lebo **nikto im nedodá klientov, ktorí chcú predať**

A zákazník pomenoval wedge doslova: *„CRM nie, ale vyhľadávanie predávajúcich áno."*

Nepredávame teda softvér na správu dopytov. Predávame **prísun majiteľov, ktorí chcú predať,
a stráženie, aby im maklér zavolal prvý.** CRM je doručovací mechanizmus v pozadí.

---

## 2. Hlavná veta (používaj doslova)

> **„Privedieme vám majiteľov, ktorí chcú predať — a postrážime, aby ste im zavolali prví."**

Podnadpis:

> „Kalkulačka na vašom webe vyrobí rozhovor s majiteľom. Revolis ho zachytí, zoradí
> a ráno vám povie, komu volať a prečo. Realviu si nechávate."

---

## 3. Hierarchia správy (v tomto poradí, nikdy inak)

| Úroveň | Obsah |
|---|---|
| 1. Výsledok | viac mandátov (výhradných zastúpení) |
| 2. Mechanizmus | kalkulačka → lead → ranný zoznam „komu volať" → hovor do SLA |
| 3. Dôkaz | čas do prvého kontaktu, počet leadov bez follow-up (z **ich** dát) |
| 4. Technológia | **vôbec sa nespomína**, pokiaľ sa nespýtajú |

Ak sa spýtajú „je za tým AI?" → *„Áno, ale to je naša starosť. Vy vidíte zoznam mien a dôvodov."*

---

## 4. Featura → výsledok (toto hovor)

| Featura (NEhovor) | Výsledok (HOVOR) |
|---|---|
| Valuačný widget `/odhad` | „Na vašom webe vyrobí rozhovor s majiteľom, ktorý zvažuje predaj" |
| Realvia integrácia | „Realviu si nechávate, nič nemigrujete" |
| AI triage / lead scoring | „Viete, na ktorých leadoch sú reálne peniaze" |
| Action Queue / ranný digest | „Ráno otvoríte a viete, komu volať a prečo" |
| Guardian listing scoring | „Vaše inzeráty prestanú strácať kupujúcich na detailoch" |
| Notifikácie / SLA | „Neprídete o províziu, lebo ste zabudli zavolať" |
| Enrichment | „Kontakty doplnené a overené, bez ručnej práce" |

---

## 5. Zakázaný slovník

**Nikdy** v prvom kontakte: *AI CRM · AI agenti · automatizácia · neural · prediktívny model ·
platforma · ekosystém · digitálna transformácia · all-in-one riešenie · Claude/GPT/LLM.*

Dôvod: každé z týchto slov posúva rozhovor z „koľko zarobím" na „koľko ma to bude stáť
a koľko sa to budem učiť".

---

## 6. Prvé vety podľa kanála

**Web (hero):**
> Privedieme vám majiteľov, ktorí chcú predať. A postrážime, aby ste im zavolali prví.

**Studený e-mail (predmet):**
> Kalkulačka, ktorá vám privádza majiteľov na predaj

**Studený e-mail (prvá veta):**
> Dobrý deň, pozrel som si {konkrétny fakt o ich kancelárii}. Píšem kvôli jednej veci:
> kalkulačke na vašom webe, ktorá vám vyrobí rozhovor s majiteľom skôr, než osloví konkurenciu.

**Telefón (otvárač):**
> Dobrý deň, Ondruš z Revolisu. Posielal som vám {deň} e-mail o kalkulačke, ktorá
> kanceláriám privádza majiteľov so záujmom predať — máte minútku?
> → {hák firmy} → „Najlepšie to uvidíte naživo, stačí 20 minút. Hodí sa {deň} alebo {deň}?"

**Cieľ hovoru = dohodnúť 20-minútové video, nie predať po telefóne.**

---

## 7. Čo smieme tvrdiť DNES a čo nie

| Smieme (pravda dnes) | Nesmieme (ešte nezarobené) |
|---|---|
| „Sedíme nad Realviou, nič nemigrujete" | „Sme vrstva nad všetkými CRM" |
| „Ranný zoznam, komu volať" | „AI predpovie, ktorý obchod padne" |
| „Odhad z oficiálnych krajských dát NBS" *(po dokončení S2)* | „Poznáme trhovú/realizačnú cenu vašej nehnuteľnosti" |
| „Vypočítané z vášho exportu" | akékoľvek číslo bez zdroja |
| „Vidíte, ktoré leady čakajú na hovor" | „+34 % konverzia" a podobné čísla bez merania |

**AP-001:** ak číslo nemá zdroj, nezobrazuje sa. Radšej `honest pending` než vymyslený údaj.
Historický precedens: chyba kalkulačky +40 % poškodila značku platiaceho klienta
(`memory/decisions.md:584`). Jedno zlé číslo = stratený klient.

---

## 8. Kam musí táto copy dopadnúť

- [ ] `apps/marketing` landing hero + CTA
- [ ] `/proof` funnel úvod
- [ ] dashboard prázdne stavy a onboarding
- [ ] e-mailové šablóny outreachu
- [ ] obvolávacia listina (hák = jedna veta „prečo volám práve vám")

Poradie: **najprv e-mail a telefón** (dnes sa používajú), potom web, potom produkt.
