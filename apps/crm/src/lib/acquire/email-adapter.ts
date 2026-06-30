import { createHash } from "crypto";

/** Acquire Contract v1.2 — deterministic parser (no LLM). */
export const PARSER_VERSION = "1.2";
export const DATASET_VERSION = "1";

export type AcquireEvent = {
  source_type: string;
  source: string;
  event_kind: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  listing_portal_id: string | null;
  listing_internal_id: string | null;
  listing_title: string | null;
  inquiry_text: string | null;
  inquiry_intent: string | null;
  intent_reason: string | null;
  received_at: string | null;
  warnings: string[];
};

export type LeadCandidate = {
  agency_id: null;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  note: string;
};

const SOURCE_RULES: ReadonlyArray<[RegExp, string, string]> = [
  [/nehnutelnosti\.sk|Nehnute\u013enosti\.sk/i, "Portal", "Nehnuteľnosti.sk"],
  [/bazos\.sk|Bazos\.sk/i, "Portal", "Bazoš.sk"],
  [/byty\.sk|Byty\.sk/i, "Portal", "Byty.sk"],
  [/topreality\.sk|TopReality/i, "Portal", "TopReality.sk"],
  [/reality\.sk|REALITY\.SK/i, "Portal", "Reality.sk"],
  [/formular@realitysmolko\.sk/i, "Website", "realitysmolko.sk (web formulár)"],
];

const EMAIL_RE = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/;
const PHONE_RE = /(?:\+421\s?|0)\d{3}\s?\d{3}\s?\d{3}/;
const INTERNAL_ID_RE = /\b([A-Z]{2}\d{2,}[A-Z]?)\b/;

const LABEL = {
  name: /(?:Meno(?:\s+a\s+priezvisko)?|Name)\s*:\s*(.+)/i,
  phone: /(?:Telef[oó]n|Phone(?:\s+number)?|T\.?\u010d\.?)\s*:?\s*((?:\+421\s?|0)[\d\s]{7,})/i,
  email: new RegExp(`(?:E-?mail)\\s*:\\s*(${EMAIL_RE.source})`, "i"),
  msg: /(?:Spr[aá]va(?:\s+od\s+z[aá]ujemcu[^:]*)?|Message|Reakcia na inzer[aá]t|Text)\s*:\s*(.+)/is,
  portal_id: /(?:V[aá]\u0161 inzer[aá]t(?:\s+\u010d[ií]slo)?|Ad ID)\D{0,40}?\b([A-Za-z0-9]{8,})\b/,
};

const INTENT: ReadonlyArray<[string, RegExp[]]> = [
  ["Viewing Request", [/obhliadk/i, /najbli\u017e\u0161\u00ed term[ií]n/i]],
  ["Price Objection", [/cena.{0,30}(?:vysok|\u010faleko od reality|nezodpoved)/i]],
  ["Availability Question", [/od kedy.{0,15}vo\u013en/i, /kedy.{0,10}dostupn/i]],
  ["Price Question", [/\bcen[au]\b/i, /n[aá]klad/i, /depozit/i]],
  ["Information Request", [/inform[aá]ci/i, /fotk/i, /podrobnej\u0161/i]],
];

function detectSource(raw: string): [string, string] {
  for (const [pat, sourceType, source] of SOURCE_RULES) {
    if (pat.test(raw)) return [sourceType, source];
  }
  return ["Unknown", "Unknown"];
}

function classifyIntent(text: string | null): [string, string] {
  const t = text ?? "";
  for (const [intent, patterns] of INTENT) {
    for (const pattern of patterns) {
      const match = pattern.exec(t);
      if (match) return [intent, `match: '${match[0].slice(0, 40)}'`];
    }
  }
  return ["General Inquiry", "no keyword matched (default)"];
}

function validate(ev: AcquireEvent): string[] {
  const warnings: string[] = [];
  if (!ev.contact_email && !ev.contact_phone) warnings.push("no_contact");
  if (!ev.listing_internal_id && !ev.listing_portal_id && !ev.listing_title) {
    warnings.push("no_listing_ref");
  }
  if (ev.source === "Unknown") warnings.push("unknown_source");
  return warnings;
}

