/**
 * Next step when a known contact returns to a listing, or the price or age
 * of that listing changes. Pure: no database, no send.
 *
 * The broker confirms before anything leaves the agency. Drafts that carry
 * this agent id are shown on the lead and sent only through the existing
 * approval path.
 */

export const RETURN_SIGNAL_AGENT_ID = "REVOLIS-RETURN-SIGNAL";
export const RETURN_SIGNAL_PROMPT_VERSION = "return-signal-v1";

/** Days on market. A daily job catches the crossing day and one missed day. */
export const LISTING_AGE_BUCKETS = [14, 30, 60] as const;

const CLOSED_LEAD_STATUSES = new Set([
  "Uzavretý",
  "Archivovaný",
  "Stratený",
  "closed",
  "lost",
]);

export type ReturnSignalKind = "repeat_view" | "price_change" | "listing_age";

export interface ReturnStep {
  kind: ReturnSignalKind;
  title: string;
  subject: string;
  body: string;
}

export function isClosedLeadStatus(status: string | null | undefined): boolean {
  return CLOSED_LEAD_STATUSES.has(String(status ?? "").trim());
}

/** True when this view is not the first one for the same contact and listing. */
export function classifyRepeatView(priorViewCount: number): boolean {
  return Number.isFinite(priorViewCount) && priorViewCount >= 1;
}

export function classifyPriceChange(
  prevPrice: number | null | undefined,
  nextPrice: number | null | undefined,
): boolean {
  if (prevPrice == null || nextPrice == null) return false;
  if (!Number.isFinite(prevPrice) || !Number.isFinite(nextPrice)) return false;
  return prevPrice !== nextPrice;
}

/**
 * Bucket when the listing has just crossed 14, 30 or 60 days.
 * Returns null on every other day so a daily run writes the step once.
 */
export function listingAgeBucket(ageDays: number): number | null {
  if (!Number.isFinite(ageDays) || ageDays < 0) return null;
  for (let i = LISTING_AGE_BUCKETS.length - 1; i >= 0; i--) {
    const bucket = LISTING_AGE_BUCKETS[i];
    if (ageDays >= bucket && ageDays < bucket + 2) return bucket;
  }
  return null;
}

export function ageDaysSince(createdAtIso: string, now: Date): number | null {
  const created = new Date(createdAtIso).getTime();
  if (!Number.isFinite(created)) return null;
  return Math.floor((now.getTime() - created) / 86_400_000);
}

function eur(amount: number): string {
  return `${Math.round(amount)} €`;
}

function listingLabel(propertyTitle: string | null | undefined, propertyId: string): string {
  const title = propertyTitle?.trim();
  return title && title.length > 0 ? title : propertyId;
}

export function buildReturnStep(input: {
  kind: ReturnSignalKind;
  propertyId: string;
  propertyTitle?: string | null;
  contactName?: string | null;
  prevPrice?: number | null;
  nextPrice?: number | null;
  ageBucket?: number | null;
}): ReturnStep | null {
  const propertyId = input.propertyId.trim();
  if (!propertyId) return null;
  const label = listingLabel(input.propertyTitle, propertyId);
  const who = input.contactName?.trim() || "Kontakt";
  const closing =
    "Toto je návrh. Správa sa neodošle, kým ju nepotvrdíte.";

  if (input.kind === "repeat_view") {
    return {
      kind: input.kind,
      title: `Ďalší krok: návrat · ${propertyId}`,
      subject: `Návrat na ponuku — ${label}`,
      body: `${who} sa znova pozrel na ponuku ${label}. Ozvite sa, kým je ponuka otvorená.\n\n${closing}`,
    };
  }

  if (input.kind === "price_change") {
    if (!classifyPriceChange(input.prevPrice, input.nextPrice)) return null;
    const prev = input.prevPrice as number;
    const next = input.nextPrice as number;
    const direction = next < prev ? "klesla" : "stúpla";
    return {
      kind: input.kind,
      title: `Ďalší krok: zmena ceny · ${propertyId}`,
      subject: `Zmena ceny — ${label}`,
      body: `Cena ponuky ${label} ${direction} z ${eur(prev)} na ${eur(next)}. Dajte ${who} vedieť, čo to znamená.\n\n${closing}`,
    };
  }

  const bucket = input.ageBucket;
  if (bucket == null || !LISTING_AGE_BUCKETS.includes(bucket as (typeof LISTING_AGE_BUCKETS)[number])) {
    return null;
  }
  return {
    kind: "listing_age",
    title: `Ďalší krok: inzerát ${bucket} dní · ${propertyId}`,
    subject: `Inzerát má ${bucket} dní — ${label}`,
    body: `Ponuka ${label} je na trhu ${bucket} dní. Ozvite sa kontaktu ${who}, či ju chce ešte riešiť.\n\n${closing}`,
  };
}

const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

export function readViewTarget(payload: Record<string, unknown> | null | undefined): {
  leadId: string;
  propertyId: string;
} | null {
  if (!payload) return null;
  const leadId = String(payload.lead_id ?? payload.leadId ?? "").trim();
  const propertyId = String(payload.property_id ?? payload.propertyId ?? "").trim();
  if (!ID_RE.test(leadId) || !ID_RE.test(propertyId)) return null;
  return { leadId, propertyId };
}
