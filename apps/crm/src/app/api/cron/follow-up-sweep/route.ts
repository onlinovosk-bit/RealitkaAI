/**
 * W2 — nightly sweep stagnujúcich **otvorených** leadov; draft alebo odoslanie (env).
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateOpenFollowUpsBatch } from "@/lib/ai/open-followup-generator";
import { sendMessage } from "@/lib/multi-channel-sender";
import type { StaleLeadInput } from "@/lib/ai/open-followup-generator";

const OPEN_STATUSES = ["Nový", "Teplý", "Horúci", "Obhliadka", "Ponuka"];

async function bumpFollowupMeta(admin: ReturnType<typeof createAdminClient>, leadId: string, now: string) {
  const { data: cur } = await admin
    .from("leads")
    .select("ai_followup_count")
    .eq("id", leadId)
    .maybeSingle();
  const next = Number(cur?.ai_followup_count ?? 0) + 1;
  await admin
    .from("leads")
    .update({
      last_ai_followup_at: now,
      ai_followup_count: next,
    })
    .eq("id", leadId);
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staleDays = Math.max(1, Number(process.env.FOLLOWUP_STALE_DAYS ?? "5"));
  const maxCandidates = Math.min(Number(process.env.FOLLOWUP_SWEEP_LIMIT ?? "24"), 60);
  const mode = String(process.env.FOLLOWUP_MODE ?? "draft").toLowerCase();
  const maxLifetime = Math.max(1, Number(process.env.FOLLOWUP_MAX_AI_PER_LEAD ?? "12"));
  const cooldownMs =
    Math.max(1, Number(process.env.FOLLOWUP_COOLDOWN_DAYS ?? "7")) * 86_400_000;

  const cutoff = new Date(Date.now() - staleDays * 86_400_000).toISOString();
  const weekAgo = new Date(Date.now() - cooldownMs).toISOString();
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("leads")
    .select(
      "id,name,email,phone,status,budget,location,last_contact,note,score,updated_at,last_ai_followup_at,ai_followup_count"
    )
    .in("status", OPEN_STATUSES)
    .lt("updated_at", cutoff)
    .lt("ai_followup_count", maxLifetime)
    .order("updated_at", { ascending: true })
    .limit(maxCandidates * 2);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const eligible = (rows ?? []).filter((r: { last_ai_followup_at?: string | null }) => {
    const last = r.last_ai_followup_at;
    return !last || new Date(last).getTime() < new Date(weekAgo).getTime();
  }).slice(0, maxCandidates);

  const inputs: StaleLeadInput[] = eligible.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    name: String(r.name ?? ""),
    email: r.email ? String(r.email) : "",
    phone: r.phone ? String(r.phone) : "",
    status: String(r.status ?? ""),
    budget: r.budget ? String(r.budget) : "",
    location: r.location ? String(r.location) : "",
    last_contact: r.last_contact ? String(r.last_contact) : "",
    note: r.note ? String(r.note) : "",
    score: Number(r.score ?? 50),
  }));

  let drafted = 0;
  let sent = 0;
  const failures: string[] = [];

  if (!inputs.length) {
    return NextResponse.json({
      ok: true,
      mode,
      eligible: 0,
      drafted: 0,
      sent: 0,
    });
  }

  const plans = await generateOpenFollowUpsBatch(inputs);
  const now = new Date().toISOString();

  for (const plan of plans) {
    if (!plan.should_contact || !plan.message.trim()) continue;

    const leadIn = inputs.find((i) => i.id === plan.lead_id);

    const addr =
      plan.channel === "email"
        ? leadIn?.email?.trim()
        : leadIn?.phone?.trim();

    const bodyText = [
      plan.message,
      plan.broker_cc_needed ? "\n\n[Poznámka: odporúčané zaradiť makléra (CC).]" : "",
    ]
      .join("")
      .trim();

    if (mode === "draft" || plan.broker_cc_needed || !addr) {
      const { error: actErr } = await admin.from("activities").insert({
        lead_id: plan.lead_id,
        type: "AI follow-up",
        title: "Návrh follow-upu (AI)",
        text: `${bodyText}\n\nDôvod: ${plan.reason_sk}\nKanál: ${plan.channel}`,
        entity_type: "lead",
        entity_id: plan.lead_id,
        actor_name: "AI follow-up sweep",
        source: "cron_follow_up_sweep",
        severity: "info",
        meta: { channel: plan.channel, draft: true, broker_cc: plan.broker_cc_needed },
      });
      if (!actErr) drafted += 1;
      else failures.push(`${plan.lead_id}: ${actErr.message}`);

      await bumpFollowupMeta(admin, plan.lead_id, now);
      continue;
    }

    const result = await sendMessage({
      leadId: plan.lead_id,
      to: addr,
      channel: plan.channel,
      subject: plan.subject || "Krátky follow-up",
      body: bodyText,
      aiGenerated: true,
      meta: { cron: "follow-up-sweep" },
    });

    if (result.ok) {
      sent += 1;
      await admin.from("activities").insert({
        lead_id: plan.lead_id,
        type: "AI follow-up odoslaný",
        title: `Odoslané (${plan.channel})`,
        text: bodyText.slice(0, 4000),
        entity_type: "lead",
        entity_id: plan.lead_id,
        actor_name: "AI follow-up sweep",
        source: "cron_follow_up_sweep",
        severity: "info",
        meta: { channel: plan.channel, message_id: result.messageId },
      });
    } else {
      failures.push(`${plan.lead_id}: ${result.error ?? "send failed"}`);
    }

    await bumpFollowupMeta(admin, plan.lead_id, now);
  }

  return NextResponse.json({
    ok: true,
    mode,
    evaluated: inputs.length,
    drafted,
    sent,
    failures,
  });
}
