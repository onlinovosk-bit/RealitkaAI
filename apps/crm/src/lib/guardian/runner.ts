import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GUARDIAN_BASELINE_FINDING_KILL,
  GUARDIAN_BATCH_LEAD_LIMIT,
  GUARDIAN_FINDINGS_TABLE,
  GUARDIAN_RUNNER_NOTIFICATION_TYPE,
} from "@/lib/guardian/config";
import { isActiveLeadStatus } from "@/lib/guardian/active-leads";
import {
  evaluateRuleForLead,
  GUARDIAN_RULE_CODES,
} from "@/lib/guardian/rules";
import type {
  GuardianLeadRow,
  GuardianRuleCode,
  GuardianRunStats,
} from "@/lib/guardian/types";
import { SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";

function emptyByRule(): Record<GuardianRuleCode, number> {
  return { STALE: 0, NO_OWNER: 0, NO_PHONE: 0, HOT_IGNORED: 0 };
}

async function fetchLastEventByLead(
  supabase: SupabaseClient,
  agencyId: string,
  leadIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (leadIds.length === 0) return map;

  const { data, error } = await supabase
    .from("lead_events")
    .select("lead_id, created_at")
    .eq("agency_id", agencyId)
    .in("lead_id", leadIds)
    .order("created_at", { ascending: false });

  if (error || !data) return map;
  for (const row of data) {
    const leadId = String(row.lead_id ?? "");
    if (!leadId || map.has(leadId)) continue;
    map.set(leadId, String(row.created_at));
  }
  return map;
}

async function agencyHadBaselineRun(supabase: SupabaseClient, agencyId: string): Promise<boolean> {
  const { data } = await supabase
    .from("routine_notifications")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("type", GUARDIAN_RUNNER_NOTIFICATION_TYPE)
    .contains("data", { baselineComplete: true })
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function insertFinding(
  supabase: SupabaseClient,
  agencyId: string,
  leadId: string,
  rule: GuardianRuleCode,
): Promise<boolean> {
  const { error } = await supabase.from(GUARDIAN_FINDINGS_TABLE).insert({
    agency_id: agencyId,
    lead_id: leadId,
    rule_code: rule,
  });
  if (!error) return true;
  if (error.code === "23505") return false;
  console.warn("[guardian] insert finding:", error.message);
  return false;
}

export async function runGuardianForAgency(
  supabase: SupabaseClient,
  agencyId: string,
  nowMs = Date.now(),
): Promise<GuardianRunStats> {
  const started = Date.now();
  const byRule = emptyByRule();
  let inserted = 0;
  let autoResolved = 0;

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select(
      "id, agency_id, status, phone, ai_priority, assigned_profile_id, assigned_agent, created_at, updated_at",
    )
    .eq("agency_id", agencyId)
    .limit(GUARDIAN_BATCH_LEAD_LIMIT);

  if (leadsError) {
    throw new Error(`guardian leads: ${leadsError.message}`);
  }

  const activeLeads = (leads ?? []).filter((row) =>
    isActiveLeadStatus(String(row.status ?? "")),
  ) as GuardianLeadRow[];

  const leadIds = activeLeads.map((l) => l.id);
  const lastEventByLead = await fetchLastEventByLead(supabase, agencyId, leadIds);

  const baselineMode = !(await agencyHadBaselineRun(supabase, agencyId));

  for (const lead of activeLeads) {
    const lastEvent = lastEventByLead.get(lead.id) ?? null;
    for (const rule of GUARDIAN_RULE_CODES) {
      if (evaluateRuleForLead(rule, lead, lastEvent, nowMs)) {
        const ok = await insertFinding(supabase, agencyId, lead.id, rule);
        if (ok) {
          inserted += 1;
          byRule[rule] += 1;
        }
      }
    }
  }

  const { data: openRows, error: openError } = await supabase
    .from(GUARDIAN_FINDINGS_TABLE)
    .select("id, lead_id, rule_code")
    .eq("agency_id", agencyId)
    .is("resolved_at", null);

  if (openError) {
    throw new Error(`guardian open findings: ${openError.message}`);
  }

  const leadById = new Map(activeLeads.map((l) => [l.id, l]));

  for (const finding of openRows ?? []) {
    const leadId = String(finding.lead_id);
    const rule = String(finding.rule_code) as GuardianRuleCode;
    const lead = leadById.get(leadId);
    if (!lead) {
      const { data: leadRow } = await supabase
        .from("leads")
        .select(
          "id, agency_id, status, phone, ai_priority, assigned_profile_id, assigned_agent, created_at, updated_at",
        )
        .eq("id", leadId)
        .maybeSingle();
      if (!leadRow || !isActiveLeadStatus(String(leadRow.status ?? ""))) {
        await supabase
          .from(GUARDIAN_FINDINGS_TABLE)
          .update({ resolved_at: new Date(nowMs).toISOString() })
          .eq("id", finding.id);
        autoResolved += 1;
        continue;
      }
      const lastEvent = lastEventByLead.get(leadId) ?? null;
      if (!evaluateRuleForLead(rule, leadRow as GuardianLeadRow, lastEvent, nowMs)) {
        await supabase
          .from(GUARDIAN_FINDINGS_TABLE)
          .update({ resolved_at: new Date(nowMs).toISOString() })
          .eq("id", finding.id);
        autoResolved += 1;
      }
      continue;
    }
    const lastEvent = lastEventByLead.get(leadId) ?? null;
    if (!evaluateRuleForLead(rule, lead, lastEvent, nowMs)) {
      await supabase
        .from(GUARDIAN_FINDINGS_TABLE)
        .update({ resolved_at: new Date(nowMs).toISOString() })
        .eq("id", finding.id);
      autoResolved += 1;
    }
  }

  const { count: openAfterRun } = await supabase
    .from(GUARDIAN_FINDINGS_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .is("resolved_at", null);

  const durationMs = Date.now() - started;
  const mode: "baseline" | "normal" = baselineMode ? "baseline" : "normal";

  await supabase.from("routine_notifications").insert({
    agency_id: agencyId,
    profile_id: null,
    type: GUARDIAN_RUNNER_NOTIFICATION_TYPE,
    priority: "low",
    title: "Guardian runner",
    body: `Guardian ${mode} run: ${inserted} new finding(s), ${autoResolved} auto-resolved.`,
    data: {
      durationMs,
      inserted,
      autoResolved,
      openAfterRun: openAfterRun ?? 0,
      byRule,
      mode,
      baselineComplete: baselineMode,
      ranAt: new Date(nowMs).toISOString(),
    },
  });

  if (baselineMode && inserted > GUARDIAN_BASELINE_FINDING_KILL) {
    await supabase.from("routine_notifications").insert({
      agency_id: SYSTEM_USAGE_AGENCY_ID,
      profile_id: null,
      type: "ceo_command",
      priority: "high",
      title: "Guardian baseline: review required",
      body: `Agency ${agencyId}: ${inserted} nálezov v prvom behu (>${GUARDIAN_BASELINE_FINDING_KILL}). Digest zostáva vypnutý — founder review.`,
      data: {
        heartbeatId: "guardian_baseline_review",
        agencyId,
        inserted,
        byRule,
      },
    });
  }

  return {
    agencyId,
    leadsScanned: activeLeads.length,
    inserted,
    autoResolved,
    openAfterRun: openAfterRun ?? 0,
    byRule,
    mode,
    durationMs,
  };
}

export async function recordGuardianPlatformHeartbeat(
  supabase: SupabaseClient,
  summary: { agencies: number; inserted: number; durationMs: number },
): Promise<void> {
  await supabase.from("routine_notifications").insert({
    agency_id: SYSTEM_USAGE_AGENCY_ID,
    profile_id: null,
    type: GUARDIAN_RUNNER_NOTIFICATION_TYPE,
    priority: "low",
    title: "Guardian platform run",
    body: `Guardian cron finished for ${summary.agencies} agencies.`,
    data: {
      platformRun: true,
      durationMs: summary.durationMs,
      inserted: summary.inserted,
      ranAt: new Date().toISOString(),
    },
  });
}
