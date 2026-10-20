// ================================================================
// Revolis.AI — čítač `inbound_mail_outcomes` (WP-3 MAIL-OUTCOMES-READER)
//
// Účel: diagnostika "prečo mail nevytvoril lead" (22 z 23 mailov = not_a_lead).
// Writer: ./mail-outcome.ts (recordInboundMailOutcome).
//
// Tabuľka má RLS zapnutú BEZ politík a REVOKE pre anon/authenticated, takže ju
// číta iba service role. Preto tento čítač berie klienta od volajúceho a VŽDY
// filtruje `agency_id` explicitne (service role RLS obchádza — filter je jediná
// tenantná hranica). `agencyId` musí pochádzať zo session, nikdy z requestu.
//
// GDPR minimalizácia — čo sa NEVRACIA a prečo:
//   id, request_id, event_id : korelačné identifikátory (väzba na logy/eventy
//                              a tým nepriamo na konkrétny mail) — na diagnostiku
//                              nepotrebné
//   agency_id                : volajúci ho pozná zo session, nič nové
//   (obsah správy, adresa, telefón sa do tabuľky vôbec neukladajú)
// Vracia sa len doména odosielateľa + boolean príznaky + enum-like polia.
// Výstup sa navyše pretláča cez allow-list (`toSafeRow`), takže nový stĺpec
// v tabuľke sa sem nedostane omylom.
// ================================================================
import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_RECENT_LIMIT = 50;
export const DEFAULT_RECENT_LIMIT = 20;
export const MAX_WINDOW_DAYS = 90; // = retencia tabuľky
export const DEFAULT_WINDOW_DAYS = 7;
/** Strop riadkov načítaných na agregáciu; ak sa dosiahne, výstup je `aggregate_truncated`. */
export const AGGREGATE_MAX_ROWS = 5000;

const TABLE = "inbound_mail_outcomes";

/** Explicitný zoznam stĺpcov — žiadne `select("*")`. */
const AGG_COLUMNS = "outcome, reason";
const RECENT_COLUMNS =
  "created_at, outcome, reason, source, source_type, event_kind, source_detected_by, sender_domain, parser_version, has_contact_email, has_contact_phone, has_listing_ref, has_message, mailbox_event";

export type SafeOutcomeRow = {
  created_at: string;
  outcome: string;
  reason: string | null;
  source: string | null;
  source_type: string | null;
  event_kind: string | null;
  source_detected_by: string | null;
  sender_domain: string | null;
  parser_version: string | null;
  has_contact_email: boolean;
  has_contact_phone: boolean;
  has_listing_ref: boolean;
  has_message: boolean;
  mailbox_event: string | null;
};

export type MailOutcomesReport = {
  window_days: number;
  since: string;
  totals: { total: number; by_outcome: Record<string, number> };
  by_reason: Array<{ outcome: string; reason: string | null; count: number }>;
  aggregate_truncated: boolean;
  recent: SafeOutcomeRow[];
};

export type ParsedParams =
  | { ok: true; days: number; limit: number }
  | { ok: false; error: string };

function parseIntParam(
  raw: string | null,
  name: string,
  def: number,
  min: number,
  max: number,
): { ok: true; value: number } | { ok: false; error: string } {
  if (raw === null || raw === "") return { ok: true, value: def };
  if (!/^\d{1,6}$/.test(raw)) return { ok: false, error: `${name}: očakáva sa celé číslo` };
  const n = Number(raw);
  if (n < min || n > max) return { ok: false, error: `${name}: povolený rozsah ${min}–${max}` };
  return { ok: true, value: n };
}

export function parseOutcomeParams(sp: URLSearchParams): ParsedParams {
  const days = parseIntParam(sp.get("days"), "days", DEFAULT_WINDOW_DAYS, 1, MAX_WINDOW_DAYS);
  if (!days.ok) return days;
  const limit = parseIntParam(sp.get("limit"), "limit", DEFAULT_RECENT_LIMIT, 1, MAX_RECENT_LIMIT);
  if (!limit.ok) return limit;
  return { ok: true, days: days.value, limit: limit.value };
}

/** Allow-list projekcia: čokoľvek navyše (aj keby ho DB vrátila) sa zahodí. */
export function toSafeRow(r: Record<string, unknown>): SafeOutcomeRow {
  const s = (v: unknown): string | null => (typeof v === "string" ? v : null);
  return {
    created_at: String(r.created_at ?? ""),
    outcome: String(r.outcome ?? ""),
    reason: s(r.reason),
    source: s(r.source),
    source_type: s(r.source_type),
    event_kind: s(r.event_kind),
    source_detected_by: s(r.source_detected_by),
    sender_domain: s(r.sender_domain),
    parser_version: s(r.parser_version),
    has_contact_email: r.has_contact_email === true,
    has_contact_phone: r.has_contact_phone === true,
    has_listing_ref: r.has_listing_ref === true,
    has_message: r.has_message === true,
    mailbox_event: s(r.mailbox_event),
  };
}

/**
 * @param supa  service-role klient (tabuľka nemá politiky pre authenticated)
 * @param agencyId  agency_id zo session používateľa — NIKDY z query/body
 */
export async function readMailOutcomes(
  supa: SupabaseClient,
  opts: { agencyId: string; days: number; limit: number; now?: Date },
): Promise<MailOutcomesReport> {
  if (!opts.agencyId) throw new Error("agencyId is required"); // fail-closed
  const days = Math.min(Math.max(Math.trunc(opts.days), 1), MAX_WINDOW_DAYS);
  const limit = Math.min(Math.max(Math.trunc(opts.limit), 1), MAX_RECENT_LIMIT);
  const now = opts.now ?? new Date();
  const since = new Date(now.getTime() - days * 86_400_000).toISOString();

  const agg = await supa
    .from(TABLE)
    .select(AGG_COLUMNS)
    .eq("agency_id", opts.agencyId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(AGGREGATE_MAX_ROWS);
  if (agg.error) throw new Error(`mail_outcomes_aggregate_failed: ${agg.error.message}`);

  const recent = await supa
    .from(TABLE)
    .select(RECENT_COLUMNS)
    .eq("agency_id", opts.agencyId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (recent.error) throw new Error(`mail_outcomes_recent_failed: ${recent.error.message}`);

  const aggRows = (agg.data ?? []) as Array<Record<string, unknown>>;
  const byOutcome: Record<string, number> = {};
  const byReason = new Map<string, { outcome: string; reason: string | null; count: number }>();
  for (const r of aggRows) {
    const outcome = String(r.outcome ?? "");
    const reason = typeof r.reason === "string" ? r.reason : null;
    byOutcome[outcome] = (byOutcome[outcome] ?? 0) + 1;
    const key = `${outcome}\u0000${reason ?? ""}`;
    const cur = byReason.get(key);
    if (cur) cur.count += 1;
    else byReason.set(key, { outcome, reason, count: 1 });
  }

  return {
    window_days: days,
    since,
    totals: { total: aggRows.length, by_outcome: byOutcome },
    by_reason: [...byReason.values()].sort((a, b) => b.count - a.count),
    aggregate_truncated: aggRows.length >= AGGREGATE_MAX_ROWS,
    recent: ((recent.data ?? []) as Array<Record<string, unknown>>)
      .slice(0, limit)
      .map(toSafeRow),
  };
}
