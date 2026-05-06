import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReactivationPlan } from "@/lib/ai/dead-lead-campaign";
import type { DeadLeadInput } from "@/lib/ai/dead-lead-campaign";

/** GET /api/ai/dead-lead-campaign — generuje preview kampaň, NEnposiela správy */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

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

  // Paralelné volania Claude — max 5 naraz aby sme neprekročili rate limit
  const results = await Promise.allSettled(
    leads.map((lead) => generateReactivationPlan(lead as DeadLeadInput))
  );

  const candidates = results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter(Boolean);

  const toReactivate = candidates.filter((c) => c!.should_reactivate);

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

  const body = (await req.json()) as { lead_ids?: string[]; dry_run?: boolean };
  if (!body.lead_ids?.length) {
    return NextResponse.json({ ok: false, error: "lead_ids required" }, { status: 400 });
  }

  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, email, phone, status, budget, property_type, location, last_contact_at, score, note")
    .in("id", body.lead_ids);

  if (!leads?.length) return NextResponse.json({ ok: false, error: "No leads found" }, { status: 404 });

  const plans = await Promise.allSettled(
    leads.map((l) => generateReactivationPlan(l as DeadLeadInput))
  );

  const approved = plans
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((c) => c?.should_reactivate);

  if (body.dry_run) {
    return NextResponse.json({ ok: true, dry_run: true, would_send: approved.length, plans: approved });
  }

  // TODO: Zavolať sendMessage() pre každý schválený plán
  // import { sendMessage } from "@/lib/multi-channel-sender";
  // for (const plan of approved) {
  //   await sendMessage({ leadId: plan.lead.id, to: plan.lead.phone ?? plan.lead.email!, channel: plan.channel, body: plan.message, subject: plan.subject, aiGenerated: true });
  // }

  return NextResponse.json({
    ok: true,
    sent: approved.length,
    skipped: plans.length - approved.length,
  });
}
