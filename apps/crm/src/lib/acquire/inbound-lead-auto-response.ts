import type { SupabaseClient } from "@supabase/supabase-js";
import { autoErrorCapture } from "@/lib/auto-error-capture";
import { sendInboundAutoResponse } from "@/lib/acquire/send-inbound-auto-response";
import {
  recordAutoResponseOutcome,
  safeErrorName,
  type AutoResponseResult,
} from "@/lib/acquire/auto-response-outcome";

const OWNER_UI_ROLES = ["owner_vision", "owner_protocol"] as const;
const MISSING_COLUMN = "42703";

export type InboundLeadAutoResponseLead = {
  id: string;
  agency_id?: string | null;
};

export type InboundLeadAutoResponseCandidate = {
  agencyId: string;
  name: string;
  email: string;
};

type AgencyRow = {
  name: string | null;
  email: string | null;
  phone: string | null;
  auto_response_enabled: boolean | null;
};

type OwnerContact = {
  email: string | null;
  phone: string | null;
};

function isMissingColumnError(error: { code?: string } | null | undefined): boolean {
  return error?.code === MISSING_COLUMN;
}

async function resolveOwnerContact(
  supa: SupabaseClient,
  agencyId: string,
): Promise<OwnerContact | null> {
  const { data, error } = await supa
    .from("profiles")
    .select("email, phone")
    .eq("agency_id", agencyId)
    .or(`role.eq.owner,ui_role.eq.${OWNER_UI_ROLES[0]},ui_role.eq.${OWNER_UI_ROLES[1]}`)
    .limit(1);

  if (error) {
    autoErrorCapture(error, "inbound-auto-response:owner_contact_lookup");
    return null;
  }

  return data?.[0] ?? null;
}

/** Prod-safe agency load — tolerates missing optional columns (email, phone, flags). */
export async function loadAgencyAutoResponseContext(
  supa: SupabaseClient,
  agencyId: string,
): Promise<{ agency: AgencyRow | null; autoResponseEnabled: boolean }> {
  const { data: base, error: baseError } = await supa
    .from("agencies")
    .select("name")
    .eq("id", agencyId)
    .maybeSingle();

  if (baseError) {
    throw new Error(`agency lookup failed: ${baseError.message}`);
  }

  const agency: AgencyRow = {
    name: base?.name ?? null,
    email: null,
    phone: null,
    auto_response_enabled: null,
  };

  let autoResponseEnabled = true;

  const { data: flags, error: flagsError } = await supa
    .from("agencies")
    .select("auto_response_enabled")
    .eq("id", agencyId)
    .maybeSingle();

  if (!flagsError && flags) {
    agency.auto_response_enabled = flags.auto_response_enabled;
    autoResponseEnabled = flags.auto_response_enabled !== false;
  } else if (flagsError && !isMissingColumnError(flagsError)) {
    throw new Error(`agency flags lookup failed: ${flagsError.message}`);
  }

  const { data: contact, error: contactError } = await supa
    .from("agencies")
    .select("email, phone")
    .eq("id", agencyId)
    .maybeSingle();

  if (!contactError && contact) {
    agency.email = contact.email;
    agency.phone = contact.phone;
  } else if (contactError && !isMissingColumnError(contactError)) {
    throw new Error(`agency contact lookup failed: ${contactError.message}`);
  }

  return { agency, autoResponseEnabled };
}

export async function resolveInboundAutoResponseContacts(
  supa: SupabaseClient,
  agencyId: string,
  agency: AgencyRow | null,
): Promise<{ replyTo: string | null; agencyPhone: string | null }> {
  let replyTo = agency?.email?.trim() || "";
  let agencyPhone = agency?.phone?.trim() || "";

  if (!replyTo) {
    const owner = await resolveOwnerContact(supa, agencyId);
    if (owner?.email?.trim()) replyTo = owner.email.trim();
    if (!agencyPhone && owner?.phone?.trim()) agencyPhone = owner.phone.trim();
  }

  return {
    replyTo: replyTo || null,
    agencyPhone: agencyPhone || null,
  };
}

/**
 * Jeden pokus o auto-odpoveď. Každý východ vracia pomenovaný výsledok, aby po ňom zostala
 * stopa; neočakávané výnimky (čítanie z DB…) nechá prepadnúť volajúcemu, ktorý ich zapíše
 * ako `failed_error`.
 */
