/**
 * W2 — nightly sweep stagnujúcich **otvorených** leadov → iba NÁVRHY.
 *
 * Tier 3 (Revolis System Spec §13): správa klientovi potrebuje ľudské schválenie.
 * Cron nič neodosiela — ani pri FOLLOWUP_MODE=send (tá hodnota sa už ignoruje
 * a hlási v odpovedi). Maklér návrh odošle cez „Schváliť a odoslať"
 * (POST /api/leads/:id/drafts/:activityId/approve).
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { FOLLOWUP_PROMPT_VERSION, generateOpenFollowUpsBatch } from "@/lib/ai/open-followup-generator";
import { FOLLOWUP_SWEEP_AGENT_ID } from "@/lib/inbound/draft-view";
import { insertAgentDraft, recipientFor } from "@/lib/inbound/insert-agent-draft";
import type { StaleLeadInput } from "@/lib/ai/open-followup-generator";
import { scoreFollowUp } from "@/lib/cron/follow-up-scoring";
import {
  callerUserAgent,
  cronHttpStatus,
  deriveCronStatus,
  recordCronRun,
  recordUnauthorizedCronRun,
  vercelCronSchedule,
} from "@/lib/ops/cron-run";

/**
 * FOLLOWUP-CRON-OBSERVE-01 — prečo tento cron odteraz píše do `cron_runs`.
 *
 * Zmerané na PROD 2026-10-15: 522 z 523 leadov spĺňa VŠETKY podmienky
 * spôsobilosti (otvorený stav, bez zmeny > 5 dní, pod limitom, bez cooldownu),
 * a pritom `ai_followup_count > 0` má **nula** leadov a návrhov od tohto agenta
 * je **nula**. Cron teda nemal „nič na práci" — mal 522 kandidátov a nespravil
 * nič.
 *
 * Či vôbec bežal, sa nedalo zistiť: runtime logy Vercelu na Hobby pláne držia
 * ~1 hodinu a tento cron beží o 22:00, takže ráno po ňom nie je stopa. Riadok
 * v `cron_runs` je jediné, čo beh prežije — bez neho je „nebežalo to"
 * nerozlíšiteľné od „bežalo a nič nenašlo".
 */
