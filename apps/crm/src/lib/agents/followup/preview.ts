import { createAdminClient } from "@/lib/supabase/server";
import {
  FOLLOWUP_AGENCY_ID,
  OPEN_LEAD_STATUSES,
  STALE_CONTACT_DAYS,
} from "@/lib/agents/followup/constants";
import { evaluateFollowupBatch } from "@/lib/agents/followup/engine";
import { attachGuardianToDrafts, summarizeGuardianDrafts } from "@/lib/agents/followup/guardianReview";
import { computeContactedWithin24hPercent } from "@/lib/agents/followup/kpi";
import type { DraftAction, GuardedDraftAction, FollowupLeadInput } from "@/lib/agents/followup/types";

const MS_PER_DAY = 86_400_000;

export type FollowupPreviewResult = {
  ok: true;
  mode: "preview";
  agencyId: string;
  staleCutoff: string;
  scanned: number;
  drafts: GuardedDraftAction[];
  guardianSummary: ReturnType<typeof summarizeGuardianDrafts>;
  kpi: ReturnType<typeof computeContactedWithin24hPercent>;
};

export async function buildFollowupPreview(agencyId: string): Promise<
  | FollowupPreviewResult
  | { ok: false; error: string }
> {
  const admin = createAdminClient();
  const staleCutoff = new Date(Date.now() - STALE_CONTACT_DAYS * MS_PER_DAY).toISOString();

  const { data: rows, error } = await admin
    .from("leads")
    .select("id,name,email,phone,status,last_contact,updated_at,source,created_at")
    .eq("agency_id", agencyId)
    .in("status", [...OPEN_LEAD_STATUSES])
    .order("updated_at", { ascending: true })
    .limit(48);

  if (error) {
    return { ok: false, error: error.message };
  }

  const leads: FollowupLeadInput[] = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    name: String(r.name ?? ""),
    email: r.email ? String(r.email) : null,
    phone: r.phone ? String(r.phone) : null,
    status: String(r.status ?? ""),
    last_contact: r.last_contact ? String(r.last_contact) : null,
    updated_at: r.updated_at ? String(r.updated_at) : null,
    source: r.source ? String(r.source) : null,
  }));

  const engineResults = evaluateFollowupBatch(leads, { agencyId });
  const rawDrafts = engineResults
    .map((r) => r.draft)
    .filter((d): d is DraftAction => Boolean(d && d.decision !== "wait" && d.body));
  const drafts = attachGuardianToDrafts(rawDrafts, leads, agencyId);

  const kpiLeads = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    created_at: r.created_at ? String(r.created_at) : null,
    last_contact: r.last_contact ? String(r.last_contact) : null,
  }));

  return {
    ok: true,
    mode: "preview",
    agencyId,
    staleCutoff,
    scanned: leads.length,
    drafts,
    guardianSummary: summarizeGuardianDrafts(drafts),
    kpi: computeContactedWithin24hPercent(kpiLeads),
  };
}

/** Default Loop 1 tenant when profile has no agency_id (Smolko reference). */
export function resolveFollowupAgencyId(profileAgencyId?: string | null): string {
  return profileAgencyId?.trim() || FOLLOWUP_AGENCY_ID;
}
