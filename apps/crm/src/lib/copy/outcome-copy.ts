/**
 * Outcome messaging kit — Clay reframe + Livappy-style time/certainty promises.
 * Prefer these strings over feature/tech language ("AI CRM", "automatizácia").
 */

export const OUTCOME = {
  brandPromise: "Konečne poriadok — a istota, kde dnes zarobíte.",
  heroHeadline: "Za 30 sekúnd viete, komu volať",
  heroSubhead:
    "Otvorte Revolis a uvidíte: komu volať, koho nestratiť a kde zarobíte najviac.",
  dashboardHeadline: "Kde dnes zarobíte najviac?",
  dashboardSubhead:
    "Jedna priorita. Žiadne hádanie. Podľa dát vo vašom CRM — nie podľa pocitu.",
  startTodayCta: "Začať dnešný deň",
  showOpportunitiesCta: "Ukáž mi dnešné príležitosti",
  firstAuditTitle: "60-sekundový prehľad vašich dát",
  firstAuditSubtitle:
    "Za chvíľu uvidíte zabudnutých klientov, ohrozené obchody a tri kroky na dnes.",
  barrierRemovers: [
    "Bez zdĺhavého nastavovania",
    "Bez školení",
    "Bez migrácie počas týždňov",
    "Výsledky už prvý deň",
  ] as const,
  timePromises: [
    "Maklér vie, komu volať — za 30 sekúnd",
    "Prvé priority po otvorení CRM — za 15 sekúnd",
    "Príprava na stretnutie — za 60 sekúnd",
  ] as const,
  emptyNoLeads:
    "Zatiaľ nemáte kontakty v CRM. Importujte ich — prehľad hodnoty uvidíte do 60 sekúnd.",
  emptySparse:
    "Málo údajov na spoľahlivý odhad. Doplňte kontakty alebo rozpočty — čísla sa spresnia.",
  tickerItems: [
    "Za 30 sekúnd viete, komu volať",
    "Už nikdy nezabudnete na dôležitého klienta",
    "Kde dnes zarobíte najviac",
    "Bez týždňovej migrácie — výsledky prvý deň",
    "Konečne poriadok v pipeline",
    "Otvorte Revolis. Viete, čo robiť.",
  ] as const,
  trustBar: [
    "Bez školení",
    "30-dňová garancia vrátenia",
    "Zrušenie kedykoľvek",
    "GDPR · Slovenský server",
  ] as const,
  landingProof: [
    {
      label: "Prvá priorita po otvorení",
      value: "≤ 30 s",
      note: "Komu volať — podľa dát vo vašom CRM",
    },
    {
      label: "Follow-up bez zabudnutia",
      value: "1 zoznam",
      note: "Jedna fronta akcií namiesto desiatok panelov",
    },
    {
      label: "Hodnota z vašich dát",
      value: "1. deň",
      note: "Prehľad zabudnutých a ohrozených klientov po importe",
    },
  ] as const,
} as const;

export type OutcomeCopy = typeof OUTCOME;
