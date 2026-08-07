# PROMPT PRE CURSOR — záložka „Generátor textov inzerátov"

**Cieľová cesta:** `docs/prompts/inzerat-generator-tab.md`
**Klasifikácia (podľa FOUNDER.md v2):** **Workflow Capability** — nie nová
schopnosť. AI popis inzerátu už existuje ako účtovaná operácia (2 kredity
v cenníku); toto je len UI povrch nad hotovým vstupom. Preto: malý PR,
shipuje sa priebežne, nepotrebuje zákaznícky signál pred buildom.
**Limit PR:** ≤400 riadkov logiky (Ústava Čl. 5)

---

## ⚠️ Pred zadaním Cursoru over dve veci

1. **Existuje už backend pre generovanie popisu?** Cenník účtuje „popis
   inzerátu 2 kredity", takže operácia je pravdepodobne definovaná. Ak áno,
   toto PR je len UI + volanie existujúceho endpointu — a rozsah spadne na
   polovicu. Ak nie, PR musí obsahovať aj serverovú akciu.
2. **Odpočítavanie kreditov** — musí ísť cez existujúci mechanizmus
   entitlementov v `agencies`, nie novú logiku.

---

## PROMPT (vlož Cursoru celý)

```
KONTEXT
Pracuješ v repozitári RealitkaAI (Revolis.AI) — Next.js App Router,
TypeScript, Tailwind, Supabase (multi-tenant s RLS), deploy Vercel.
Pred prácou si prečítaj: brain/identity/FOUNDER.md,
brain/identity/COMPANY.md, brain/identity/CONSTITUTION.md.

ÚLOHA
Pridaj do CRM novú záložku „Generátor inzerátov" na route
/dashboard/inzeraty (presnú cestu prispôsob existujúcej konvencii
routingu — over ju, nehádaj). Umožní maklérovi vygenerovať predajný text
inzerátu z parametrov nehnuteľnosti.

NAJPRV ZISTI (a napíš mi to, kým začneš písať kód):
1. Existuje už server action / API route na generovanie popisu inzerátu?
   (hľadaj "popis", "listing", "description", "inzerat" v apps/crm)
2. Ako sa dnes odpočítavajú kredity? Nájdi existujúci helper a použi ho.
   Cena tejto operácie: 2 kredity.
3. Aká je konvencia formulárov v projekte (react-hook-form? server actions?)
   a konvencia UI komponentov. Použi existujúcu, nezavádzaj novú.
4. Existuje tabuľka na uloženie vygenerovaných textov, alebo ju treba pridať?

VSTUPNÝ FORMULÁR — polia
Povinné:
- typ nehnuteľnosti (select: byt / dom / pozemok / komerčný priestor / chata)
- dispozícia (text, napr. "2-izbový")
- lokalita — mesto/obec + časť/ulica (2 polia)
- výmera v m² (number)
- cena v € (number)
- účel (select: predaj / prenájom)

Nepovinné, ale zásadne zvyšujú kvalitu výstupu:
- poschodie / celkovo poschodí
- stav (novostavba / po rekonštrukcii / čiastočná rekonštrukcia /
  pôvodný stav / na rekonštrukciu)
- typ konštrukcie (panel / tehla / montovaná / iné)
- vykurovanie
- orientácia
- balkón / loggia / terasa / záhradka + výmera
- pivnica / parkovanie / garáž
- energetický certifikát
- rok výstavby, rok rekonštrukcie
- vzdialenosť do centra, škola/obchod/zastávka v okolí
- charakterLokality (E1, 2026-08-07) — voliteľné; enum (napr. malé mesto /
  sídlisko / vidiek / centrum / iné) + voľný text. Bez tohto poľa
  systémový prompt NESMIE písať o „povahe“ lokality (O2 veto).
  Odporúčané doplniť, ak maklér chce soft municipal tone (golden
  „Sabinov nie je Prešov").
- "čo je na tejto nehnuteľnosti najlepšie" (textarea, max 300 znakov) —
  voľné pole pre makléra
- "čo je na nej najslabšie" (textarea, max 300 znakov) — POVINNE ponúkni,
  systém z toho vyrobí obrátenie námietky, nie zamlčanie

VÝSTUP — generuj naraz karty s tlačidlom "Kopírovať".
**Produkčné kľúče = `ListingContent`** (`apps/crm/src/lib/ai/listing-content.ts`;
FINAL prompt C4 — žiadny mapper; `mainText`/`socialText` superseded):
1. Titulok — `titles?` (3 návrhy: portál / sociálne / alt)
2. Dlhý text — `portal_text` (dĺžka podľa FINAL:
   `docs/prompts/listing-generator-system-prompt-FINAL.md`: 220–320 slov,
   cieľ ~270). Tento brief NIE JE zdroj pravdy pre rozsah.
3. FB reklama — `fb_ad_copy` (65–80 slov; ≤500 znakov)
4. IG caption — `ig_caption` (2 odstavce + 7 SK hashtagov)
5. Email — `email_subject` + `email_body`
6. SEO — `seo_keywords` (6)
7. Doplnenie — `missingData?` / `recommendations?` (maklér meta)

SYSTÉMOVÝ PROMPT PRE MODEL (ulož ako konštantu, verzuj ju)
"Si špecialista na realitnú inzerciu na slovenskom trhu. Píšeš texty,
ktoré predávajú, v slovenčine, pre slovenského čitateľa.

PRAVIDLÁ, KTORÉ NEPORUŠUJEŠ:
1. Nikdy nevymyslíš údaj, ktorý nemáš na vstupe. Chýbajúce údaje
   nevypĺňaš odhadom — uvedieš ich v zozname na doplnenie.
2. Zakázané prázdne prídavné mená: krásny, útulný, jedinečný,
   nádherný, luxusný, priestranný (ak nie je doložené výmerou),
   'jedinečná príležitosť', 'neváhajte nás kontaktovať'.
3. Prvá veta je scéna alebo konkrétny fakt, nikdy nie 'Na predaj
   ponúkame'.
4. Ak vstup obsahuje slabinu (prízemie, pôvodný stav, hlavná cesta,
   posledné poschodie, malá výmera), NEZAMLČÍŠ ju — obrátiš ju na
   argument, ak to fakty umožňujú, alebo ju priznáš vecne. Priznaná
   nevýhoda buduje dôveru.
5. Uvedieš cenu za m² vypočítanú z ceny a výmery, ak je výhodná
   alebo ak vysvetľuje cenu.
6. Pomenuješ 2–4 konkrétne cieľové skupiny kupujúcich a pri každej
   povieš jednu vetu, prečo je to pre ňu.
7. Výzva na akciu je konkrétna — meno makléra a telefón, ak sú na
   vstupe, nie 'kontaktujte nás'.
8. Žiadne emoji v dlhom texte. V krátkej verzii pre sociálne siete
   maximálne jedno.
9. Neuvádzaj tvrdenia o investičnej návratnosti ani o budúcom vývoji
   ceny — je to neoveriteľné a právne rizikové.
10. Nepoužívaj superlatívy o kancelárii, len o nehnuteľnosti."

TECHNICKÉ POŽIADAVKY
- Odpočítaj 2 kredity až po ÚSPEŠNOM vygenerovaní, nikdy pred.
  Pri chybe modelu sa kredity neodpočítavajú.
- Ak agentúra nemá dosť kreditov: jasná správa + odkaz na doplnenie,
  žiadne ticho.
- Rate limit na agentúru (napr. 20 generovaní / hodinu) — ochrana
  pred nákladovým únikom.
- Uloženie: vygenerovaný text + vstupné parametre + verzia promptu
  + model. Bez tohto sa nikdy nedozvieš, ktorá verzia promptu
  fungovala lepšie.
- Multi-tenant: každý záznam má agency_id, RLS politika kopíruje
  existujúci vzor (nevymýšľaj druhý).
- Loading stav s reálnym progresom, generovanie trvá sekundy.
- Mobil: makléri píšu inzeráty z terénu. Formulár musí byť
  použiteľný na telefóne.

TESTY (podľa Ústavy Čl. 7 — dôkaz, nie percento)
- Integračný test: úspešné generovanie odpočíta presne 2 kredity.
- Integračný test: zlyhanie modelu NEodpočíta kredity.
- Cross-tenant RLS test: agentúra A nevidí texty agentúry B.
- Test: chýbajúce povinné pole → validačná chyba, žiadne volanie modelu.

ČO NEROBIŤ
- Nepridávaj novú npm závislosť (Ústava Čl. 6). Ak si myslíš, že je
  nevyhnutná, napíš mi to a čakaj.
- Nemeň existujúcu schému kreditov ani entitlementov.
- Negeneruj obrázky ani neintegruj portály — to nie je v rozsahu.
- Nezavádzaj vlastný UI kit.

VÝSTUP PRÁCE
Jeden PR na branchi feat/inzerat-generator, ≤400 riadkov logiky,
s rollback krokom v description a vyplnenou sekciou
"Nové závislosti: žiadne".
```

---

## Prečo je prompt postavený takto

**Pole „čo je na nej najslabšie" je najdôležitejšia vec v celom formulári.**
Bežné generátory slabinu zamlčia a text vyznie ako reklama. Text, ktorý
slabinu prizná a obrátí, má vyššiu konverziu, lebo čitateľ mu uverí —
a maklér stratí menej času na obhliadkach s ľuďmi, ktorí prídu a odídu
rozčarovaní. Toto je zároveň predajný argument pre Smolka.

**Verzovanie promptu v DB** — bez uloženej verzie promptu a modelu nikdy
nezistíš, či nová verzia texty zlepšila alebo zhoršila. Je to ten istý
princíp ako eval set pri retrievale: bez merania je ladenie viera.

**Kredity až po úspechu** — zákazník, ktorému sa odpočítali kredity za
zlyhané volanie modelu, napíše. A má pravdu.