const JOB = "follow-up-sweep";

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
    // Odmietnutie požiadavky s cron hlavičkou musí po sebe nechať stopu, inak
    // je prázdna `cron_runs` nerozlíšiteľná od „cron vôbec nebežal". Hlavička
    // je len rozlišovač, nie dôkaz — poslať ju vie ktokoľvek.
    const schedule = vercelCronSchedule(request.headers);
    if (schedule) {
      await recordUnauthorizedCronRun(
        createAdminClient(), JOB, schedule, callerUserAgent(request.headers),
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();

  const staleDays = Math.max(1, Number(process.env.FOLLOWUP_STALE_DAYS ?? "5"));
  const maxCandidates = Math.min(Number(process.env.FOLLOWUP_SWEEP_LIMIT ?? "24"), 60);
  // Kept only to report a stale config; it no longer changes behaviour.
  const requestedMode = String(process.env.FOLLOWUP_MODE ?? "draft").toLowerCase();
  const mode = "draft";
  const maxLifetime = Math.max(1, Number(process.env.FOLLOWUP_MAX_AI_PER_LEAD ?? "12"));
  const cooldownMs =
    Math.max(1, Number(process.env.FOLLOWUP_COOLDOWN_DAYS ?? "7")) * 86_400_000;

  const cutoff = new Date(Date.now() - staleDays * 86_400_000).toISOString();
  const weekAgo = new Date(Date.now() - cooldownMs).toISOString();
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("leads")
    .select(
      "id,agency_id,name,email,phone,status,budget,location,last_contact,note,score,updated_at,last_ai_followup_at,ai_followup_count,ai_priority"
    )
    .in("status", OPEN_STATUSES)
    .lt("updated_at", cutoff)
    .lt("ai_followup_count", maxLifetime)
    .order("updated_at", { ascending: true })
    .limit(maxCandidates * 2);

  if (error) {
    await recordCronRun(admin, {
      job: JOB, status: "failed", startedAt,
      firstError: `leads: ${error.message}`,
    });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const scanned = rows?.length ?? 0;

  const eligible = (rows ?? []).filter((r: { last_ai_followup_at?: string | null }) => {
    const last = r.last_ai_followup_at;
    return !last || new Date(last).getTime() < new Date(weekAgo).getTime();
  }).slice(0, maxCandidates);

  for (const r of eligible) {
    const row = r as Record<string, unknown>;
    const action = scoreFollowUp({
      id: String(row.id),
      name: row.name ? String(row.name) : null,
      last_contact: row.last_contact ? String(row.last_contact) : null,
      ai_priority: row.ai_priority ? String(row.ai_priority) : null,
    });
    await admin
      .from("leads")
      .update({ ai_reason: `${action.suggestedAction} — ${action.reason}` })
      .eq("id", action.leadId);
  }

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

  const agencyByLead = new Map<string, string | null>(
    eligible.map((r: Record<string, unknown>) => [
      String(r.id),
      r.agency_id ? String(r.agency_id) : null,
    ]),
  );

  let drafted = 0;
  const failures: string[] = [];

  if (!inputs.length) {
    const logError = await recordCronRun(admin, {
      job: JOB, status: "empty", startedAt, scanned, eligible: 0,
      detail: { stale_days: staleDays, cooldown_days: cooldownMs / 86_400_000 },
    });
    return NextResponse.json({
      ok: true,
      mode,
      requested_mode: requestedMode,
      scanned,
      eligible: 0,
      drafted: 0,
      sent: 0,
      run_log_error: logError,
    });
  }

  const plans = await generateOpenFollowUpsBatch(inputs);
  const now = new Date().toISOString();

  for (const plan of plans) {
    if (!plan.should_contact || !plan.message.trim()) continue;

    const leadIn = inputs.find((i) => i.id === plan.lead_id);
    const res = await insertAgentDraft({
      admin,
      leadId: plan.lead_id,
      agencyId: agencyByLead.get(plan.lead_id) ?? null,
      agentId: FOLLOWUP_SWEEP_AGENT_ID,
      promptVersion: FOLLOWUP_PROMPT_VERSION,
      channel: plan.channel,
      subject: plan.subject || "Krátky follow-up",
      body: plan.message.trim(),
      recipient: leadIn ? recipientFor(plan.channel, leadIn) : null,
      activity: {
        type: "AI follow-up",
        title: "Návrh follow-upu (AI)",
        actorName: "AI follow-up sweep",
        source: "cron_follow_up_sweep",
        notes: [
          `Dôvod: ${plan.reason_sk}`,
          `Kanál: ${plan.channel}`,
          ...(plan.broker_cc_needed ? ["[Poznámka: odporúčané zaradiť makléra (CC).]"] : []),
        ],
      },
      extraMeta: { broker_cc: plan.broker_cc_needed },
      auditAction: "followup_sweep_draft",
    });
    if (!res.ok) {
      failures.push(`${plan.lead_id}: ${res.error}`);
      continue;
    }
    drafted += 1;

    await bumpFollowupMeta(admin, plan.lead_id, now);
  }

  const status = deriveCronStatus(inputs.length, drafted, failures.length);
  const logError = await recordCronRun(admin, {
    job: JOB, status, startedAt,
    scanned, eligible: inputs.length, written: drafted, failed: failures.length,
    firstError: failures[0] ?? null,
    detail: {
      stale_days: staleDays,
      cooldown_days: cooldownMs / 86_400_000,
      max_candidates: maxCandidates,
      // `plans` môže byť kratšie než `inputs` — model povie „nekontaktovať".
      planned: plans.length,
    },
  });

  // Pravidlo aj s dôvodom žije v cronHttpStatus(); tu sa len použije.
  return NextResponse.json({
    ok: true,
    mode,
    requested_mode: requestedMode,
    scanned,
    evaluated: inputs.length,
    drafted,
    sent: 0,
    failures,
    run_log_error: logError,
  }, { status: cronHttpStatus(status, logError) });
}
