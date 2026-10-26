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
]

export function listPublishedArticles(): BlogArticle[] {
  return ARTICLES.filter((article) => article.published).sort((a, b) => {
    if (a.date === b.date) return a.slug.localeCompare(b.slug)
    return a.date < b.date ? 1 : -1
  })
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
