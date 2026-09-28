import { createHash } from "crypto";

export const PARSER_VERSION = "1.3";
export const DATASET_VERSION = "v1.1";

export interface AcquireEvent {
  eventId?: string;
  rawHash?: string;
  parserVersion: string;
  datasetVersion: string;
  extractionConfidence: number;
  sourceType: "Portal" | "Website" | "Social" | "Unknown";
  source: string;
  eventKind: "inquiry" | "reply" | "unsubscribe" | "update" | "spam" | "unknown";
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  listingPortalId?: string | null;
  listingInternalId?: string | null;
  listingTitle?: string | null;
  inquiryText?: string | null;
  inquiryIntent?: string | null;
  intentReason?: string | null;
  receivedAt?: string | null;
  warnings: string[];
}

const SOURCE_RULES: [RegExp, AcquireEvent["sourceType"], string][] = [
  [/nehnutelnosti\.sk|Nehnuteľnosti\.sk/i, "Portal", "Nehnuteľnosti.sk"],
  [/bazos\.sk/i, "Portal", "Bazoš.sk"],
  [/byty\.sk/i, "Portal", "Byty.sk"],
  [/topreality/i, "Portal", "TopReality.sk"],
  [/reality\.sk/i, "Portal", "Reality.sk"],
  [/formular@realitysmolko\.sk/i, "Website", "realitysmolko.sk (web formulár)"],
];

const EMAIL_RE = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/;
const PHONE_RE = /(?:\+421\s?|0)\d{3}\s?\d{3}\s?\d{3}/;
const INTERNAL_ID_RE = /\b([A-Z]{2}\d{2,}[A-Z]?)\b/;
const L = {
  name: /(?:Meno(?:\s+a\s+priezvisko)?|Name)\s*:\s*(.+)/i,
  phone: /(?:Telef[oó]n|Phone(?:\s+number)?|T\.?č\.?)\s*:?\s*((?:\+421\s?|0)[\d\s]{7,})/i,
  email: new RegExp(`(?:E-?mail)\\s*:\\s*(${EMAIL_RE.source})`, "i"),
  msg: /(?:Spr[aá]va(?:\s+od\s+z[aá]ujemcu[^:]*)?|Text\s+spr[aá]vy|Message|Reakcia na inzer[aá]t)\s*:\s*([\s\S]+)/i,
  portalId: /(?:V[aá]š inzer[aá]t(?:\s+č[ií]slo)?|Ad ID)\D{0,40}?\b([A-Za-z0-9]{8,})\b/,
  bazosInzerat: /inzer[aá]t\s+(\d{6,})/i,
};
const INTENT: [string, RegExp[]][] = [
  ["Viewing Request", [/obhliadk/i, /najbližš[ií] term[ií]n/i]],
  ["Price Objection", [/cena.{0,30}(?:vysok|ďaleko od reality|nezodpoved)/i]],
  ["Availability Question", [/od kedy.{0,15}voľn/i, /kedy.{0,10}dostupn/i, /akt[uú]áln/i, /je\s+v[aá]š\s+inzer[aá]t/i]],
  ["Price Question", [/\bcen[au]\b/i, /n[aá]klad/i, /depozit/i]],
  ["Information Request", [/inform[aá]ci/i, /fotk/i, /podrobnejš/i]],
];

// ── HTML normalizácia ─────────────────────────────────────────────────────────
// Route skladá raw ako `subject + "\n" + text + "\n" + html`, takže do regexov
// nad poľami padal aj HTML markup. Prejavy v produkcii (Reality Smolko, 7 dopytov
// od 2026-07): meno uložené aj s `</b>` a `<br/>`, 4 zo 7 mien `Neznámy`.
// Normalizuje sa IBA vstup pre extrakciu polí; `rawHash`/`eventId` sa naďalej
// počítajú z pôvodného `raw`, aby sa nezmenila idempotencia už prijatých správ.

const HTML_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n: string) => HTML_ENTITIES[n.toLowerCase()] ?? m);
}

/** HTML → text. Na čistom texte je to no-op (vracia vstup nezmenený). */
export function htmlToText(raw: string): string {
  if (!/<[a-z!/]/i.test(raw)) return raw;
  return decodeEntities(
    raw
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/?(?:br|p|div|tr|li|h[1-6]|table|thead|tbody)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t\u00a0]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── výber kontaktnej adresy ───────────────────────────────────────────────────
// Pôvodný fallback bral `raw.match(EMAIL_RE)?.[0]`, teda PRVÚ adresu kdekoľvek
// v správe. Pri preposlanom portálovom maile je to často adresa príjemcu alebo
// noreply portálu — v produkcii tak vznikol lead s e-mailom `office@realitysmolko.sk`,
// čo je adresa samotnej kancelárie, nie záujemcu.

const NON_LEAD_LOCALPART =
  /^(?:no-?reply|donotreply|do-not-reply|mailer-daemon|postmaster|bounces?|notifications?)$/i;

/**
 * Verejní poskytovatelia pošty. Doména agentúry sa z nich NIKDY neodvodzuje:
 * maklér s osobným gmailom by inak zahodil každého záujemcu z gmailu.
 * Jeho konkrétna adresa sa aj tak vylúči cez `agencyAddresses` (presná zhoda).
 */
const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.uk",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "zoznam.sk",
  "azet.sk",
  "centrum.sk",
  "post.sk",
  "pobox.sk",
  "inmail.sk",
  "atlas.sk",
  "seznam.cz",
  "email.cz",
  "centrum.cz",
]);

