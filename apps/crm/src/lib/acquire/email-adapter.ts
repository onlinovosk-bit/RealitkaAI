import { createHash } from "crypto";

export const PARSER_VERSION = "1.2";
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

export function parseEmail(raw: string, receivedAt?: string): AcquireEvent {
  const [sourceType, source] = detectSource(raw);
  const nameM = raw.match(L.name);
  const emailM = raw.match(L.email);
  const phoneM = raw.match(L.phone);
  const contactEmail = emailM ? emailM[1] : (raw.match(EMAIL_RE)?.[0] ?? null);
  const contactPhone = phoneM
    ? phoneM[1].replace(/\s+/g, "")
    : (raw.match(PHONE_RE)?.[0]?.replace(/\s+/g, "") ?? null);
  const msgM = raw.match(L.msg);
  let inquiryText = msgM ? msgM[1].replace(/\s+/g, " ").trim() : null;
  if (inquiryText) {
    const footerCut = inquiryText.search(/\bIntern[eé]\s+č\./i);
    if (footerCut > 0) inquiryText = inquiryText.slice(0, footerCut).trim();
    inquiryText = inquiryText.slice(0, 1000);
  }
  const [intent, reason] = classifyIntent(inquiryText ?? raw);
  const internalId = raw.match(INTERNAL_ID_RE)?.[1] ?? null;
  const portalId =
    raw.match(L.portalId)?.[1] ?? raw.match(L.bazosInzerat)?.[1] ?? null;
  let listingTitle: string | null = null;
  if (!internalId && !portalId) {
    const t = raw.match(/(?:Odoslan[eé] z|EXKLUZ[IÍ]VNE)[:\s]*(.+)/);
    if (t) listingTitle = t[1].trim().split("\n")[0].slice(0, 160);
  }
  const ev: AcquireEvent = {
    parserVersion: PARSER_VERSION,
    datasetVersion: DATASET_VERSION,
    extractionConfidence: 0,
    sourceType,
    source,
    eventKind: /unsubscribe|odhl[aá]siť/i.test(raw) ? "unsubscribe" : "inquiry",
    contactName: nameM ? nameM[1].trim().split("\n")[0].slice(0, 120) : null,
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
