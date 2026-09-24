import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchLeadAgencyId } from "@/lib/db/enterprise-intelligence-store";
import {
  CONTACT_ATTEMPT_EVENT_TYPE,
  CONTACT_CHANNELS,
  CONTACT_OUTCOMES,
  CONTACT_SOURCES,
  ContactEventValidationError,
  type ContactEventRow,
  type FirstContactAttempt,
  type RecordContactAttemptInput,
} from "./types";

/** Clock skew tolerated between the agent's browser and the database. */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

type LeadAgencyResolver = (
  client: SupabaseClient,
  leadId: string,
) => Promise<{ found: boolean; agencyId: string | null }>;

/**
 * Decide the first contact attempt from raw event rows.
 *
 * Pure on purpose: the same rows must produce the same answer regardless of
 * client, model or provider, and this is the function C1 will eventually be
 * counted from.
 *
 * Rows are filtered by type here rather than trusted from the caller, so a
 * broad `select` cannot accidentally count an `email_open` as a human dialling
 * a number.
 */
export function resolveFirstContactAttempt(rows: readonly ContactEventRow[]): FirstContactAttempt {
  const attempts = rows.filter((row) => row.type === CONTACT_ATTEMPT_EVENT_TYPE);
  if (attempts.length === 0) return { state: "none" };

  let earliest: number | null = null;
  let earliestIso: string | null = null;

  for (const attempt of attempts) {
    if (!attempt.occurred_at) continue;
    const parsed = Date.parse(attempt.occurred_at);
    // An unparseable timestamp is missing data, not zero. Falling back to
    // `created_at` here would invent the very number this module refuses to
    // invent: the row's insert time is not when the phone rang.
    if (Number.isNaN(parsed)) continue;
    if (earliest === null || parsed < earliest) {
      earliest = parsed;
      earliestIso = attempt.occurred_at;
    }
  }

  if (earliestIso === null) return { state: "unknown", attempts: attempts.length };
  return { state: "known", occurredAt: earliestIso };
}

function assertValid(input: RecordContactAttemptInput, now: Date): void {
  if (!input.agencyId) throw new ContactEventValidationError("agencyId is required");
  if (!input.leadId) throw new ContactEventValidationError("leadId is required");
  if (!input.actorProfileId) {
    throw new ContactEventValidationError(
      "actorProfileId is required — a contact attempt is always made by a person",
    );
  }
  if (!(input.occurredAt instanceof Date) || Number.isNaN(input.occurredAt.getTime())) {
    throw new ContactEventValidationError("occurredAt must be a valid Date");
  }
  if (input.occurredAt.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
    throw new ContactEventValidationError("occurredAt is in the future — refusing to record it");
  }
  if (!CONTACT_CHANNELS.includes(input.channel)) {
    throw new ContactEventValidationError(`unknown channel: ${String(input.channel)}`);
  }
  if (input.outcome !== undefined && !CONTACT_OUTCOMES.includes(input.outcome)) {
    throw new ContactEventValidationError(`unknown outcome: ${String(input.outcome)}`);
  }
  if (!CONTACT_SOURCES.includes(input.source)) {
    throw new ContactEventValidationError(`unknown source: ${String(input.source)}`);
  }
}

/**
 * Write one contact attempt.
 *
 * The lead's own agency is read first and compared to the caller's: RLS already
 * stops a foreign tenant, but the policy on `lead_events` also permits rows
 * whose `agency_id` is null, so an application-level check is what keeps a
 * cross-tenant write from becoming a globally readable row.
 */
export async function recordContactAttempt(
  client: SupabaseClient,
  input: RecordContactAttemptInput,
  options: { now?: Date; resolveLeadAgency?: LeadAgencyResolver } = {},
): Promise<{ id: string }> {
  const now = options.now ?? new Date();
  assertValid(input, now);

  const lookup = await (options.resolveLeadAgency ?? fetchLeadAgencyId)(client, input.leadId);
  if (!lookup.found) {
    throw new ContactEventValidationError(`lead ${input.leadId} does not exist`);
  }
  if (lookup.agencyId && lookup.agencyId !== input.agencyId) {
    throw new ContactEventValidationError("lead belongs to another agency");
  }

  const { data, error } = await client
    .from("lead_events")
    .insert({
      agency_id: input.agencyId,
      lead_id: input.leadId,
      type: CONTACT_ATTEMPT_EVENT_TYPE,
      // `value` is a legacy non-null text column on lead_events. The channel is
      // also stored in its own column; this keeps existing readers that only
      // know `type`/`value` from seeing an empty string.
      value: input.channel,
      occurred_at: input.occurredAt.toISOString(),
      actor_profile_id: input.actorProfileId,
      channel: input.channel,
      outcome: input.outcome ?? null,
      source: input.source,
      note: input.note ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: String((data as { id: unknown }).id) };
}

/**
 * Has this lead had a real contact attempt, and when was the first one?
 *
 * Answers YES / NO / UNKNOWN. A lead whose answer is not "known" must not be
 * counted towards C1 — see `docs/premortems/2026-08-14-l99-lead-factory.md`,
 * which forbids a live conversion percentage without a contact timestamp.
 */
export async function getFirstContactAttemptAt(
  client: SupabaseClient,
  agencyId: string,
  leadId: string,
): Promise<FirstContactAttempt> {
  const { data, error } = await client
    .from("lead_events")
    .select("type, occurred_at, created_at")
    .eq("agency_id", agencyId)
    .eq("lead_id", leadId)
    .eq("type", CONTACT_ATTEMPT_EVENT_TYPE);

  if (error) throw new Error(error.message);
  return resolveFirstContactAttempt((data ?? []) as ContactEventRow[]);
}
