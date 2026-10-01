export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/store";
import { createClient } from "@/lib/supabase/server";
import { generateRescuePlan } from "@/lib/ai/rescue-message";
import {
  excludeLeadsWithOpenRescueTask,
  pickSellerRescueCandidates,
} from "@/lib/routines/seller-rescue";
import { resolveProfileForAuthUser } from "@/lib/profiles/resolve-profile-for-auth";
import { isCeoCommandOwner } from "@/lib/ceo-command/access";

const DEFAULT_DAYS = 7;

async function runSellerRescueForAgency(agencyId: string, minDaysWithoutContact = DEFAULT_DAYS) {
  const supabase = createAdminClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, status, last_contact, created_at, assigned_profile_id")
    .eq("agency_id", agencyId)
    .limit(500);

  const leadIds = (leads ?? []).map((lead) => lead.id);
  const activityCountByLeadId: Record<string, number> = {};
  if (leadIds.length > 0) {
    const { data: activities } = await supabase
      .from("activities")
      .select("lead_id")
      .in("lead_id", leadIds);
    for (const row of activities ?? []) {
      const leadId = String(row.lead_id ?? "");
      if (!leadId) continue;
      activityCountByLeadId[leadId] = (activityCountByLeadId[leadId] ?? 0) + 1;
    }
  }

  const atRisk = pickSellerRescueCandidates({
    leads: leads ?? [],
    activityCountByLeadId,
    minDaysWithoutContact,
    limit: 10,
  });

  if (atRisk.length === 0) {
    return {
      atRiskLeads: 0,
      message: `Žiadne leady bez kontaktu nad ${minDaysWithoutContact} dní — dobrá práca.`,
    };
  }

  const { data: openRescueTasks } = await supabase
    .from("tasks")
    .select("lead_id")
    .in("lead_id", atRisk.map((candidate) => candidate.leadId))
    .eq("status", "open")
    .like("title", "Seller Rescue%");
  const fresh = excludeLeadsWithOpenRescueTask(
    atRisk,
    (openRescueTasks ?? []).map((row) => String(row.lead_id)),
  );

  if (fresh.length === 0) {
    return {
      atRiskLeads: 0,
      message: `Žiadne nové rizikové leady — ${atRisk.length} už má otvorenú Seller Rescue úlohu.`,
    };
  }

  const routineRows: Array<Record<string, unknown>> = [];
  for (const candidate of fresh) {
    const draft = await generateRescuePlan(
      {
        leadName: candidate.leadName,
        score: candidate.riskScore,
        triggerType: "no_contact_window",
      },
      "email",
    );

    const dueAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    await supabase.from("tasks").insert({
      lead_id: candidate.leadId,
      assigned_profile_id: candidate.assignedProfileId,
      title: `Seller Rescue: follow-up po ${candidate.daysWithoutContact} dňoch`,
      description: draft.messagePreview,
      status: "open",
      priority: candidate.riskScore >= 80 ? "high" : "medium",
      due_at: dueAt,
    });

    routineRows.push({
      leadId: candidate.leadId,
      leadName: candidate.leadName,
      daysWithoutContact: candidate.daysWithoutContact,
      riskScore: candidate.riskScore,
      riskReason: candidate.riskReason,
      recommendedAction: "Kontaktuj dnes",
      draftEmail: draft.messagePreview,
    });
  }

  const top = fresh[0];
  await createNotification({
    agencyId,
    type: "seller_rescue",
    priority: top.riskScore >= 80 ? "critical" : "high",
    title: `Seller Rescue: ${fresh.length} leadov bez kontaktu nad ${minDaysWithoutContact} dní`,
    body: "V1 beží na všetkých leadoch bez kontaktu (seller-only filter je pending do intent pola).",
    data: { leads: routineRows, minDaysWithoutContact },
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  return { atRiskLeads: fresh.length, message: `Vyhodnotené leady bez kontaktu nad ${minDaysWithoutContact} dní.` };
}

async function runSellerRescue(minDaysWithoutContact = DEFAULT_DAYS) {
  const supabase = createAdminClient();
  const { data: agencies } = await supabase.from("agencies").select("id");
  if (!agencies?.length) return NextResponse.json({ ok: true, processed: 0, atRiskLeads: 0 });

  let totalAtRisk = 0;
  for (const agency of agencies) {
    const result = await runSellerRescueForAgency(agency.id, minDaysWithoutContact);
    totalAtRisk += result.atRiskLeads;
  }
  return NextResponse.json({ ok: true, processed: agencies.length, atRiskLeads: totalAtRisk });
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const minDays = Number(request.nextUrl.searchParams.get("days") ?? DEFAULT_DAYS);
    return await runSellerRescue(Number.isFinite(minDays) ? minDays : DEFAULT_DAYS);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[seller-rescue] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profile } = await resolveProfileForAuthUser(
    supabase,
    user.id,
    "agency_id, role, ui_role",
    user.email,
  );
  if (!profile?.agency_id) return NextResponse.json({ error: "Profile agency missing" }, { status: 400 });
  if (!isCeoCommandOwner(profile)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let minDays = DEFAULT_DAYS;
  try {
    const body = (await request.json()) as { days?: number };
    if (typeof body.days === "number" && Number.isFinite(body.days) && body.days >= 1) {
      minDays = Math.floor(body.days);
    }
  } catch {
    // optional body only
  }

  try {
    const result = await runSellerRescueForAgency(profile.agency_id, minDays);
    return NextResponse.json({
      ok: true,
      agencyId: profile.agency_id,
      atRiskLeads: result.atRiskLeads,
      message: result.message,
      minDaysWithoutContact: minDays,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[seller-rescue:on-demand] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
