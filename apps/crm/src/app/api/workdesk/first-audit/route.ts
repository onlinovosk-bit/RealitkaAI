import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { okResponse, errorResponse } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import {
  buildFirstAudit,
  type FirstAuditLeadInput,
} from "@/lib/workdesk/first-audit";
import { listLeads } from "@/lib/leads-store";
import { logNbaRecommendationsForLeads } from "@/lib/moat-capture/log-nba-batch";

/**
 * GET /api/workdesk/first-audit
 * 60s first-value audit from tenant leads — honest empty/sparse, no fake €.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const { data: rows, error } = await supabase
      .from("leads")
      .select(
        "id, name, status, budget, score, last_contact, created_at, ai_priority, ai_reason, is_active",
      )
      .eq("is_active", true)
      .limit(500);

    if (error) {
      return errorResponse("Nepodarilo sa načítať leady pre audit.", 500);
    }

    const leads: FirstAuditLeadInput[] = (rows ?? []).map((r) => ({
      id: String(r.id),
      name: String(r.name ?? "Bez mena"),
      status: String(r.status ?? "Nový") as FirstAuditLeadInput["status"],
      budget: r.budget != null ? String(r.budget) : "",
      score: Number(r.score ?? 0),
      lastContact: r.last_contact ? String(r.last_contact) : "Bez kontaktu",
      createdAt: r.created_at ? String(r.created_at) : undefined,
      aiPriority: (r.ai_priority as string | null) ?? null,
      aiReason: (r.ai_reason as string | null) ?? null,
    }));

    const audit = buildFirstAudit(leads);

    if (profile?.agency_id) {
      const tenantLeads = await listLeads(undefined, supabase);
      logNbaRecommendationsForLeads(profile.agency_id, tenantLeads, 3);
    }

    return okResponse({ audit });
  } catch {
    return errorResponse("Audit zlyhal.", 500);
  }
}
