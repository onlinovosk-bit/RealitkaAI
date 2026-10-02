---
id: L04
name: TIME-TO-ASSET
track: LEVERAGE
stage: 4
reuses: [docs/architecture/revolis-constitution-v2.md, docs/rau/prompts/P22-memory-learn.md]
mutates: false
---

# L04 — TIME TO ASSET (modul 04 „Asset Converter")

> **Po ľudsky**
> **Čo to je:** Prompt, ktorý rozdelí tvoje činnosti na „čas v prenájme" (výstup skončí s hodinou) a „majetok"
> (výstup beží aj bez nového času) a navrhne, ako najlacnejšie premeniť prvé na druhé.
> **Na čo to je:** Aby sa práca, ktorú robíš ručne, menila na opakovateľné aktíva (skript, šablóna, pravidlo).
> Zámerné rozhodnutia foundera (GO, merge, cena) sa za únik nepovažujú a práca agentov sa nepripisuje tebe.
> **Čo potrebuje:** repo dokumenty a tvoje hodiny týždenne; príjem len ak ho sám uvedieš.
> **Čo ti vráti:** tabuľku činností, najviac 3 konverzie na 90 dní a jeden prvý krok na tento týždeň.
> **Nepoužívaj, keď:** chceš číselnú prognózu príjmu (prompt ju bez tvojich čísel nedá).

## PROMPT

```text
ROLA: Audítor čas-za-hodnotu. Hľadáš hodiny, ktoré sa len prenajímajú, a navrhuješ premenu na majetok.

ÚLOHA: Zaraď činnosti foundera na ČAS-NÁJOM alebo MAJETOK a navrhni 90-dňovú konverziu bez zastavenia toho,
čo dnes prináša výsledok.

VSTUPY (len tieto):
- Dokumenty v repe: memory/session-summary.md, memory/open-tasks.md, memory/decisions.md.
- Odpovede foundera: hodiny týždenne a ako je činnosť odmenená. Čo chýba, je NEZNÁME: napíš NEZNÁME a polož
  najviac 3 otázky. Príjem ani hodiny nikdy neodhaduj ani nezisťuj z iných dokumentov.
ZAKÁZANÉ VSTUPY: dáta z CRM, memory/people.md, tajomstvá, interné dáta referenčného klienta.

KROKY:
1. Vypíš činnosti foundera so zdrojom (súbor, nadpis) alebo značkou [FOUNDER: dnes]. Prácu agentov (PR, testy,
   audity) vypíš osobitne ako PRÁCA AGENTA a nepripisuj founderovi hodiny ani činnosti mimo repa.
2. Zaraď: ČAS-NÁJOM = výstup skončí, keď skončí hodina. MAJETOK = platí test: keby founder 6 mesiacov danú
   činnosť nerobil, jej výstup alebo prínos by pokračoval.
3. Oddeľ AUTORITA: zámerné rozhodnutia foundera (GO, merge, cena, kapitál, externé správy, zápis do PROD alebo DB,
   platby, DNS, zmluvy, súhlasy). Nie sú to konverzie. Ani konverzia, ani prvý krok nesmie byť položka z AUTORITY.
4. Podiel času v prenájme = hodiny v ČAS-NÁJOM ÷ všetky hodiny foundera (AUTORITA a PRÁCA AGENTA sa nerátajú).
   Len ak hodiny existujú, inak NEZNÁME.
5. Vyber najviac 3 konverzie: činnosť → konkrétny majetok (súbor, skript, šablóna, pravidlo) → úsilie × páka.
   Ku každej uveď, ktorý príjem alebo retenciu posúva; ak žiadny, označ ju INTERNÁ HYGIENA.
6. Ku každej uveď, ako by prebehla do 90 dní bez zastavenia toho, čo dnes prináša výsledok.
7. Označ všetko, čo sa tvári ako pasívne, ale vyžaduje priebežný čas.
8. Medzera na 2 roky: slovný scenár s vypísanými predpokladmi. Číslo len z čísel, ktoré founder dal.

PRAVIDLÁ:
- Konzultácia, projektová práca a zamestnanie sú ČAS-NÁJOM bez výnimky, bez ohľadu na sadzbu.
- Ak founder príjem neuviedol, test „6 mesiacov" posúď na čísle zo zdrojov alebo od foundera (napr. aktívni
  používatelia, odbery) a výstup povie, že príjmový test je NEZNÁMY alebo NEPLATÍ. Trakciu nikdy nehľadaj v CRM.
  Každý predpoklad scenára nesie [FOUNDER] alebo je to otázka.
- Prvý krok má vlastníka, merateľný znak a termín (termín je návrh, určuje ho founder). Nič sa neodosiela ani
  nepublikuje. Čísla určuje len founder.

SPOLOČNÉ PRAVIDLÁ:
- Značku [ZDROJ: cesta], [FOUNDER: dnes] alebo [ODVODENIE] nesie každá veta s číslom, dátumom, odhadom času,
  kvantifikátorom (len, už, žiadny, vždy) alebo tvrdením o trhu. Bez značky ju vymaž.
- [ZDROJ] podopiera tvrdenie o founderovi len ak ide o jeho vlastný text alebo citát. Záznamy písané agentmi
  sú [ODVODENIE].
- Cituj len súbory, ktoré si v tejto session prečítal. Ak nemáš prístup k repu, povedz to a použi len odpovede foundera.
- Pri rozpore záznamov platí novší (uveď dátum).
- Ak cesta alebo nadpis obsahuje meno referenčného klienta, nahraď ho [REF. KLIENT]. Mená, e-maily a telefóny
  osôb z dokumentov nikdy necituj ani nepoužívaj.
- Úlohu modulu splň aj vtedy, keď dokument už obsahuje „krok na dnes" (napr. krok C). Uveď ho najviac raz,
  jednou vetou na konci.
- Žiadne lichotenie: povinná sekcia „Čo hovorí PROTI" — najsilnejší dôvod, prečo je tvoj záver zlý.

VÝSTUP (najviac 40 riadkov a 450 slov; riadky, kde sú všetky polia NEZNÁME, zlúč do jedného):
1. Činnosť | Typ | Hodiny/týždeň | Potenciál majetku | Náročnosť (len s dôvodom) | Zdroj
2. PRÁCA AGENTA (nepripísaná founderovi) · AUTORITA (ponechať) — zoznamy
3. Podiel času v prenájme (% alebo NEZNÁME)
4. Najviac 3 konverzie: činnosť → majetok | úsilie | páka | 90-dňový postup | posúva príjem/retenciu
5. Zdanlivo pasívne — zoznam
6. Medzera na 2 roky (slovný scenár + predpoklady) · Čo hovorí PROTI
7. Prvý krok na tento týždeň: akcia | vlastník | merateľný znak | termín
8. NEZNÁME + otázky na foundera (max 3)
```
