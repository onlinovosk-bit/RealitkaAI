/**
 * Typed contact-attempt events — the substrate C1 is measured on.
 *
 * Why this exists: `leads.last_contact` is a text column whose default is the
 * string "Práve vytvorený". Nothing can be counted from it, which is why the
 * Lead Factory premortem records that "C1 sa dnes nedá spočítať bez lži".
 * This module adds the one fact that makes C1 countable — when a human
 * actually tried to reach the lead — without touching that legacy column.
 *
 * It rides on `public.lead_events`, which already exists, is agency-scoped and
 * carries RLS. No new table: the reuse check found the canonical event path
 * already in place, only missing the fields below.
 */

/** The single `lead_events.type` value that counts as a human contact attempt. */
export const CONTACT_ATTEMPT_EVENT_TYPE = "contact_attempted";

export const CONTACT_CHANNELS = ["call", "email", "sms", "whatsapp", "other"] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export const CONTACT_OUTCOMES = ["answered", "unanswered", "sent", "bounced", "other"] as const;
export type ContactOutcome = (typeof CONTACT_OUTCOMES)[number];

/**
 * Who caused the attempt. `system-assisted` still means a human pressed
 * something — a scheduled send the agent approved. It never covers an AI draft
 * that nobody sent.
 */
export const CONTACT_SOURCES = ["manual", "system-assisted"] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

export interface RecordContactAttemptInput {
  agencyId: string;
  leadId: string;
  /** The profile that made the attempt. Never the AI, never a service account. */
  actorProfileId: string;
  /**
   * When the attempt happened — not when the row was written. Required with no
   * default on purpose: a default would quietly turn "we do not know" into a
   * number, which is the exact failure this module exists to prevent.
   */
  occurredAt: Date;
  channel: ContactChannel;
  outcome?: ContactOutcome;
  source: ContactSource;
  note?: string;
}

/**
 * A `lead_events` row as this module reads it. `occurred_at` is nullable
 * because rows written before this change — and any future backfill that
 * cannot establish a real time — legitimately have none.
 */
export interface ContactEventRow {
  type: string;
  occurred_at: string | null;
  created_at: string | null;
}

/**
 * Three states, never two. A lead with contact events that carry no time is
 * not the same as a lead nobody ever called, and collapsing the two is how a
 * conversion rate becomes fiction.
 */
export type FirstContactAttempt =
  | { state: "none" }
  | { state: "unknown"; attempts: number }
  | { state: "known"; occurredAt: string };

export class ContactEventValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactEventValidationError";
  }
}
