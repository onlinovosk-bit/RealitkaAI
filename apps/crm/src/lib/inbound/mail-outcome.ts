// ================================================================
// Revolis.AI — inbound_mail_outcomes: trvalá stopa po jednom e-maile príjmu
//
// DOMAIN-LOG-DURABLE. Runtime logy Vercelu prežijú ~1 h, takže sa nedá zistiť,
// ktoré domény reálne chodia ani koľko dopytov sa zahodilo. Tento zápis je tá
// stopa.
//
// GDPR: sem sa dostáva LEN doména odosielateľa a boolean príznaky. Funkcia
// berie `AcquireEvent`, nie surový mail, a polia sú vymenované explicitne —
// nový údaj sa sem nedostane omylom.
//
// Zápis je fail-soft (príjem leadu je dôležitejší než denník), ale zlyhanie sa
// nezahodí ticho: ide na `console.warn`.
// ================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MailboxLogEvent } from "./mailbox-routing";
import { notLeadDiagnostics } from "../acquire/email-adapter";

export type InboundOutcome = "lead_created" | "not_a_lead";

export type InboundMailOutcomeRow = {
  agency_id: string;
  request_id: string | null;
  event_id: string | null;
  outcome: InboundOutcome;
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
  mailbox_event: MailboxLogEvent | null;
};

type Diagnostics = ReturnType<typeof notLeadDiagnostics>;

export function buildMailOutcomeRow(input: {
  agencyId: string;
  requestId: string | null;
  eventId: string | null;
  outcome: InboundOutcome;
  reason: string | null;
  diagnostics: Diagnostics;
  mailboxEvent: MailboxLogEvent | null;
}): InboundMailOutcomeRow {
  const d = input.diagnostics;
  return {
    agency_id: input.agencyId,
    request_id: input.requestId,
    event_id: input.eventId,
    outcome: input.outcome,
    reason: input.reason,
    source: d.source ?? null,
    source_type: d.source_type ?? null,
    event_kind: d.event_kind ?? null,
    source_detected_by: d.source_detected_by ?? null,
    // LEN doména — `senderDomainOf` lokálnu časť zahadzuje.
    sender_domain: d.sender_domain ?? null,
    parser_version: d.parser_version ?? null,
    has_contact_email: d.has_contact_email,
    has_contact_phone: d.has_contact_phone,
    has_listing_ref: d.has_listing_ref,
    has_message: d.has_message,
    mailbox_event: input.mailboxEvent,
  };
}

/** Vráti true pri úspechu. Nikdy nehádže — príjem leadu sa kvôli denníku nesmie rozbiť. */
export async function recordInboundMailOutcome(
  supa: SupabaseClient,
  row: InboundMailOutcomeRow,
): Promise<boolean> {
  try {
    const { error } = await supa.from("inbound_mail_outcomes").insert(row);
    if (error) {
      console.warn("[acquire.email] mail_outcome_write_failed", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[acquire.email] mail_outcome_write_failed", String(e));
    return false;
  }
}
