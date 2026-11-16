export type BlogArticle = {
  slug: string
  title: string
  description: string
  keyword: string
  author: string
  date: string
  published: boolean
  body: string
}

export const BLOG_INDEX_PATH = '/blog' as const

export const FIRST_ARTICLE_SLUG = 'ceny-nehnutelnosti-2026-sadzby-nove-ltv' as const

export const CRM_CHECKLIST_ARTICLE_SLUG = 'crm-pre-realitnych-maklerov-ako-vybrat' as const

export const AI_LISTING_ARTICLE_SLUG = 'ai-inzerat-nehnutelnosti' as const

export const BLOG_INDEX_INTRO =
  'Blog Revolis je pre maklérov, ktorí denne pracujú so slovenským trhom nehnuteľností. Píšeme o hypotékach a sadzbách, o legislatíve okolo úverov a predaja a o tom, ako to ovplyvní náber, obhliadku aj rozhovor s kupujúcim. Nájdete tu aj praktické tipy k dopytom, evidencii kontaktov a príprave inzerátu — bez slovníka pre IT oddelenie. Texty majú slúžiť pred hovorom s klientom: či sa oplatí čakať na novú sadzbu, ako sa pýtať na vlastné zdroje, alebo ako zložiť inzerát z parametrov, ktoré už kancelária má. Neporovnávame programy podľa mena a nesľubujeme čísla, ktoré nevieme doložiť. Články sú písané po slovensky a určené ľuďom v teréne, nie marketingovému oddeleniu. Cieľ je prehľad trhu a postup, ktorý sa dá použiť v kancelárii ešte v ten istý deň.'

const MONTHS_SK = [
  'januára',
  'februára',
  'marca',
  'apríla',
  'mája',
  'júna',
  'júla',
  'augusta',
  'septembra',
  'októbra',
  'novembra',
  'decembra',
] as const

