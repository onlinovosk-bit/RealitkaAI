/** Krátky blog – prečo Revolis.AI (marketing). */

export type BlogArticle = {
  slug: string;
  title: string;
  description: string;
  paragraphs: string[];
};

export const BLOG_ARTICLES: Record<string, BlogArticle> = {
  "preco-spolupraca-s-revolis": {
    slug: "preco-spolupraca-s-revolis",
    title: "Prečo sa oplatí spolupráca s Revolis.AI",
    description:
      "Jednotný pohľad na leady, menej ručnej práce a rýchlejšie rozhodovanie — bez výmeny celého CRM naraz.",
    paragraphs: [
      "Revolis.AI dopĺňa vašu existujúcu prácu: zhlukuje signály zo záujmu, navrhuje ďalší krok a drží tím zosúladený okolo priorít.",
      "Začíname s použiteľnými výstupmi už v prvých dňoch: denný plán, AI návrhy odpovedí a prepojenie na váš bežný proces.",
      "Ak potrebujete, dá sa stupňovať rozsah — od jedného tímu až po celú kanceláriu — podľa výsledkov, nie podľa sľubu na papieri.",
    ],
  },
  "ai-a-cas-maklera": {
    slug: "ai-a-cas-maklera",
    title: "AI a čas makléra: kde reálne ušetríte",
    description:
      "Prioritizácia príležitostí a pripravené podklady znamenajú menej hľadania v tabuľkách a viac času u klienta.",
    paragraphs: [
      "Namiesto desiatok otvorených tabov dostanete zoradené akcie podľa dopadu — menej prepínania, viac dokončených kontaktov.",
      "AI návrhy sú východiskom: vy ostávate pri rozhodnutí a komunikácii, systém drží konzistenciu a rýchlosť odpovede.",
      "Merateľný prínos sledujete cez aktivity a konverzné kroky v čase; nie je to len „pekný dashboard“.",
    ],
  },
  "roi-prve-tyzdne": {
    slug: "roi-prve-tyzdne",
    title: "Čo meriate prvé týždne po nasadení",
    description:
      "Jednoduché KPI: rýchlosť reakcie, pokrytie leadov a konzistencia follow-up — nie tisíc tabuliek.",
    paragraphs: [
      "Prvé týždne sú o návyku: tím dostáva jasný ranný plán a vidí, čo sa reálne pohlo vpred.",
      "Štatistiky sú nastavené tak, aby boli čitateľné maklérovi aj vedeniu — rovnaké čísla, iný level detailu.",
      "Optimalizácia prichádza po dátach: najprv stabilita procesu, potom jemné doladenie.",
    ],
  },
  "data-bezpecnost-a-dovera": {
    slug: "data-bezpecnost-a-dovera",
    title: "Údaje, bezpečnosť a dôvera",
    description:
      "Spracovanie v súlade s pravidlami pre osobné údaje a očakávaniami profesionálov v realitách.",
    paragraphs: [
      "V B2B kontexte riešime prístupové role, prácu s kontaktmi a auditovateľnosť krokov tam, kde to váš proces vyžaduje.",
      "Transparentnosť voči klientovi stavaná na faktoch: čo robí automatizácia a kde je vždy človek.",
      "Technické a organizačné opatrenia treba ladiť s vaším právnym rámcom — pri enterprise nasadení prejdeme checklist spolu.",
    ],
  },
};

export const BLOG_SLUGS = Object.keys(BLOG_ARTICLES);

export const BLOG_PROMO_ITEMS = BLOG_SLUGS.map((slug) => ({
  slug,
  href: `/blog/${slug}` as const,
  label: BLOG_ARTICLES[slug].title,
}));
