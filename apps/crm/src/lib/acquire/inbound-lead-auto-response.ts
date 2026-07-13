import type { SupabaseClient } from "@supabase/supabase-js";
import { autoErrorCapture } from "@/lib/auto-error-capture";
import { sendInboundAutoResponse } from "@/lib/acquire/send-inbound-auto-response";

const OWNER_UI_ROLES = ["owner_vision", "owner_protocol"] as const;

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
 * Best-effort inbound auto-response after triage.
 * Never throws — failures are logged via autoErrorCapture.
 */
export async function runInboundLeadAutoResponse(
  supa: SupabaseClient,
  lead: InboundLeadAutoResponseLead,
  candidate: InboundLeadAutoResponseCandidate,
): Promise<void> {
  const leadEmail = candidate.email.trim();
  if (!leadEmail) return;

  const agencyId = String(lead.agency_id ?? candidate.agencyId);
  const leadId = String(lead.id);

  try {
    const { data: freshLead, error: freshLeadError } = await supa
      .from("leads")
      .select("auto_response_sent_at")
      .eq("id", leadId)
      .maybeSingle();

    if (freshLeadError) {
      throw new Error(`dedup guard read failed: ${freshLeadError.message}`);
    }
    if (freshLead?.auto_response_sent_at) return;

    const { data: agency, error: agencyError } = await supa
      .from("agencies")
      .select("name, email, phone, auto_response_enabled")
      .eq("id", agencyId)
      .maybeSingle();

    if (agencyError) {
      throw new Error(`agency lookup failed: ${agencyError.message}`);
    }
    if (agency?.auto_response_enabled === false) return;

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
      return;
    }

    const sendResult = await sendInboundAutoResponse({
      to: leadEmail,
      leadName: candidate.name,
      agencyName: agency?.name?.trim() || "Realitná kancelária",
      agencyPhone,
      replyTo,
    });

    if (!sendResult.ok) {
      autoErrorCapture(
        new Error(sendResult.error),
        "inbound-auto-response:resend_send",
      );
      return;
    }

    const sentAt = new Date().toISOString();
    const { error: updateError } = await supa
      .from("leads")
      .update({ auto_response_sent_at: sentAt })
      .eq("id", leadId)
      .is("auto_response_sent_at", null);

    if (updateError) {
      autoErrorCapture(updateError, "inbound-auto-response:dedup_update");
    }
  } catch (error) {
    autoErrorCapture(error, "inbound-auto-response");
  }
}
