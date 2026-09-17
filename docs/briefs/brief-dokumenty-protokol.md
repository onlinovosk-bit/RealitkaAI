# BRIEF — Dokumenty, fáza 1: Odovzdávací protokol

**Stav:** GO od foundera 2. 9. 2026 · **fáza 1 z troch**
**Kategória:** nový modul · **nič z toho v repe neexistuje** (overené, 2 641 súborov)

---

## Prečo protokol a nie zmluva

Odovzdávací protokol je **jediný z tých troch dokumentov, kde chyba nespôsobí
prevod majetku.** Zaznamenáva stav pri odovzdaní: stavy meračov, počet kľúčov,
zistené závady, dátum, podpisy.

Kúpna zmluva a zmluva o sprostredkovaní nájmu majú vlastnú právnu váhu —
zle doplnené parcelné číslo alebo suma vedie k reálnej škode. Preto sú
**fáza 2 a 3**, až keď bude fáza 1 mesiac v prevádzke bez incidentu.

Protokol je zároveň dokument, ktorý maklér vypĺňa **najčastejšie** a vždy
rovnako. Časová úspora je tam najväčšia a riziko najmenšie. Preto začíname ním.

## Čo v repe existuje a čo nie

| Potrebné | Stav |
|---|---|
| Supabase Storage bucket | **žiadny** — nezakladá ho ani jedna migrácia |
| nahrávanie súborov v `apps/crm` | **nič** |
| práca s `.docx` | **žiadna knižnica** — v `package.json` nie je `docx`, `mammoth`, `pizzip` ani `handlebars` |
| generovanie PDF | **žiadna knižnica** |
| dáta o nehnuteľnosti | **áno** — `properties` s RLS (`20260508180000_rls_properties`) |
| dáta o klientovi | **áno** — `leads`, `contacts_dossier` |
| prepojenie lead ↔ nehnuteľnosť | **áno** — `lead_property_matches` |
| `sharp` (obrázky) | áno, na fotky zo zápisu sa dá použiť |

Dátová vrstva teda existuje. **Chýba celá dokumentová vrstva.**

## Rozhodnutie o formáte — a prečo nie „nahraj si vlastnú šablónu"

Founder chce, aby maklér nahral **vlastný** formulár. To je správny cieľ,
ale nie pre prvú fázu, a treba vedieť prečo:

Rozpoznať zlučovacie polia v ľubovoľnom cudzom `.docx` je neriešiteľné
spoľahlivo. Maklér nahrá dokument, kde je „Kupujúci:" raz v tabuľke, raz
v odseku a raz v hlavičke — a AI musí uhádnuť, kam čo patrí. Zlyhá to
nenápadne, čo je najhorší druh zlyhania.

**Fáza 1 preto obracia poradie:**

1. Revolis ponúkne **vlastnú šablónu protokolu**, ktorú vyplní spoľahlivo.
2. Maklér si ju **upraví v aplikácii** — pridá / odoberie / premenuje položky,
   doplní logo a hlavičku svojej kancelárie.
3. Až **fáza 1b** rieši nahratie cudzieho `.docx` — a to tak, že maklér
   zlučovacie polia **označí sám** (klikne na miesto v dokumente a vyberie,
   ktorý údaj tam patrí). Žiadne hádanie.

Tým dostane maklér „svoj" formulár už vo fáze 1, len cez úpravu namiesto uploadu.

## Rozsah fázy 1

**Dátový model** (migračné SÚBORY, neaplikovať):

- `document_templates` — šablóna kancelárie: `agency_id`, názov, typ
  (`handover_protocol`), definícia položiek (JSON), logo, hlavička
- `documents` — vygenerovaný dokument: `agency_id`, `property_id`, `lead_id`,
  `template_id`, vyplnené hodnoty (JSON), stav (`draft` / `finalized`),
  kto a kedy vytvoril, kto a kedy potvrdil
- composite FK `(agency_id, …)` a RLS `*_tenant` politiky ako všade inde
- Storage bucket `documents` s politikou **iba vlastný tenant**

**Obrazovka `/dokumenty`:**

- zoznam vygenerovaných dokumentov, filter podľa nehnuteľnosti a klienta
- „Nový protokol" → vyber nehnuteľnosť → vyber klienta → formulár
- formulár je **predvyplnený** z `properties` a `leads`, každé pole
  editovateľné
- polia, ktoré sa nedajú doplniť z dát (stavy meračov, počet kľúčov, závady),
  ostanú **prázdne a viditeľne označené** — nikdy vymyslené
- export do PDF

**Predvypĺňanie:** deterministické mapovanie stĺpec → pole. **Žiadny LLM.**
Adresa, výmera, meno, telefón, e‑mail, dátum — to sú údaje, ktoré sa kopírujú,
nie odhadujú. LLM má vo fáze 1 nulové miesto a to je zámer.

## Tvrdé hranice

1. **Nikdy hotový dokument, vždy návrh.** Maklér musí explicitne potvrdiť
   „skontroloval som" pred exportom. To potvrdenie sa zaznamená do `documents`
   s časom a menom.
2. **Žiadne automatické odoslanie klientovi.** Platí existujúce pravidlo:
   drafty áno, send nikdy.
3. **Žiadne vymyslené hodnoty.** Prázdne pole zostane prázdne a je vizuálne
   označené ako nevyplnené. Nikdy predvyplnené „typickou" hodnotou.
4. **Tenant izolácia aj v úložisku.** Súbor jednej kancelárie nesmie byť
   dostupný inej — ani cez uhádnutú URL. Signed URL s krátkou platnosťou.
5. **Právne posúdenie šablóny.** Vlastnú šablónu protokolu musí pred nasadením
   prejsť právnik. Odhad 300 – 800 €, treba ponuku.

## Otvorené otázky pre foundera

1. **PDF alebo `.docx` na výstupe?** PDF je bezpečnejšie (needitovateľné,
   podpisovateľné), `.docx` chce maklér, ktorý si to ešte dopisuje. Odporúčam
   PDF vo fáze 1.
2. **Podpis?** Papier a sken, alebo podpis prstom na tablete priamo na mieste?
   Druhé je oveľa hodnotnejšie, ale je to samostatná fáza.
3. **Fotky v protokole?** Stav meračov sa bežne fotí. `sharp` v repe je,
   takže technicky to ide — ale je to +2 týždne.
4. **Koho sa spýtame?** Smolko je jediný platiaci zákazník. **Než sa začne
   stavať, mal by povedať, ako protokol robí dnes** a čo ho na tom najviac
   zdržiava. Otázka do zajtrajšieho hovoru.

## Postup

- **Dnes v noci:** L5 — read-only prieskum (viď nočný plán). Žiadny kód.
- **Zajtra na hovore:** spýtať sa Smolka na otázku 4.
- **Potom:** zadanie fázy 1 podľa jeho odpovede, nie podľa tohto briefu.

Tento brief je **návrh, nie špecifikácia.** Špecifikácia vznikne až po tom,
čo bude jasné, ako ten protokol vyzerá v reálnej kancelárii.
