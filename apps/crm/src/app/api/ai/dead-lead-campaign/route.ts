import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
import { DEAD_LEAD_PROMPT_VERSION, generateBatchReactivationPlan } from "@/lib/ai/dead-lead-campaign";
import type { DeadLeadInput } from "@/lib/ai/dead-lead-campaign";
import { DEAD_LEAD_AGENT_ID } from "@/lib/inbound/draft-view";
import { insertAgentDraft, recipientFor } from "@/lib/inbound/insert-agent-draft";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/** GET /api/ai/dead-lead-campaign — generuje preview kampaň, NEnposiela správy */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const block = await checkAiRateLimit(user.id, "dead-lead-campaign", 3);
  if (block) return NextResponse.json(block, { status: 429 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, name, email, phone, status, budget, property_type, location, last_contact_at, score, note")
    .in("status", ["Zamietnutý", "DEAD", "dead", "Uzatvorený"])
    .order("score", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!leads?.length) return NextResponse.json({ ok: true, candidates: [], total: 0 });

  // Batch: 5 leadov per Claude call — 10x menej API calls
  const candidates = await generateBatchReactivationPlan(leads as DeadLeadInput[]);
  const toReactivate = candidates.filter((c) => c.should_reactivate);

  return NextResponse.json({
    ok: true,
    total: leads.length,
    to_reactivate: toReactivate.length,
    candidates,
  });
}

/**
 * POST /api/ai/dead-lead-campaign — vytvorí NÁVRHY reaktivačných správ.
 *
 * Tier 3 (Revolis System Spec §13): nič neodosiela. Každý návrh sa objaví
 * v časovej osi leadu a maklér ho pošle cez „Schváliť a odoslať"
 * (POST /api/leads/:id/drafts/:activityId/approve) — presne ten text, ktorý
 * videl. `dry_run: true` vráti plány bez zápisu.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const block = await checkAiRateLimit(user.id, "dead-lead-campaign", 3);
  if (block) return NextResponse.json(block, { status: 429 });

  const body = (await req.json()) as { lead_ids?: string[]; dry_run?: boolean };
  if (!body.lead_ids?.length) {
    return NextResponse.json({ ok: false, error: "lead_ids required" }, { status: 400 });
  }
  if (body.lead_ids.length > 50) {
    return NextResponse.json({ ok: false, error: "Max 50 lead_ids na jeden request." }, { status: 400 });
  }

  // Request-scoped client: RLS decides which of the ids this user may touch.
  const { data: leads } = await supabase
    .from("leads")
    .select("id, agency_id, name, email, phone, status, budget, property_type, location, last_contact_at, score, note")
    .in("id", body.lead_ids);

  if (!leads?.length) return NextResponse.json({ ok: false, error: "No leads found" }, { status: 404 });

  const plans    = await generateBatchReactivationPlan(leads as DeadLeadInput[]);
  const approved = plans.filter((c) => c.should_reactivate);

  if (body.dry_run) {
    return NextResponse.json({ ok: true, dry_run: true, would_draft: approved.length, plans: approved });
  }

  // Only rows the caller could read above reach this point, so the service
  // role is used for the activity write alone, not for tenant selection.
  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Služba nie je dostupná." }, { status: 503 });
  }

  const agencyByLead = new Map(
    (leads as Array<{ id: string; agency_id?: string | null }>).map((l) => [l.id, l.agency_id ?? null]),
  );

  let drafted = 0;
  let noContact = 0;
  const failures: string[] = [];

  for (const plan of approved) {
    const recipient = recipientFor(plan.channel, plan.lead);
    if (!recipient) noContact += 1;

    const res = await insertAgentDraft({
      admin,
      leadId: plan.lead.id,
      agencyId: agencyByLead.get(plan.lead.id) ?? null,
      agentId: DEAD_LEAD_AGENT_ID,
      promptVersion: DEAD_LEAD_PROMPT_VERSION,
      channel: plan.channel,
      subject: plan.subject || "Ozývame sa znova",
      body: plan.message.trim(),
      recipient,
      activity: {
        type: "AI reaktivácia",
        title: "Návrh reaktivácie (AI)",
        actorName: "AI dead-lead kampaň",
        source: "api_dead_lead_campaign",
        notes: [
          `Dôvod: ${plan.reason}`,
          `Kanál: ${plan.channel} · šanca ${plan.reactivation_score} %`,
        ],
      },
      extraMeta: { reactivation_score: plan.reactivation_score, cooldown_days: plan.cooldown_days },
      auditAction: "dead_lead_campaign_draft",
    });
    if (res.ok) drafted += 1;
    else failures.push(`${plan.lead.id}: ${res.error}`);
  }

  return NextResponse.json({
    ok: true,
    drafted,
    sent: 0,
    no_contact: noContact,
    skipped: plans.length - approved.length,
    failures,
  });
}
