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

export const CRM_ARTICLE_SLUG = 'crm-pre-realitnych-maklerov' as const

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

Ak to chcete vyskúšať na vlastných dopytoch, Revolis je **14 dní zadarmo, bez platobnej karty**. Po skončení sa skúšobná verzia sama vypne a nič sa neúčtuje automaticky. [Vytvoriť účet na app.revolis.ai](https://app.revolis.ai/register)

---

*Zdroje: Národná banka Slovenska (Rýchly komentár zo 4. 8. 2026, Makroprudenciálny komentár – september 2026, RRE dashboard aktualizovaný 16. 10. 2026, tlačová správa z 30. 9. 2026), Európska centrálna banka (rozhodnutie z 10. 9. 2026). Ceny NBS sú priemerné ponukové ceny (United Classifieds, NARKS, NBS).*`,
  },
  {
    slug: CRM_ARTICLE_SLUG,
    title: 'CRM pre realitných maklérov: čo musí vedieť kancelária na Slovensku',
    description:
      'CRM pre realitných maklérov na Slovensku: dopyty z portálov, evidencia kontaktov a nehnuteľností, text inzerátu a prechod z CSV/XLSX.',
    keyword: 'CRM pre realitných maklérov',
    author: 'Andrej Ondruš',
    date: '2026-11-12',
    published: false,
    body: `# CRM pre realitných maklérov na Slovensku

Kancelária, ktorá hľadá **CRM pre realitných maklérov**, zvyčajne nerieši ďalší program na učenie. Rieši to, že dopyty ostávajú v schránke, kontakty v tabuľke a inzerát sa píše ručne, kým ide maklér na obhliadku. Tento text je praktický prehľad: čo musí kancelária na Slovensku vedieť, kým si CRM vyberie, a čo z toho Revolis naozaj robí.

## Prečo tabuľka a e-mailová schránka nestačia

Tabuľka je dobrá na zoznam. Schránka je dobrá na správy. Ani jedna z nich nie je evidencia obchodu.

Keď dopyt príde na spoločný e-mail kancelárie, ostane tam, kým ho niekto neprečíta a neprepíše. Ak ho asistentka vloží do hárku a maklér volá z telefónu, vzniknú tri oddelené záznamy: správa v schránke, riadok v tabuľke a pamäť makléra. V piatok popoludní, keď klient čaká na termín, nie je jasné, ktorý z nich platí.

Tabuľka nevie, z ktorého portálu dopyt prišiel, ku ktorému inzerátu patrí a či už niekto volal. Schránka nevie, ktorú nehnuteľnosť máte v ponuke. **CRM pre realitných maklérov** má spájať tri veci: správu, človeka a nehnuteľnosť. Ak to nerobí, ostávate pri prepisovaní.

Prepisovanie nie je drobnosť. Medzi doručením mailu a prvým hovorom vzniká medzera, v ktorej záujemca čaká. Kým hľadáte číslo v schránke, kolega z inej kancelárie už môže mať termín. Tabuľka túto medzeru nezmenší — len eviduje, že ste niečo neskôr dopísali.

## Dopyty z realitných portálov

Na Slovensku chodia dopyty predovšetkým e-mailom z inzertných portálov. Maklér ich potom ručne kopíruje: meno, telefón, odkaz na inzerát, veta od záujemcu. To je presne tá práca, ktorú tabuľka a schránka nezvládnu spoločne.

Revolis vie tieto portálové e-maily prijať a uložiť ako dopyt. Rozpozná bežné slovenské portály podľa textu správy alebo podľa odosielateľa — Nehnuteľnosti.sk, TopReality, Reality.sk, Bazoš aj Byty.sk — a z tela správy vyberie kontakt, identifikátor inzerátu a text dopytu. Dopyt teda nemusíte prepisovať zo schránky do hárku.

Čo to neznamená: Revolis za vás neodpovie namiesto vás bez vášho rozhodnutia. Správa ostáva vo vašej kancelárii. Úlohou CRM je dopyt uložiť tak, aby ste ho našli pri kontakte a pri nehnuteľnosti, nie aby žil iba v doručenej pošte.

Ak si CRM vyberáte, overte si to na konkrétnom maili z portálu, ktorý naozaj používate. Pýtajte sa: príde správa a v evidencii pribudne dopyt s menom a telefónom, alebo ostane v schránke ako doteraz?

## Evidencia kontaktov a nehnuteľností

CRM pre realitných maklérov musí evidovať dve knihy naraz.

Prvá je kniha ľudí: záujemcovia, predávajúci, volania, poznámky. V Revolise je to zoznam klientov a príležitostí kancelárie — meno, kontakt, zdroj, stav. Bez toho viete len to, čo je v schránke dnes, a zajtra to znova hľadáte.

Druhá je kniha nehnuteľností: byty, domy, pozemky, lokalita, parametre, stav ponuky. V Revolise má kancelária evidenciu nehnuteľností so zoznamom, filtrami a kartou ponuky. Text inzerátu a dopyt z portálu dávajú zmysel až vtedy, keď viete, ku ktorej nehnuteľnosti patria.

Ak evidujete len kontakty, viete komu volať, ale neviete, o čo. Ak evidujete len inzeráty v priečinku s fotkami, viete čo ponúkate, ale neviete, kto sa ozval. Kancelária potrebuje oboje na jednom mieste, inak maklér ráno skladá obraz z mailu, z Excelu a z pamäte.

Praktický test pred výberom: otvorte kartu človeka a kartu nehnuteľnosti. Vidíte históriu kontaktu pri človeku a parametre ponuky pri nehnuteľnosti? Ak nie, ostávate pri tabuľke, len v inom obale.

## Text inzerátu

Písanie inzerátu žerie čas, ktorý patrí na náber a obhliadku. Maklér má parametre: typ, lokalitu, výmeru, cenu, stav, vybavenie. Z nich treba zložiť text na portál a často aj na sociálne siete. Keď sa to robí z čistého papiera, inzerát ide von neskôr a náber čaká.

Revolis má generátor inzerátu: zadáte parametre nehnuteľnosti a pripraví sa text na portál, Facebook, Instagram a e-mail. Text sa dá pred použitím upraviť a úpravy uložiť. Nie je to tlačidlo „zverejni na portál“ — je to príprava textu z údajov, ktoré v kancelárii už máte.

Ak CRM sľubuje inzerát, overte dve veci. Po prvé, či text vzniká z parametrov, nie z vymysleného marketingu. Po druhé, či maklér text vidí a upraví skôr, ako ho niekam vloží. Generátor, ktorý sa nedá opraviť, je pre kanceláriu riziko, nie úspora.

## Prechod z CSV/XLSX alebo z RealSoftu

Nové CRM bez starých dát je prázdna skriňa. Kancelárie bežne prichádzajú s tabuľkou kontaktov alebo s exportom z doterajšieho systému. Ľudia prechádzajú aj z RealSoftu.

Revolis má import príležitostí z CSV (Excel, Google Sheets) a sprievodcu univerzálneho importu, ktorý vie prečítať CSV aj súbor .xlsx. V sprievodcovi je medzi zdrojmi aj RealSoft: stĺpce sa mapujú na kontakty a súvisiace polia. Prechod teda nie je sľub, že to niekto niekedy prenesie, ale import, ktorý kancelária spustí vo vlastnom účte.

Overte si pred výberom, či viete priniesť aspoň kontakty. Ak ostanú v starom systéme, budete prvý mesiac žiť v dvoch evidenciách a prepisovanie sa len presunie, nezmizne. CSV a XLSX sú praktický most z tabuľky; kto ide z RealSoftu, potrebuje, aby ten most v novom CRM existoval.

## Čo overiť pred výberom CRM

Pred rozhodnutím si kancelária overí šesť vecí, nie prezentáciu.

- **Dopyty z portálových e-mailov.** Príde skutočný mail z portálu a uloží sa ako dopyt s kontaktom, alebo to ostane ručné prepisovanie?
- **Kontakty.** Máte zoznam ľudí, nie len schránku?
- **Nehnuteľnosti.** Máte kartu ponuky s parametrami, nie len priečinok s fotkami?
- **Text inzerátu.** Vzniká z parametrov a dá sa upraviť pred použitím?
- **Import.** Viete priniesť CSV, XLSX alebo export z RealSoftu bez toho, aby ste začínali od nuly?
- **Skúška bez karty.** Revolis môžete vyskúšať 14 dní zadarmo, bez platobnej karty. Ak po nákupe nebudete spokojní, platí jediná garancia, ktorú uvádzame: **100 % peňazí späť do 30 dní**.

Nepýtajte sa najprv na umelú inteligenciu. Pýtajte sa, kde dnes leží dopyt, kontakt a ponuka — a koľko prepisovania ubudne v prvý týždeň. Ak na to CRM nemá jasnú odpoveď, tabuľka a schránka ostanú hlavnou evidenciou aj po nákupe.

## Čo to znamená pre makléra

Ráno nemáte hľadať, ktorý mail ešte nikto neprepisal. Dopyt z portálu má byť v evidencii. Keď idete na náber, parametre nehnuteľnosti máte v karte a text inzerátu viete pripraviť z nich, nie z čistého papiera. Keď prechádzate z tabuľky alebo z RealSoftu, kontakty idú importom, nie ručným prepisovaním po večeroch.

**CRM pre realitných maklérov** na Slovensku teda nie je tabuľka s krajším vzhľadom. Je to miesto, kde sa stretne schránka, človek a nehnuteľnosť — a kde maklérovi ostane čas na obhliadku.

Ak to chcete skúsiť na vlastných dopytoch, Revolis je **14 dní zadarmo, bez platobnej karty**. Po skončení sa nič neúčtuje automaticky. Ak by ste neskôr neboli spokojní, platí **100 % peňazí späť do 30 dní**. [Vytvoriť účet na app.revolis.ai](https://app.revolis.ai/register)
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
