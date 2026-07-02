/** Franšízové / reťazcové brandy — automatická diskvalifikácia. */
export const FRANCHISE_BRANDS = [
  "re/max",
  "remax",
  "keller williams",
  "century 21",
  "coldwell banker",
  "sotheby",
  "engel & völkers",
  "engel & volkers",
  "better homes",
  "era realit",
] as const;

/** Domény portálov — len detekcia linkov v HTML, NIKDY fetch. */
export const PORTAL_LINK_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "nehnutelnosti.sk", pattern: /nehnutelnosti\.sk/i },
  { name: "topreality.sk", pattern: /topreality\.sk/i },
  { name: "reality.sk", pattern: /reality\.sk/i },
  { name: "bazos.sk", pattern: /bazos\.sk/i },
  { name: "realityscan.sk", pattern: /realityscan\.sk/i },
  { name: "zoznamrealit.sk", pattern: /zoznamrealit\.sk/i },
];

/** Osobné e-mailové domény — neukladáme ako outreach kontakt. */
export const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "azet.sk",
  "zoznam.sk",
  "centrum.sk",
  "post.sk",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
]);

/** CRM / chat widget signály v HTML. */
export const CRM_SIGNAL_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "intercom", pattern: /intercom/i },
  { name: "hubspot", pattern: /hubspot|hs-scripts/i },
  { name: "livechat", pattern: /livechat/i },
  { name: "tawk", pattern: /tawk\.to/i },
  { name: "smartsupp", pattern: /smartsupp/i },
  { name: "pipedrive", pattern: /pipedrive/i },
  { name: "salesforce", pattern: /salesforce/i },
];

export const USER_AGENT = "RevolisBot/1.0 (+https://revolis.ai/bot)";

export const FETCH_TIMEOUT_MS = 10_000;
export const RATE_LIMIT_MS_PER_DOMAIN = 2_000;
export const MAX_SUBPAGES = 5;

export const TEAM_PAGE_HINTS = [
  "/tim",
  "/team",
  "/nasa-kancelaria",
  "/o-nas",
  "/onas",
  "/kontakt",
  "/makleri",
  "/makléri",
  "/agents",
  "/about",
];