/** Adresy a domény, ktoré patria kancelárii — nie záujemcovi. */
export type AgencyIdentity = {
  /** Presné adresy: profily maklérov, adresa agentúry, prijímacie schránky. */
  addresses?: readonly string[] | null;
  /** Domény odvodené z tých adries, po odfiltrovaní verejných poskytovateľov. */
  domains?: readonly string[] | null;
};

/**
 * Z adries kancelárie vyrobí zoznam jej vlastných domén. Verejné domény vypadnú —
 * inak by sa `gmail.com` jedného makléra stal filtrom na všetkých záujemcov.
 */
export function agencyDomainsFrom(addresses: readonly (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const addr of addresses) {
    const domain = addr?.trim().toLowerCase().split("@")[1];
    if (!domain) continue;
    if (PUBLIC_EMAIL_DOMAINS.has(domain)) continue;
    out.add(domain);
  }
  return [...out];
}

/** Odstráni obaľujúcu interpunkciu (`<a@b.sk>`, `a@b.sk.`) a overí tvar. */
export function cleanEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = value.trim().replace(/^[<("'\s]+/, "").replace(/[>)"'.,;:\s]+$/, "");
  return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(s) ? s : null;
}

/**
 * Doménová stráž stála na tom, že sa doména adresy rovná doméne PRÍJEMCU. Kým ingest
 * bežal na doméne kancelárie, fungovalo to. Odkedy beží na `revolis.ai`, je doména
 * príjemcu vždy `revolis.ai` a doména kancelárie sa s ňou nikdy nezhoduje — stráž teda
 * prestala vylučovať vlastné adresy klienta. Preto sa identita kancelárie odovzdáva
 * zvonku (`agencyAddresses` / `agencyDomains`) a nedopočítava sa z príjemcu.
 */
function isNonLeadAddress(addr: string, ctx?: ContactContext): boolean {
  const lower = addr.toLowerCase();
  const [local, domain] = lower.split("@");
  if (NON_LEAD_LOCALPART.test(local)) return true;
  if (domain === "revolis.ai") return true; // naša ingest schránka

  // Presná adresa kancelárie alebo makléra — platí aj na verejnej doméne.
  if (ctx?.agencyAddresses?.has(lower)) return true;
  // Vlastná doména kancelárie (verejní poskytovatelia sú z nej odfiltrovaní).
  if (domain && ctx?.agencyDomains?.has(domain)) return true;

  const r = ctx?.recipient?.trim().toLowerCase();
  if (!r) return false;
  if (lower === r) return true; // presne adresa príjemcu
  const recipientDomain = r.split("@")[1];
  return Boolean(recipientDomain) && domain === recipientDomain;
}

type ContactContext = {
  recipient?: string | null;
  agencyAddresses?: ReadonlySet<string>;
  agencyDomains?: ReadonlySet<string>;
};

/**
 * `hasPhone` rozhoduje o poslednom kroku. Keď žiadny kandidát neprejde strážou,
 * pôvodný kód aj tak vrátil `labelled` — teda adresu, ktorú stráž práve zamietla.
 * Pri leade, ktorý MÁ telefón, je to zlá výmena: prázdny e-mail je čitateľný stav,
 * kdežto cudzia adresa vyzerá ako platný kontakt a odíde na ňu automatická odpoveď.
 * Bez telefónu by lead ostal bez akéhokoľvek kontaktu, preto tam fallback ostáva.
 */
function pickContactEmail(text: string, ctx: ContactContext, hasPhone: boolean): string | null {
  const labelled = cleanEmail(text.match(L.email)?.[1]);
  if (labelled && !isNonLeadAddress(labelled, ctx)) return labelled;
  for (const candidate of text.match(new RegExp(EMAIL_RE.source, "g")) ?? []) {
    const cleaned = cleanEmail(candidate);
    if (cleaned && !isNonLeadAddress(cleaned, ctx)) return cleaned;
  }
  return hasPhone ? null : labelled;
}

/** Zvyškový markup a oddeľovače v mene (napr. `</b> Meno Priezvisko<br/>`). */
function cleanName(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s:\-–—|]+/, "")
    .replace(/[\s|]+$/, "")
    .trim();
  return s ? s.slice(0, 120) : null;
}

function detectSource(raw: string): [AcquireEvent["sourceType"], string] {
  for (const [re, st, s] of SOURCE_RULES) if (re.test(raw)) return [st, s];
  return ["Unknown", "Unknown"];
}

function classifyIntent(text: string): [string, string] {
  for (const [intent, pats] of INTENT) {
    for (const p of pats) {
      const m = text.match(p);
      if (m) return [intent, `match: '${m[0].slice(0, 40)}'`];
    }
  }
  return ["General Inquiry", "no keyword matched (default)"];
}

