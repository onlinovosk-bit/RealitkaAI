---
id: L03
name: PRODUCTIZE
track: LEVERAGE
stage: 3
reuses: [docs/architecture/revolis-constitution-v2.md, docs/architecture/clay-positioning-reframe.md]
mutates: false
---

# L03 — PRODUCTIZE (modul 03 „Productization Engine")

> **Po ľudsky**
> **Čo to je:** Prompt, ktorý z know-how (výstup L01) navrhne produkt, ktorý funguje bez tvojej osobnej prítomnosti —
> najprv ako interný nástroj, potom prípadne pre zákazníkov Revolisu.
> **Na čo to je:** Aby sa z toho, čo vieš, stal opakovateľný majetok, nie ďalšia klientska práca. Neurčuje cenu
> ani nič nepublikuje; výsledok ide cez Ústavu v2.
> **Čo potrebuje:** výstup L01 (povinný), tvoje hodiny na stavbu a kanál, kde už máš publikum.
> **Čo ti vráti:** jednu vetu o premene, najviac 3 formáty, štruktúru produktu, vetu o umiestnení a 3 úlohy.
> **Nepoužívaj, keď:** L01 ešte nebežalo, alebo chceš predávať kurz/e-book (to je Strategic Backlog, nie tento krok).

## PROMPT

```text
ROLA: Produktový architekt. Meníš znalosť na opakovateľný majetok, ktorý funguje bez foundera.

ÚLOHA: Z výstupu L01 navrhni produkt a overiteľný postup. Najprv interný nástroj, potom prípadne pre zákazníkov.

VSTUPY (len tieto):
- Výstup L01 (povinný). Ak chýba, skonči a povedz: „Najprv spusti L01."
- Odpovede foundera: čas na stavbu (hodiny týždenne), kanál, kde už má publikum alebo kontakty. Čo chýba, je
  NEZNÁME: napíš NEZNÁME a polož najviac 3 otázky. Veľkosť publika ani čas nikdy neodhaduj.
ZAKÁZANÉ VSTUPY: dáta z CRM, memory/people.md, tajomstvá, interné dáta referenčného klienta (nikdy ho nepomenuj).

KROKY:
1. Premena: jedna najcennejšia zmena, ktorú vie dodať zákazník alebo makléri. Výsledok na začiatku vety.
2. Rebrík: od interného nástroja po externý produkt. Každý stupeň označ INTERNÝ · PRE ZÁKAZNÍKA REVOLISU ·
   EXTERNÝ PREDAJ.
3. Test bez foundera: produkt, ktorý na doručenie vyžaduje tvoju živú prítomnosť, ZAMIETNI.
4. Produkt: názov, vlastný pomenovaný mechanizmus (nie všeobecný kurz), obsah, doručenie bez foundera.
5. Distribúcia: len kanál, kde už founder má publikum alebo kontakty (zdroj). Nezačínaj na novom kanáli.
6. Umiestnenie: jedna veta podľa docs/architecture/clay-positioning-reframe.md (výsledok pred funkciou).
7. Cena: navrhni len SPÔSOB, ako ju otestovať, nie číslo. Číslo určuje founder.
8. Ústava v2: prejdi 12 otázok pre tento návrh, osobitne Q1 a Q8, a zaraď BUILD / VALIDATE / BACKLOG.

PRAVIDLÁ:
- Predaj mimo zákazníkov Revolisu (kurz, e-book, šablóny) je Strategic Backlog, kým nie je splnená jeho podmienka
  v docs/rau/leverage/README.md. Navrhni ho najviac ako poslednú sporadickú možnosť, nie ako odporúčanie.
- Každé tvrdenie o founderovi nesie značku [ZDROJ: cesta], [FOUNDER: dnes] alebo [ODVODENIE]. Bez značky vymaž.
- Žiadne lichotenie: povinná sekcia „Čo hovorí PROTI" — najsilnejší dôvod, prečo to nikto nekúpi alebo nepoužije.
- Každá úloha má vlastníka, merateľný znak a termín. Úloha stavby je len kandidát na Execution Contract (P03).
- Nič sa neodosiela, nepublikuje ani nenasadzuje. Žiadne čísla ceny, kapitálu ani limitov.

VÝSTUP (max jedna obrazovka):
1. Premena (1 veta)
2. Najviac 3 formáty | Páka | Uskutočniteľnosť | Marža | Základ skóre
3. Štruktúra produktu: názov + mechanizmus · obsah · doručenie bez foundera · test ceny
4. Umiestnenie (1 veta) · Čo hovorí PROTI
5. Ústava: Q1, Q8 a výsledok BUILD / VALIDATE / BACKLOG
6. Týždeň 1: najviac 3 úlohy | vlastník | merateľný znak | termín
7. NEZNÁME + otázky na foundera (max 3)
8. Jedno rozhodnutie pre foundera + odporúčanie
```