const ARTICLES: BlogArticle[] = [
  {
    slug: FIRST_ARTICLE_SLUG,
    title: 'Ceny nehnuteľností 2026: spomalenie, sadzby a nové LTV',
    description:
      'NBS: ceny bývania v Q2 2026 rástli najpomalšie za vyše dva roky, hypotéky zdraželi a od 2027 platia nové LTV limity. Čo to znamená pre makléra?',
    keyword: 'ceny nehnuteľností 2026',
    author: 'Andrej Ondruš',
    date: '2026-10-19',
    published: true,
    body: `# Ceny nehnuteľností 2026: rast spomalil, hypotéky zdraželi a prichádzajú nové pravidlá

Jeseň 2026 priniesla na slovenský realitný trh tri správy naraz. Ceny bývania stále rastú, no najpomalšie za viac ako dva roky. Hypotéky po dlhšom čase zdraželi. A Národná banka Slovenska (NBS) od januára 2027 mení pravidlá, koľko z ceny nehnuteľnosti môže banka požičať. Pre makléra to znamená iných kupujúcich, iné otázky a iné tempo obchodov. Poďme na čísla, všetky z primárnych zdrojov.

## Ceny bývania: stále hore, ale pomalšie

Podľa NBS dosiahla priemerná ponuková cena nehnuteľností na bývanie v 2. štvrťroku 2026 **3 041 €/m²**. Oproti 1. štvrťroku je to **o 1,2 % viac**, medziročne **o 9,5 %**. Ešte v 1. štvrťroku 2026 bol medziročný rast 11,3 %. NBS to zhrnula jasne: ceny rástli, „avšak najpomalšie za viac než dva roky“.

### Byty verzus domy

- **Byty:** priemerne **3 430 €/m²**, medzištvrťročne **+1,6 %**, medziročne **+10,2 %**.
- **Domy:** priemerne **2 163 €/m²**, medzištvrťročne **+2,1 %**, medziročne len **+3,1 %**.

Rast ťahali novostavby, ktoré za štvrťrok zdraželi o **2,9 %**, kým staršie nehnuteľnosti len o **0,7 %**. Počet inzerátov sa medziročne zvýšil prvý raz od roku 2023, no iba o **0,2 %**. Ponuka teda stojí takmer na mieste už zhruba tri roky.

### Regióny sa rozchádzajú

Najrýchlejšie rástli ceny v **Košickom (+4,2 %)**, **Nitrianskom (+2,9 %)** a **Trnavskom kraji (+2,4 %)**, vždy oproti 1. štvrťroku. Naopak, **Prešovský kraj zlacnel o vyše 4 %** po mimoriadne silnom začiatku roka a **Banskobystrický o 1,3 %**. NBS pritom upozorňuje, že v samotných mestách Prešov a Banská Bystrica ceny rástli ďalej. Priemer kraja stiahli nadol iné okresy.

Najdrahší zostáva Bratislavský kraj s priemerom **3 882 €/m²**. NBS však píše, že v Bratislave ceny „pravdepodobne dosiahli strop“ a rastú podobným tempom ako v menších mestách. Silnejší rast sa presúva do krajských miest, kým na vidieku sa podľa NBS „už črtá klesajúci trend“.

Leto pomalší rast nepotvrdilo jednoznačne. Podľa septembrového Makroprudenciálneho komentára NBS boli **na konci augusta 2026 ponúkané byty medziročne drahšie o 13,8 %**, v Bratislave **o 8,1 %**.

## Hypotéky: koniec lacnejších sadzieb

Klesanie úrokov sa na jar zastavilo. Podľa NBS stúpla **priemerná sadzba nových hypoték z 3,5 % v marci na 3,9 % v auguste 2026**. To je mierne nad priemerom EÚ, ktorý je **3,6 %**. NBS ako hlavnú príčinu uvádza globálny rast sadzieb a rizikových prirážok, ktorý súvisí s konfliktom na Blízkom východe.

Rovnakým smerom ide aj Európska centrálna banka. **10. septembra 2026 zvýšila kľúčové sadzby o 0,25 percentuálneho bodu.** Depozitná sadzba je od **16. septembra 2026 na 2,50 %**, sadzba hlavných refinančných operácií na **2,65 %**. ECB vo svojich projekciách počíta s infláciou v eurozóne **3,0 % v roku 2026** a **2,5 % v roku 2027**. Ďalšie rozhodnutie o sadzbách príde **29. októbra 2026**.

Dopyt po hypotékach zatiaľ výrazne neklesol. Medziročný rast hypoték sa medzi marcom a augustom 2026 zrýchlil **z 8,3 % na 8,8 %**. Podľa NBS za tým stojí najmä to, že kvôli vyšším cenám si ľudia požičiavajú vyššie sumy. Zároveň sa spomalilo refinancovanie, ktoré vyvrcholilo v apríli 2026.

### Dostupnosť bývania sa zhoršila

NBS vo svojom RRE dashboarde (aktualizovanom 16. októbra 2026) uvádza, že v 2. štvrťroku 2026 sa **index dostupnosti bývania zhoršil o 2,6 bodu**. Mzdy rástli pomalšie ako ceny a k tomu stúpli úroky. Najviac sa dostupnosť zhoršila v Košickom kraji, mierne sa zlepšila len v Prešovskom kraji vďaka korekcii cien.

## Nové pravidlá hypoték od 1. januára 2027

NBS 30. septembra 2026 oznámila zmenu limitov **LTV**, teda maximálnej časti hodnoty nehnuteľnosti, ktorú možno financovať úverom:

- **Do 35 rokov, prvé bývanie: až 90 %** (doteraz 80 %). Platí, ak má žiadateľ pri podaní žiadosti najviac 35 rokov, žiadny z dlžníkov nevlastní rezidenčnú nehnuteľnosť a úver slúži na kúpu alebo výstavbu.
- **Tretia a ďalšia nehnuteľnosť: najviac 70 %** (doteraz 80 %). Týka sa dlžníkov, ktorí spolu vlastnia dve a viac rezidenčných nehnuteľností.
- **Ostatní: 80 %** bez zmeny.

Pravidlá začnú platiť **od 1. januára 2027 s postupným nábehom**. Banky musia začať v katastri overovať, koľko nehnuteľností žiadateľ vlastní. Výnimka, ktorá doteraz umožňovala poskytnúť **20 % úverov** s LTV do 90 %, sa zúži na **7 %**. Dôležité: **90 % nie je automatický nárok.** NBS určuje len horný limit a o konkrétnom úvere rozhoduje banka.

Prečo NBS mení pravidlá? Podľa nej v roku 2025 **viac ako polovicu bytov a domov kúpili ľudia, ktorí už aspoň jednu nehnuteľnosť mali**, a **každá piata hypotéka** smeruje klientom s minimálne dvoma nehnuteľnosťami.

## Čo to znamená pre makléra

**1. Mladým kupujúcim sa od januára uľahčí štart.** Kupujúci do 35 rokov, ktorí doteraz nemali našetrených 20 %, budú od roku 2027 potrebovať menej vlastných zdrojov. Časť z nich preto môže s kúpou počkať na nové pravidlá. Vytvorte si zoznam týchto záujemcov už teraz a v decembri sa im ozvite. Nesľubujte im však 90 %, o tom rozhoduje banka.

**2. Investori budú potrebovať viac hotovosti.** Kto už vlastní dve nehnuteľnosti, od 2027 dostane na ďalšiu najviac 70 %. Niektorí investori môžu chcieť kúpiť ešte tento rok. Iní budú pri cene viac vyjednávať. Pýtajte sa na počet vlastnených nehnuteľností hneď pri prvom kontakte.

**3. Cenotvorba musí vychádzať z lokality.** Krajské mestá rastú, ceny domov medziročne pridali len 3,1 %, na vidieku sa črtá pokles a Bratislava spomaľuje. Celoslovenský priemer +9,5 % sa nehodí ako argument pri náberovom stretnutí na vidieku ani v Poprade. Pri náberoch a cenových debatách pracujte s dátami za konkrétny kraj a typ nehnuteľnosti.

**4. Drahšie hypotéky znamenajú dlhšie rozhodovanie.** Pri sadzbách okolo 3,9 % a zhoršenej dostupnosti kupujúci častejšie čakajú na banku. Viac obchodov sa môže rozpadnúť na financovaní. Keď na záujemcu zabudnete čo i len na týždeň, pokojne ho môže prebrať konkurencia.

**5. Sledujte 29. október.** Rozhodnutie ECB ovplyvní nálady klientov aj ponuky bánk. Pripravte si krátku a vecnú správu pre klientov, ktorí sa rozhodujú o kúpe.

## Majte prehľad o tom, kto je pripravený kúpiť

Keď trh spomaľuje a financovanie sa sťažuje, víťazí maklér, ktorý vie, komu zavolať ako prvému. **Revolis** zbiera dopyty z Nehnuteľnosti.sk, Topreality, Reality.sk, Bazoša aj e-mailu na jedno miesto. Každému záujemcovi pridelí **skóre pripravenosti kúpy** a každé ráno vám pripraví **denný prehľad priorít**. Odpovede a následné správy nachystá, vy ich len schválite. Bez vás neodíde nič.

Ak chcete najprv vidieť, ako to vyzerá, [pozrite si ukážku Revolis](/demo). Ak to chcete vyskúšať na vlastných dopytoch, Revolis je **14 dní zadarmo, bez platobnej karty**. Po skončení sa skúšobná verzia sama vypne a nič sa neúčtuje automaticky. [Vytvoriť účet na app.revolis.ai](https://app.revolis.ai/register)

---

*Zdroje: Národná banka Slovenska (Rýchly komentár zo 4. 8. 2026, Makroprudenciálny komentár – september 2026, RRE dashboard aktualizovaný 16. 10. 2026, tlačová správa z 30. 9. 2026), Európska centrálna banka (rozhodnutie z 10. 9. 2026). Ceny NBS sú priemerné ponukové ceny (United Classifieds, NARKS, NBS).*`,
  },
  {
    slug: CRM_CHECKLIST_ARTICLE_SLUG,
    title: 'Ako vybrať CRM pre realitných maklérov: 10 otázok pred rozhodnutím',
    description:
      'Desať otázok pred výberom CRM pre realitných maklérov: dopyty, kontakty, inzerát, import a skúška bez karty.',
    keyword: 'ako vybrať CRM pre realitných maklérov',
    author: 'Andrej Ondruš',
    date: '2026-11-16',
    published: false,
    body: `# Ako vybrať CRM pre realitných maklérov: 10 otázok pred rozhodnutím

Kancelária zvyčajne nekupuje ďalší program. Kupuje odpoveď na to, či dopyt z portálu skončí v evidencii, alebo v schránke, kým maklér stojí na obhliadke. Tento text je výberový checklist: desať otázok, ktoré si položte na ukážke alebo vo vlastnom účte, kým sa rozhodnete. Nie je to prehľad toho, čo má realitné CRM všeobecne vedieť. Tu ide o praktický výber.

Hlavná otázka tohto checklistu je **ako vybrať CRM pre realitných maklérov**. Otázky sú zámerne konkrétne: ide o to, čo uvidíte na obrazovke, nie o sľub v prezentácii.

## Prečo desať otázok namiesto porovnávacej tabuľky

Porovnávanie programov podľa mena kancelárii nepomôže, ak nevie, ktorý problém má dnes. Maklér stratí čas tam, kde dopyt ostane v maili, inzerát sa píše z čistého papiera a kontakty žijú v súkromnom hárku. Checklist nižšie tie miesta pomenúva. Každú otázku overte na vlastných dátach, nie na ukážkovom účte s vymyslenými menami.

Tabuľka je dobrá na zoznam. Schránka je dobrá na správy. Ani jedna z nich nie je evidencia obchodu. Keď dopyt príde na spoločný e-mail, ostane tam, kým ho niekto neprečíta a neprepíše. Ak ho asistentka vloží do hárku a maklér volá z telefónu, vzniknú tri oddelené záznamy: správa v schránke, riadok v tabuľke a pamäť makléra. V piatok popoludní, keď klient čaká na termín, nie je jasné, ktorý z nich platí. Medzi doručením mailu a prvým hovorom vzniká medzera, v ktorej záujemca čaká.

Ak na otázku nedostanete jasnú odpoveď do niekoľkých minút, ostávate pri tom, čo už máte — schránke a tabuľke.

## 1. Kam dnes padne dopyt, keď maklér nie je pri počítači?

Opýtajte sa: príde správa z portálu a niekto v kancelárii ju nájde v evidencii, alebo ostane v osobnej schránke, kým sa maklér vráti z terénu? CRM, ktoré dopyt neuloží, vás vráti k prepisovaniu. Overte to na maili, ktorý naozaj používate, nie na vete, že portály sú podporované.

## 2. Uloží sa portálový e-mail ako dopyt s kontaktom?

Na Slovensku chodia dopyty predovšetkým e-mailom z inzertných portálov. Maklér ich inak ručne kopíruje: meno, telefón, odkaz na inzerát, veta od záujemcu. Revolis vie tieto správy prijať a uložiť ako dopyt: rozpozná bežné portály podľa textu alebo odosielateľa — Nehnuteľnosti.sk, TopReality, Reality.sk, Bazoš aj Byty.sk — a z tela vyberie kontakt, identifikátor inzerátu a text.

To nie je tlačidlo na zverejnenie ponuky ani odpoveď namiesto vás. Správa ostáva vo vašej kancelárii. Úlohou CRM je dopyt uložiť tak, aby ste ho našli pri kontakte a pri nehnuteľnosti, nie aby žil iba v doručenej pošte.

Test: ukážte skutočný mail z vášho portálu. Pribudne dopyt s menom a telefónom, alebo ostane v schránke?

## 3. Vidíte na karte človeka aj nehnuteľnosť?

CRM pre realitných maklérov musí evidovať dve knihy naraz. Prvá je kniha ľudí: záujemcovia, predávajúci, volania, poznámky. V Revolise je to zoznam klientov a príležitostí — meno, kontakt, zdroj, stav. Druhá je kniha nehnuteľností: byty, domy, pozemky, lokalita, parametre, stav ponuky. V Revolise má kancelária evidenciu so zoznamom, filtrami a kartou ponuky.

Ak evidujete len kontakty, viete komu volať, ale neviete, o čo. Ak evidujete len inzeráty v priečinku s fotkami, viete čo ponúkate, ale neviete, kto sa ozval. Text inzerátu a dopyt z portálu dávajú zmysel až vtedy, keď viete, ku ktorej nehnuteľnosti patria.

Praktický test: otvorte kartu človeka a kartu ponuky. Vidíte históriu kontaktu a parametre? Ak nie, ostávate pri tabuľke v inom obale.

## 4. Vzniká text inzerátu z parametrov, alebo z čistého papiera?

Pýtajte sa, či text vzniká z typu, lokality, výmery, ceny, stavu a vybavenia, ktoré už máte. Revolis má generátor inzerátu: zadáte parametre a pripraví sa text na portál, Facebook, Instagram a e-mail. Nie je to automatické zverejnenie na portál. Overte, že text vzniká z parametrov, nie z vymysleného marketingu.

## 5. Dá sa text pred použitím upraviť?

Generátor, ktorý sa nedá opraviť, je pre kanceláriu riziko. V Revolise sa text pred použitím upraví a úpravy sa uložia. Overte, že maklér vidí návrh skôr, než ho niekam vloží.

## 6. Ako prenesiete kontakty, ktoré už máte?

Nové CRM bez starých dát je prázdna skriňa. Kancelárie bežne prichádzajú s tabuľkou kontaktov alebo s exportom z doterajšieho systému. Ľudia prechádzajú aj z RealSoftu.

Revolis má import príležitostí z CSV (Excel, Google Sheets) a sprievodcu, ktorý prečíta CSV aj súbor .xlsx. V sprievodcovi je medzi zdrojmi aj RealSoft: stĺpce sa mapujú na kontakty a súvisiace polia. Prechod teda nie je sľub, že to niekto niekedy prenesie, ale import, ktorý kancelária spustí vo vlastnom účte.

Overte, či viete priniesť aspoň kontakty. Ak ostanú v starom systéme, prvý mesiac budete žiť v dvoch evidenciách a prepisovanie sa len presunie, nezmizne.

## 7. Odíde správa klientovi bez vášho schválenia?

Toto je otázka dôvery, nie módneho slova o automatizácii. V Revolise sa návrh odpovede na nový dopyt uloží ako koncept. Odoslanie je rozhodnutie makléra — spracovanie dopytu samo o sebe správu neposiela. Ak vám niekto sľúbi, že systém odpovie za vás, pýtajte sa, kto stlačí odoslať.

## 8. Pracuje kancelária v jednom účte?

Keď maklér odíde, majú ostáť dopyty v kancelárii, nie v súkromnej schránke. Pýtajte sa, či tím vidí spoločnú evidenciu. Táto otázka nie je o cene sídla. Je o tom, či kontakty patria kancelárii.

## 9. Ako vyzerá skúška bez karty?

Revolis môžete vyskúšať 14 dní zadarmo, bez platobnej karty. Po skončení skúšobná verzia prejde do režimu len na čítanie a nič sa neúčtuje automaticky. Overte, či naozaj nemusíte zadávať kartu a čo sa stane s dátami po skončení skúšobnej doby.

## 10. Nájdete človeka, keď klient zavolá?

Praktický test: kolega povie meno alebo telefón z dnešného dopytu. Nájdete kartu do chvíle, kým hovor zvoní, alebo hľadáte v schránke? Ak CRM toto nezvládne, ostatné funkcie sú ozdoba.

## Čo to znamená pre makléra

Pred výberom si kancelária overí desať vecí na vlastných dátach, nie na slajde. Dopyt z portálu má skončiť v evidencii, nie v troch oddelených záznamoch. Človek a nehnuteľnosť majú byť na jednom mieste. Text inzerátu má vzniknúť z parametrov a má sa dať opraviť. Kontakty z CSV, XLSX alebo RealSoftu majú ísť importom. Správa klientovi má čakať na vás.

Ak chcete checklist vyskúšať na vlastných dopytoch, Revolis je **14 dní zadarmo, bez platobnej karty**. Po skončení sa nič neúčtuje automaticky. [Vytvoriť účet na app.revolis.ai](https://app.revolis.ai/register)
`,
  },
  {
    slug: AI_LISTING_ARTICLE_SLUG,
    title: 'AI inzerát nehnuteľnosti: ako ho pripraviť rýchlo a bez chýb',
    description:
      'Ako pripraviť AI inzerát nehnuteľnosti z parametrov: portál, sociálne siete a e-mail, bez vymyslených faktov.',
    keyword: 'AI inzerát nehnuteľnosti',
    author: 'Andrej Ondruš',
    date: '2026-11-16',
    published: false,
    body: `# AI inzerát nehnuteľnosti: ako ho pripraviť rýchlo a bez chýb

Maklér nestráca obchody na obhliadke. Stráca ich v hodine, kým z parametrov bytu skladá text na portál, potom inú verziu na Facebook a ešte jednu do e-mailu záujemcom. **AI inzerát nehnuteľnosti** má tú hodinu skrátiť. Má ale jednu podmienku: text musí sedieť na fakty, ktoré kancelária naozaj má. Inak ide von sľub, ktorý na obhliadke neobstojí.

Tento text je postup, nie recenzia nástrojov. Opisuje, čo pripraviť pred generovaním, čo model nesmie vymyslieť, a ako vyzerá kontrola pred zverejnením. Cieľ nie je dlhší odsek. Cieľ je inzerát, ktorý ide von v deň náberu a na obhliadke obstojí.

## Čo je AI inzerát nehnuteľnosti

AI inzerát nehnuteľnosti nie je tlačidlo, ktoré ponuku samo zverejní na portáli. Je to návrh textu z parametrov: typ, lokalita, výmera, cena, stav, vybavenie, prípadne poznámky makléra. Z nich má vzniknúť text pre klienta — na portál, na sociálne siete a do e-mailu — nie poznámka o tom, čo v zadaní chýba.

Ak zadáte tri slová a čakáte bohatý opis školy, MHD a tichej lokality, dostanete vymyslený inzerát. Rýchly inzerát bez chýb vzniká opačne: najprv fakty, potom veta.

## Najprv parametre, potom text

Pred generovaním si kancelária zloží to, čo už vie:

- typ (byt, dom, pozemok) a lokalita
- výmera, izby, podlažie
- cena
- stav (novostavba, po rekonštrukcii, pôvodný stav)
- vybavenie, ktoré je naozaj na mieste
- meno a telefón makléra, ak majú byť v texte

Chýbajúci údaj je lepšie označiť ako chýbajúci, než ho doplniť odhadom. Pri príprave v Revolise generátor berie štruktúrované polia nehnuteľnosti a z nich skladá text. Ak chýba fakt, ktorý by text posilnil, patrí to do doplnenia pre makléra — nie do vety pre kupujúceho.

## Portál, sociálne siete a e-mail nie sú ten istý text

Jeden odsek skopírovaný trikrát vyzerá ako šablóna. Portál potrebuje vecný opis s parametrami. Facebook potrebuje kratší text. Instagram potrebuje krátku caption. E-mail záujemcom má iný tón ako inzerát na webe.

Revolis pripraví z tých istých parametrov text na portál, Facebook, Instagram a e-mail. Maklér si vyberie, čo použije. Nie je to sľub, že sa inzerát sám objaví na portáli.

## Čo model nesmie vymyslieť

Najčastejšia chyba AI inzerátu nehnuteľnosti nie je slabá slovenčina. Je to veta, ktorá na obhliadke padne. Pravidlo je tvrdé: každé faktické tvrdenie musí ísť odvodiť zo vstupu. Bez podkladu nepatrí do textu vzdialenosť v minútach, blízkosť školy, tichá lokalita, materiál steny, počet parkovacích miest, právna čistota, sľub výnosu ani telefón, ktorý ste nezadali.

V Revolise platí to isté pri generovaní: model má písať z parametrov. Charakter lokality — či ide o sídlisko, vidiek alebo centrum — sa použije len ak ho maklér zadá. Bez tohto údaja sa povaha miesta nedomýšľa. Chýbajúci údaj má skončiť ako doplnenie pre makléra, nie ako veta pre kupujúceho.

Radšej kratší pravdivý text než dlhší s vymyslenou školou za rohom.

## Kontrola pred zverejnením

AI inzerát nehnuteľnosti končí kontrolou, nie odoslaním. Prejdite návrh ako pri vlastnom texte.

- Sedí výmera, cena a lokalita s kartou ponuky?
- Nie je v prvej vete scéna, ktorú ste na mieste nevideli?
- Je v závere vaše meno a telefón, nie vymyslený kontakt?
- Ostali v texte miesta na doplnenie, ktoré ste ešte nevyplnili?

V Revolise sa návrh pred použitím upraví a úpravy sa uložia. To je tá istá brána ako pri dopyte: systém pripraví, maklér rozhodne.

## Ako postupovať v kancelárii

- Doplňte kartu nehnuteľnosti skôr, než otvoríte prázdny dokument.
- Vygenerujte text z parametrov, nie z marketingového odseku v veľkých písmenách.
- Upravte tón a fakty, ktoré poznáte z obhliadky.
- Až potom vložte text na portál alebo do správy.

Tento postup šetrí čas práve preto, že nezačínate z nuly a zároveň nenecháte model dopísať mesto, ktoré v zadaní nie je. **AI inzerát nehnuteľnosti** má zmysel, keď vzniká z údajov, ktoré kancelária vie doložiť.

## Čo to znamená pre makléra

Rýchly inzerát nie je dlhší odsek. Je to text, ktorý ide von v deň náberu a obstojí na obhliadke. Má zmysel, keď vzniká z parametrov, keď sa dá opraviť a keď neobsahuje vymyslenú školu, MHD ani výnos.

Ak chcete tento postup vyskúšať na vlastnej ponuke, Revolis je **14 dní zadarmo, bez platobnej karty**. Po skončení sa nič neúčtuje automaticky. [Vytvoriť účet na app.revolis.ai](https://app.revolis.ai/register)
`,
  },
]

export function listPublishedArticles(): BlogArticle[] {
  return ARTICLES.filter((article) => article.published).sort((a, b) => {
    if (a.date === b.date) return a.slug.localeCompare(b.slug)
    return a.date < b.date ? 1 : -1
  })
}

export function getArticle(slug: string): BlogArticle | undefined {
  return ARTICLES.find((article) => article.slug === slug)
}

export function getPublishedArticle(slug: string): BlogArticle | undefined {
  return listPublishedArticles().find((article) => article.slug === slug)
}

export function blogArticlePath(slug: string): string {
  return `${BLOG_INDEX_PATH}/${slug}`
}

export function getPublishedBlogPaths(): string[] {
  return [BLOG_INDEX_PATH, ...listPublishedArticles().map((article) => blogArticlePath(article.slug))]
}

export function formatBlogDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const monthName = MONTHS_SK[month - 1]
  if (!year || !month || !day || !monthName) return isoDate
  return `${day}. ${monthName} ${year}`
}