export function parseEmail(
  raw: string,
  receivedAt?: string,
  opts?: { recipient?: string | null } & AgencyIdentity,
): AcquireEvent {
  // Polia sa čítajú z normalizovaného textu, hash ostáva nad pôvodným `raw`.
  const text = htmlToText(raw);
  const [sourceType, source] = detectSource(text);
  const nameM = text.match(L.name);
  const phoneM = text.match(L.phone);
  // Telefón sa musí poznať PRED výberom e-mailu — rozhoduje o poslednom fallbacku.
  const contactPhone = phoneM
    ? phoneM[1].replace(/\s+/g, "")
    : (text.match(PHONE_RE)?.[0]?.replace(/\s+/g, "") ?? null);
  const contactEmail = pickContactEmail(
    text,
    {
      recipient: opts?.recipient,
      agencyAddresses: new Set((opts?.addresses ?? []).map((a) => a.trim().toLowerCase())),
      agencyDomains: new Set((opts?.domains ?? []).map((d) => d.trim().toLowerCase())),
    },
    Boolean(contactPhone),
  );
  const msgM = text.match(L.msg);
  let inquiryText = msgM ? msgM[1].replace(/\s+/g, " ").trim() : null;
  if (inquiryText) {
    const footerCut = inquiryText.search(/\bIntern[eé]\s+č\./i);
    if (footerCut > 0) inquiryText = inquiryText.slice(0, footerCut).trim();
    inquiryText = inquiryText.slice(0, 1000);
  }
  const [intent, reason] = classifyIntent(inquiryText ?? text);
  const internalId = text.match(INTERNAL_ID_RE)?.[1] ?? null;
  const portalId =
    text.match(L.portalId)?.[1] ?? text.match(L.bazosInzerat)?.[1] ?? null;
  let listingTitle: string | null = null;
  if (!internalId && !portalId) {
    const t = text.match(/(?:Odoslan[eé] z|EXKLUZ[IÍ]VNE)[:\s]*(.+)/);
    if (t) listingTitle = t[1].trim().split("\n")[0].slice(0, 160);
  }
  const ev: AcquireEvent = {
    parserVersion: PARSER_VERSION,
    datasetVersion: DATASET_VERSION,
    extractionConfidence: 0,
    sourceType,
    source,
    eventKind: /unsubscribe|odhl[aá]siť/i.test(text) ? "unsubscribe" : "inquiry",
    contactName: cleanName(nameM?.[1]?.split("\n")[0]),
    contactEmail,
    contactPhone,
    listingPortalId: portalId,
    listingInternalId: internalId,
    listingTitle,
    inquiryText,
    inquiryIntent: intent,
    intentReason: reason,
    receivedAt: receivedAt ?? null,
    warnings: [],
  };
  ev.rawHash = createHash("sha1").update(raw).digest("hex");
  ev.eventId = createHash("sha1")
    .update(ev.rawHash + (receivedAt ?? ""))
    .digest("hex")
    .slice(0, 16);
  const core = [
    ev.contactEmail || ev.contactPhone,
    ev.source !== "Unknown",
    ev.listingInternalId || ev.listingPortalId || ev.listingTitle,
    ev.inquiryText,
  ];
  ev.extractionConfidence = Math.round((core.filter(Boolean).length / core.length) * 100) / 100;
  if (!(ev.contactEmail || ev.contactPhone)) ev.warnings.push("no_contact");
  if (!(ev.listingInternalId || ev.listingPortalId || ev.listingTitle)) {
    ev.warnings.push("no_listing_ref");
  }
  if (ev.source === "Unknown") ev.warnings.push("unknown_source");
  return ev;
}

export function dedupKey(ev: AcquireEvent): string {
  const base = [
    ev.listingPortalId || ev.listingInternalId || ev.listingTitle || "",
    (ev.contactEmail || ev.contactPhone || "").toLowerCase(),
    ev.receivedAt || "",
  ].join("|");
  return createHash("sha1").update(base).digest("hex").slice(0, 16);
}

/** NIE každý event je lead. Vracia null pre dup/unsubscribe/no-contact/unknown. */
export function toLeadCandidate(ev: AcquireEvent, agencyId: string, duplicate: boolean) {
  if (duplicate || ev.eventKind !== "inquiry") return null;
  if (!(ev.contactEmail || ev.contactPhone) || ev.source === "Unknown") return null;
  return {
    agencyId,
    name: ev.contactName ?? "Neznámy",
    email: ev.contactEmail ?? "",
    phone: ev.contactPhone ?? "",
    source: ev.sourceType === "Website" ? "web_form" : `portal:${ev.source}`,
    status: "Nový",
    note: `[${ev.source}] ${ev.inquiryText ?? ""} | inzerát: ${ev.listingPortalId ?? ev.listingInternalId ?? ev.listingTitle ?? "-"} | intent: ${ev.inquiryIntent} (${ev.intentReason})`,
    _meta: {
      eventId: ev.eventId,
      parserVersion: ev.parserVersion,
      extractionConfidence: ev.extractionConfidence,
    },
  };
}
