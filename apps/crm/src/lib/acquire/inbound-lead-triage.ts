import type { SupabaseClient } from "@supabase/supabase-js";
import { triageLeadBatches, type TriageLeadInput } from "@/lib/ai/lead-triage-batch";
import { createNotification, type NotificationPriority } from "@/lib/notifications/store";

export const NEW_LEAD_REASON_MAX = 180;
const OWNER_UI_ROLES = ["owner_vision", "owner_protocol"] as const;

export type InboundLeadRow = {
  id: string;
  name?: string | null;
  status?: string | null;
  score?: number | null;
  last_contact?: string | null;
  note?: string | null;
  source?: string | null;
  agency_id?: string | null;
  ai_triage_at?: string | null;
};

export type InboundLeadCandidate = {
  agencyId: string;
  name: string;
  status: string;
  note: string;
  source: string;
};

export function mapAiPriorityToNotificationPriority(
  value: string | null | undefined,
): NotificationPriority {
  switch (value) {
    case "Vysoká":
      return "critical";
    case "Stredná":
      return "high";
    default:
      return "normal";
  }
}

export async function resolveOwnerProfileId(
  supa: SupabaseClient,
  agencyId: string,
): Promise<string | null> {
  const { data, error } = await supa
    .from("profiles")
    .select("id")
    .eq("agency_id", agencyId)
    .or(`role.eq.owner,ui_role.eq.${OWNER_UI_ROLES[0]},ui_role.eq.${OWNER_UI_ROLES[1]}`)
    .limit(1);

  if (error) {
    console.error("[acquire.email] owner profile lookup failed:", error.message);
    return null;
  }
  return data?.[0]?.id ?? null;
}

type TriageDeps = {
  triageLeadBatches: typeof triageLeadBatches;
  createNotification: typeof createNotification;
  resolveOwnerProfileId: typeof resolveOwnerProfileId;
};

const defaultDeps: TriageDeps = {
  triageLeadBatches,
  createNotification,
  resolveOwnerProfileId,
};

/** Best-effort post-insert triage + new_lead notification. Never throws. */
export async function runInboundLeadTriageAndNotify(
  supa: SupabaseClient,
  lead: InboundLeadRow,
  candidate: InboundLeadCandidate,
  deps: TriageDeps = defaultDeps,
): Promise<void> {
  try {
    const leadId = String(lead.id);
    const { data: triageGuard, error: triageGuardError } = await supa
      .from("leads")
      .select("ai_triage_at")
      .eq("id", leadId)
      .maybeSingle();

    if (triageGuardError) {
      throw new Error(`triage guard read failed: ${triageGuardError.message}`);
    }

    if (triageGuard?.ai_triage_at) return;

    const input: TriageLeadInput = {
      id: leadId,
      name: String(lead.name ?? candidate.name ?? ""),
      status: String(lead.status ?? candidate.status ?? "Nový"),
      score: Number(lead.score ?? 0),
      last_contact: String(lead.last_contact ?? "Práve vytvorený (email gateway)"),
      note: String(lead.note ?? candidate.note ?? ""),
      source: String(lead.source ?? candidate.source ?? ""),
    };

    const triage = await deps.triageLeadBatches([input]);
    const row = triage[0];
    if (!row) return;

    const triagedAt = new Date().toISOString();
    const { error: triageUpdateError } = await supa
      .from("leads")
      .update({
        ai_priority: row.priority,
        ai_reason: row.reason,
        ai_triage_at: triagedAt,
      })
      .eq("id", leadId)
      .is("ai_triage_at", null);

    if (triageUpdateError) {
      throw new Error(`triage update failed: ${triageUpdateError.message}`);
    }

    const agencyId = String(lead.agency_id ?? candidate.agencyId);
    const ownerProfileId = await deps.resolveOwnerProfileId(supa, agencyId);
    const shortReason = String(row.reason ?? "").slice(0, NEW_LEAD_REASON_MAX);
    await deps.createNotification({
      agencyId,
      profileId: ownerProfileId ?? undefined,
      type: "new_lead",
      priority: mapAiPriorityToNotificationPriority(row.priority),
      title: `Nový lead: ${String(lead.name ?? candidate.name ?? "Neznámy lead")}`,
      body: `${String(lead.source ?? candidate.source ?? "neznámy zdroj")} · ${row.priority} · ${shortReason}`,
      data: {
        leadId,
        source: String(lead.source ?? candidate.source ?? ""),
        ai_priority: row.priority,
        ai_reason: shortReason,
      },
    });
  } catch (triageError) {
    console.error("[acquire.email] triage/notification best-effort failed:", triageError);
  }
}
