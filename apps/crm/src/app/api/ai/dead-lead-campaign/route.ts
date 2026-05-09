import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
import { generateBatchReactivationPlan } from "@/lib/ai/dead-lead-campaign";
import type { DeadLeadInput } from "@/lib/ai/dead-lead-campaign";
import { sendMessage } from "@/lib/multi-channel-sender";

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

/** POST /api/ai/dead-lead-campaign — admin schvaľuje a spúšťa odoslanie */
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

  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, email, phone, status, budget, property_type, location, last_contact_at, score, note")
    .in("id", body.lead_ids);

  if (!leads?.length) return NextResponse.json({ ok: false, error: "No leads found" }, { status: 404 });

  // Batch: menej API calls
  const plans     = await generateBatchReactivationPlan(leads as DeadLeadInput[]);
  const approved  = plans.filter((c) => c.should_reactivate);

  if (body.dry_run) {
    return NextResponse.json({ ok: true, dry_run: true, would_send: approved.length, plans: approved });
  }

  const results = await Promise.allSettled(
    approved
      .filter((plan) => plan!.lead.phone || plan!.lead.email)
      .map((plan) =>
        sendMessage({
          leadId:      plan!.lead.id,
          to:          plan!.lead.phone ?? plan!.lead.email!,
          channel:     plan!.channel,
          body:        plan!.message,
          subject:     plan!.subject,
          aiGenerated: true,
        })
      )
  );

  const sent    = results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
  const failed  = results.length - sent;
  const noContact = approved.length - results.length;

  return NextResponse.json({
    ok:      true,
    sent,
    failed,
    skipped: plans.length - approved.length + noContact,
  });
}