async function attemptInboundAutoResponse(
  supa: SupabaseClient,
  agencyId: string,
  leadId: string,
  candidate: InboundLeadAutoResponseCandidate,
): Promise<AutoResponseResult> {
  const leadEmail = candidate.email.trim();
  if (!leadEmail) return { outcome: "skipped_no_email" };

  const { data: freshLead, error: freshLeadError } = await supa
    .from("leads")
    .select(
      "auto_response_sent_at,name,assigned_agent,ai_priority,source",
    )
    .eq("id", leadId)
    .maybeSingle();

  if (freshLeadError) {
    if (isMissingColumnError(freshLeadError)) {
      autoErrorCapture(
        "leads.auto_response_sent_at missing — apply prod SQL migration bundle before enabling auto-response",
        "inbound-auto-response:migration_required",
      );
      return { outcome: "failed_error", reason: "migration_required" };
    }
    throw new Error(`dedup guard read failed: ${freshLeadError.message}`);
  }
  if (freshLead?.auto_response_sent_at) return { outcome: "skipped_already_sent" };

  const { agency, autoResponseEnabled } = await loadAgencyAutoResponseContext(supa, agencyId);
  if (!autoResponseEnabled) return { outcome: "skipped_disabled" };

  const { replyTo, agencyPhone } = await resolveInboundAutoResponseContacts(
    supa,
    agencyId,
    agency,
  );

  if (!replyTo) {
    autoErrorCapture(
      `missing agency reply-to for agency ${agencyId}`,
      "inbound-auto-response:missing_reply_to",
    );
    return { outcome: "failed_no_reply_to" };
  }

  const sendResult = await sendInboundAutoResponse({
    to: leadEmail,
    leadName: freshLead?.name?.trim() || candidate.name,
    agencyName: agency?.name?.trim() || "Realitná kancelária",
    agencyPhone,
    replyTo,
    assignedAgent: freshLead?.assigned_agent,
    aiPriority: freshLead?.ai_priority,
    source: freshLead?.source,
    // Bez toho sa otvorenie tohto e-mailu nedá priradiť k leadu
    // (ENGAGEMENT-EMAIL-01).
    leadId,
  });

  if (!sendResult.ok) {
    autoErrorCapture(
      new Error(sendResult.error),
      "inbound-auto-response:resend_send",
    );
    return {
      outcome: "failed_send",
      reason: sendResult.failure?.reason ?? "unknown",
      httpStatus: sendResult.failure?.httpStatus ?? null,
      errorName: sendResult.failure?.errorName ?? null,
      fromDomain: sendResult.failure?.fromDomain ?? null,
    };
  }

  const sentAt = new Date().toISOString();
  const { error: updateError } = await supa
    .from("leads")
    .update({ auto_response_sent_at: sentAt })
    .eq("id", leadId)
    .is("auto_response_sent_at", null);

  if (updateError) {
    autoErrorCapture(updateError, "inbound-auto-response:dedup_update");
    return { outcome: "sent_unmarked", reason: "dedup_update_failed", fromDomain: sendResult.fromDomain ?? null };
  }

  return { outcome: "sent", fromDomain: sendResult.fromDomain ?? null };
}

/**
 * Best-effort inbound auto-response after triage.
 * Never throws — failures are logged via autoErrorCapture, and every attempt leaves exactly
 * one persistent `inbound.auto_response` record (see auto-response-outcome.ts).
 */
export async function runInboundLeadAutoResponse(
  supa: SupabaseClient,
  lead: InboundLeadAutoResponseLead,
  candidate: InboundLeadAutoResponseCandidate,
): Promise<void> {
  const agencyId = String(lead.agency_id ?? candidate.agencyId);
  const leadId = String(lead.id);

  let result: AutoResponseResult;
  try {
    result = await attemptInboundAutoResponse(supa, agencyId, leadId, candidate);
  } catch (error) {
    autoErrorCapture(error, "inbound-auto-response");
    result = { outcome: "failed_error", reason: "unexpected", errorName: safeErrorName(error) };
  }

  await recordAutoResponseOutcome({ agencyId, leadId, result });
}