/** Parse raw email body into AcquireEvent (deterministic regex/heuristics). */
export function parseEmail(raw: string, receivedAt?: string | null): AcquireEvent {
  const ev: AcquireEvent = {
    source_type: "Unknown",
    source: "Unknown",
    event_kind: "inquiry",
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    listing_portal_id: null,
    listing_internal_id: null,
    listing_title: null,
    inquiry_text: null,
    inquiry_intent: null,
    intent_reason: null,
    received_at: receivedAt ?? null,
    warnings: [],
  };

  [ev.source_type, ev.source] = detectSource(raw);

  const nameMatch = LABEL.name.exec(raw);
  ev.contact_name = nameMatch
    ? nameMatch[1].trim().split("\n")[0].slice(0, 120)
    : null;

  const emailMatch = LABEL.email.exec(raw);
  if (emailMatch) {
    ev.contact_email = emailMatch[1];
  } else {
    const freeEmail = EMAIL_RE.exec(raw);
    ev.contact_email = freeEmail ? freeEmail[0] : null;
  }

  const phoneMatch = LABEL.phone.exec(raw);
  if (phoneMatch) {
    ev.contact_phone = phoneMatch[1].replace(/\s+/g, "");
  } else {
    const freePhone = PHONE_RE.exec(raw);
    ev.contact_phone = freePhone ? freePhone[0].replace(/\s+/g, "") : null;
  }

  const internalMatch = INTERNAL_ID_RE.exec(raw);
  ev.listing_internal_id = internalMatch ? internalMatch[1] : null;

  const portalMatch = LABEL.portal_id.exec(raw);
  ev.listing_portal_id = portalMatch ? portalMatch[1] : null;

  const msgMatch = LABEL.msg.exec(raw);
  if (msgMatch) {
    ev.inquiry_text = msgMatch[1].replace(/\s+/g, " ").trim().slice(0, 1000);
  }

  [ev.inquiry_intent, ev.intent_reason] = classifyIntent(ev.inquiry_text ?? raw);

  if (!ev.listing_internal_id && !ev.listing_portal_id) {
    const titleMatch = /(?:Odoslan[eé] z|EXKLUZ[IÍ]VNE)[:\s]*(.+)/i.exec(raw);
    if (titleMatch) {
      ev.listing_title = titleMatch[1].trim().split("\n")[0].slice(0, 160);
    }
  }

  if (/unsubscribe|odhl[aá]si\u0165/i.test(raw)) {
    ev.event_kind = "unsubscribe";
  }

  ev.warnings = validate(ev);
  return ev;
}

/** Stable dedup key for agency-scoped duplicate detection (Wave 2 route uses DB table). */
export function dedupKey(ev: AcquireEvent): string {
  const base = [
    ev.listing_portal_id ?? ev.listing_internal_id ?? ev.listing_title ?? "",
    (ev.contact_email ?? ev.contact_phone ?? "").toLowerCase(),
    ev.received_at ?? "",
  ].join("|");
  return createHash("sha1").update(base).digest("hex").slice(0, 16);
}

/** Map validated inquiry event to lead candidate; null when not lead-worthy. */
export function toLeadCandidate(
  ev: AcquireEvent,
  duplicate: boolean,
): LeadCandidate | null {
  if (duplicate) return null;
  if (ev.event_kind !== "inquiry") return null;
  if (!ev.contact_email && !ev.contact_phone) return null;
  if (ev.source === "Unknown") return null;

  const listingRef = ev.listing_internal_id ?? ev.listing_portal_id ?? ev.listing_title;
  const source = ev.source_type === "Website" ? "web_form" : `portal:${ev.source}`;

  return {
    agency_id: null,
    name: ev.contact_name,
    email: ev.contact_email,
    phone: ev.contact_phone,
    source,
    status: "Nový",
    note: `[${ev.source}] ${ev.inquiry_text ?? ""} | inzerát: ${listingRef} | intent: ${ev.inquiry_intent} (${ev.intent_reason})`,
  };
}
