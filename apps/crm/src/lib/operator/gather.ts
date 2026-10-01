import type { SupabaseClient } from "@supabase/supabase-js";
import { GUARDIAN_RUNNER_NOTIFICATION_TYPE } from "@/lib/guardian/config";
import { isGuardianDigestEnabled, isGuardianRunnerEnabled } from "@/lib/guardian/config";
import { collectHeartbeatMetrics } from "@/lib/infra/platform-heartbeat";
import { assertOperatorAggregateNoPii } from "@/lib/operator/aggregate-schema";
import { isOperatorExcludedAgency } from "@/lib/operator/config";
import { computeOperatorHealthScore } from "@/lib/operator/health-score";
import type {
  OperatorAgencyRow,
  OperatorAgencyStatus,
  OperatorAttentionItem,
  OperatorDashboardPayload,
  OperatorPlatformHealth,
} from "@/lib/operator/types";
import { SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";

type AgencyRow = {
  id: string;
  name: string;
  slug: string | null;
  is_active: boolean | null;
};

type ValuationTenantRow = {
  agency_id: string;
  enabled: boolean | null;
  is_sandbox: boolean | null;
};

type GuardianFindingRow = {
  agency_id: string;
  rule_code: string;
  detected_at: string;
};

const ATTENTION_RULES = new Set(["HOT_IGNORED", "NO_OWNER"]);

function isoDaysAgo(days: number, now = Date.now()): string {
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

function resolveAgencyStatus(
  agency: AgencyRow,
  valuation: ValuationTenantRow | undefined,
  excluded: boolean,
): OperatorAgencyStatus {
  if (excluded || valuation?.is_sandbox) return "system";
  if (!valuation?.enabled) return "onboarding";
  if (agency.is_active === false) return "onboarding";
  return "live";
}

function buildTrend14d(dailyCounts: Map<string, number>): number[] {
  const out: number[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push(dailyCounts.get(key) ?? 0);
  }
  return out;
}

function mapSignalType(ruleCode: string): OperatorAttentionItem["signalType"] | null {
  if (ruleCode === "HOT_IGNORED") return "guardian_hot_ignored";
  if (ruleCode === "NO_OWNER") return "guardian_no_owner";
  return null;
}

function signalLabel(type: OperatorAttentionItem["signalType"]): string {
  switch (type) {
    case "guardian_hot_ignored":
      return "Horúci lead bez reakcie";
    case "guardian_no_owner":
      return "Lead bez vlastníka";
    case "onboarding_incomplete":
      return "Onboarding — kalkulačka";
    case "widget_disabled":
      return "Widget vypnutý";
    default:
      return "Signál";
  }
}

export async function gatherOperatorDashboard(
  admin: SupabaseClient,
): Promise<OperatorDashboardPayload> {
  const asOf = new Date().toISOString();
  const cutoff7d = isoDaysAgo(7);
  const cutoff14d = isoDaysAgo(14);
  const cutoff30d = isoDaysAgo(30);

  const [
    agenciesRes,
    valuationRes,
    guardianRes,
    dealsRes,
    leadsTrendRes,
    leadEventsProbeRes,
    guardianLastRunRes,
    heartbeatMetrics,
  ] = await Promise.all([
    admin.from("agencies").select("id, name, slug, is_active"),
    admin.from("valuation_tenants").select("agency_id, enabled, is_sandbox"),
    admin
      .from("guardian_findings")
      .select("agency_id, rule_code, detected_at")
      .is("resolved_at", null)
      .in("rule_code", ["HOT_IGNORED", "NO_OWNER"]),
    admin.from("deal_outcomes").select("agency_id, outcome, closed_at").gte("closed_at", cutoff30d),
    admin
      .from("leads")
      .select("agency_id, last_contact_at")
      .gte("last_contact_at", cutoff14d)
      .neq("status", "Archivovaný"),
    admin.from("lead_events").select("agency_id").limit(1),
    admin
      .from("routine_notifications")
      .select("created_at")
      .eq("type", GUARDIAN_RUNNER_NOTIFICATION_TYPE)
      .eq("agency_id", SYSTEM_USAGE_AGENCY_ID)
      .order("created_at", { ascending: false })
      .limit(1),
    collectHeartbeatMetrics(admin, null),
  ]);

  const agencies = (agenciesRes.data ?? []) as AgencyRow[];
  const valuations = new Map<string, ValuationTenantRow>();
  for (const row of (valuationRes.data ?? []) as ValuationTenantRow[]) {
    valuations.set(row.agency_id, row);
  }

  const sandboxAgencyIds = new Set(
    [...valuations.values()].filter((v) => v.is_sandbox).map((v) => v.agency_id),
  );

  const guardianByAgency = new Map<string, GuardianFindingRow[]>();
  for (const row of (guardianRes.data ?? []) as GuardianFindingRow[]) {
    if (!ATTENTION_RULES.has(row.rule_code)) continue;
    const list = guardianByAgency.get(row.agency_id) ?? [];
    list.push(row);
    guardianByAgency.set(row.agency_id, list);
  }

  const dealsWon = new Map<string, number>();
  const dealsLost = new Map<string, number>();
  for (const row of dealsRes.data ?? []) {
    const id = String(row.agency_id);
    if (row.outcome === "won") dealsWon.set(id, (dealsWon.get(id) ?? 0) + 1);
    if (row.outcome === "lost") dealsLost.set(id, (dealsLost.get(id) ?? 0) + 1);
  }

  const trendByAgency = new Map<string, Map<string, number>>();
  for (const row of leadsTrendRes.data ?? []) {
    if (!row.last_contact_at || !row.agency_id) continue;
    const day = String(row.last_contact_at).slice(0, 10);
    const agencyId = String(row.agency_id);
    const map = trendByAgency.get(agencyId) ?? new Map<string, number>();
    map.set(day, (map.get(day) ?? 0) + 1);
    trendByAgency.set(agencyId, map);
  }

  const hasGlobalLeadEvents = (leadEventsProbeRes.data?.length ?? 0) > 0;

  const perAgencyContacts7d = new Map<string, number>();
  const perAgencyContactsTotal = new Map<string, number>();

  const agencyIds = agencies.map((a) => a.id);
  if (agencyIds.length > 0) {
    const [contacts7dRows, contactsTotalRows] = await Promise.all([
      Promise.all(
        agencyIds.map(async (agencyId) => {
          const { count } = await admin
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("agency_id", agencyId)
            .gte("last_contact_at", cutoff7d)
            .neq("status", "Archivovaný");
          return [agencyId, count ?? 0] as const;
        }),
      ),
      Promise.all(
        agencyIds.map(async (agencyId) => {
          const { count } = await admin
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("agency_id", agencyId)
            .neq("status", "Archivovaný");
          return [agencyId, count ?? 0] as const;
        }),
      ),
    ]);
    for (const [id, count] of contacts7dRows) perAgencyContacts7d.set(id, count);
    for (const [id, count] of contactsTotalRows) perAgencyContactsTotal.set(id, count);
  }

  const reaction24hByAgency = new Map<string, number | null>();
  if (hasGlobalLeadEvents && agencyIds.length > 0) {
    const reactionRows = await Promise.all(
      agencyIds.map(async (agencyId) => {
        const { count: eventCount } = await admin
          .from("lead_events")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", agencyId);
        if ((eventCount ?? 0) === 0) {
          return [agencyId, null] as const;
        }
        const { count: recentLeads } = await admin
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", agencyId)
          .gte("created_at", cutoff30d)
          .neq("status", "Archivovaný");
        const eligible = recentLeads ?? 0;
        if (eligible === 0) return [agencyId, null] as const;
        const { count: reacted } = await admin
          .from("lead_events")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", agencyId)
          .gte("created_at", cutoff30d);
        const pct = reacted != null && eligible > 0 ? Math.min(1, reacted / eligible) : null;
        return [agencyId, pct] as const;
      }),
    );
    for (const [id, pct] of reactionRows) reaction24hByAgency.set(id, pct);
  } else {
    for (const id of agencyIds) reaction24hByAgency.set(id, null);
  }

  const agencyRows: OperatorAgencyRow[] = [];
  const attention: OperatorAttentionItem[] = [];

  for (const agency of agencies) {
    const valuation = valuations.get(agency.id);
    const excluded =
      isOperatorExcludedAgency(agency.id) || sandboxAgencyIds.has(agency.id);
    const status = resolveAgencyStatus(agency, valuation, excluded);
    const openFindings = guardianByAgency.get(agency.id)?.length ?? 0;
    const reaction24hPct = reaction24hByAgency.get(agency.id) ?? null;
    const reaction24hStatus = reaction24hPct === null ? "unavailable" : "available";
    const onboardingIncomplete = status === "onboarding" && !excluded;

    const row: OperatorAgencyRow = {
      agencyId: agency.id,
      agencyName: agency.name,
      status,
      excludedFromScoring: excluded,
      contacts7d: perAgencyContacts7d.get(agency.id) ?? 0,
      contactsTotal: perAgencyContactsTotal.get(agency.id) ?? 0,
      trend14d: buildTrend14d(trendByAgency.get(agency.id) ?? new Map()),
      reaction24hPct,
      reaction24hStatus,
      noReactionCount: openFindings,
      dealsWon: dealsWon.get(agency.id) ?? 0,
      dealsLost: dealsLost.get(agency.id) ?? 0,
      openGuardianFindings: openFindings,
      healthScore: excluded
        ? null
        : computeOperatorHealthScore({
            openGuardianFindings: openFindings,
            onboardingIncomplete,
            reaction24hPct,
            wonLast30d: dealsWon.get(agency.id) ?? 0,
          }),
    };

    assertOperatorAggregateNoPii(row as unknown as Record<string, unknown>);
    agencyRows.push(row);

    if (excluded) continue;

    for (const finding of guardianByAgency.get(agency.id) ?? []) {
      const signalType = mapSignalType(finding.rule_code);
      if (!signalType) continue;
      attention.push({
        agencyId: agency.id,
        agencyName: agency.name,
        signalType,
        label: signalLabel(signalType),
        detail: `Otvorený nález strážcu (${finding.rule_code})`,
        detectedAt: finding.detected_at,
        priority: signalType === "guardian_hot_ignored" ? 1 : 2,
      });
    }

    if (onboardingIncomplete) {
      attention.push({
        agencyId: agency.id,
        agencyName: agency.name,
        signalType: "onboarding_incomplete",
        label: signalLabel("onboarding_incomplete"),
        detail: "Valuation widget nie je zapnutý — onboarding nedokončený",
        detectedAt: asOf,
        priority: 2,
      });
    } else if (valuation && valuation.enabled === false) {
      attention.push({
        agencyId: agency.id,
        agencyName: agency.name,
        signalType: "widget_disabled",
        label: signalLabel("widget_disabled"),
        detail: "Widget kalkulačky je vypnutý",
        detectedAt: asOf,
        priority: 3,
      });
    }
  }

  attention.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return Date.parse(b.detectedAt) - Date.parse(a.detectedAt);
  });

  const valuationList = [...valuations.values()].filter((v) => !v.is_sandbox);
  const platformHealth: OperatorPlatformHealth = {
    valuationWidgetsEnabled: valuationList.filter((v) => v.enabled).length,
    valuationWidgetsTotal: valuationList.length,
    guardianLastRunAt: guardianLastRunRes.data?.[0]?.created_at ?? null,
    heartbeatCheckedAt: heartbeatMetrics.guardianLastRunAt,
    guardianDigestEnabled: isGuardianDigestEnabled(),
    guardianRunnerEnabled: isGuardianRunnerEnabled(),
  };

  return {
    asOf,
    attention,
    agencies: agencyRows.sort((a, b) => (b.healthScore ?? -1) - (a.healthScore ?? -1)),
    platformHealth,
  };
}
