import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveTenantSupabase } from "@/lib/supabase/resolve-client";

type Lead = {
  id: string;
  location: string;
  budget: string;
  propertyType: string;
  assignedProfileId?: string | null;
  assignedAgent?: string | null;
};

export type AssignmentRule = {
  id: string;
  name: string;
  ruleType: "location" | "budget" | "propertyType" | "roundRobin" | "leastLoaded";
  profileIds: string[];
  active: boolean;
  agencyId?: string | null;
  criteria?: {
    locations?: string[];
    minBudget?: number;
    maxBudget?: number;
    propertyTypes?: string[];
  };
  createdAt: string;
};

const demoRules: AssignmentRule[] = [
  {
    id: "rule-1",
    name: "Bratislava - Lucia",
    ruleType: "location",
    profileIds: ["33333333-3333-3333-3333-333333333331"],
    active: true,
    agencyId: "11111111-1111-1111-1111-111111111111",
    criteria: {
      locations: ["Bratislava"],
    },
    createdAt: new Date().toISOString(),
  },
];

const globalRulesStore = globalThis as typeof globalThis & {
  __realitkaDemoAssignmentRules?: AssignmentRule[];
};

function getDemoRulesStore() {
  if (!globalRulesStore.__realitkaDemoAssignmentRules) {
    globalRulesStore.__realitkaDemoAssignmentRules = [...demoRules];
  }

  return globalRulesStore.__realitkaDemoAssignmentRules;
}

function isMissingAssignmentRulesTableError(message: string | undefined) {
  const normalized = String(message ?? "").toLowerCase();
  return (
    normalized.includes("lead_assignment_rules") &&
    (normalized.includes("schema cache") || normalized.includes("does not exist"))
  );
}

function mapRule(row: {
  id: string;
  name: string;
  rule_type: AssignmentRule["ruleType"];
  profile_ids?: string[] | null;
  is_active: boolean;
  agency_id?: string | null;
  criteria?: AssignmentRule["criteria"];
  created_at: string;
}): AssignmentRule {
  return {
    id: row.id,
    name: row.name,
    ruleType: row.rule_type,
    profileIds: row.profile_ids || [],
    active: row.is_active,
    agencyId: row.agency_id ?? null,
    criteria: row.criteria,
    createdAt: row.created_at,
  };
}

// Assignment matching logic
export async function findMatchingRule(lead: Lead, rules: AssignmentRule[]): Promise<AssignmentRule | null> {
  const activeRules = rules.filter((r) => r.active);

  for (const rule of activeRules) {
    if (rule.ruleType === "location" && rule.criteria?.locations) {
      if (rule.criteria.locations.some((loc) => lead.location.toLowerCase().includes(loc.toLowerCase()))) {
        return rule;
      }
    }

    if (rule.ruleType === "budget" && rule.criteria) {
      const leadBudgetNum = parseFloat(lead.budget.replace(/\D/g, "")) || 0;
      const minOk = !rule.criteria.minBudget || leadBudgetNum >= rule.criteria.minBudget;
      const maxOk = !rule.criteria.maxBudget || leadBudgetNum <= rule.criteria.maxBudget;
      if (minOk && maxOk) {
        return rule;
      }
    }

    if (rule.ruleType === "propertyType" && rule.criteria?.propertyTypes) {
      if (rule.criteria.propertyTypes.includes(lead.propertyType)) {
        return rule;
      }
    }

    if (rule.ruleType === "roundRobin") {
      return rule;
    }

    if (rule.ruleType === "leastLoaded") {
      return rule;
    }
  }

  return null;
}

// Get profile with least leads (for leastLoaded strategy)
export async function getLeastLoadedProfile(profileIds: string[]): Promise<string | null> {
  if (profileIds.length === 0) return null;

  const { listLeads } = await import("@/lib/leads-store");
  const leads = await listLeads();
  const leadCountByProfile = new Map<string, number>();

  profileIds.forEach((id) => {
    leadCountByProfile.set(id, leads.filter((l) => l.assignedProfileId === id).length);
  });

  let minCount = Infinity;
  let bestProfileId = profileIds[0];

  leadCountByProfile.forEach((count, profileId) => {
    if (count < minCount) {
      minCount = count;
      bestProfileId = profileId;
    }
  });

  return bestProfileId;
}

// Rotate through profiles (for roundRobin strategy)
let roundRobinIndex = 0;
export function getRoundRobinProfile(profileIds: string[]): string | null {
  if (profileIds.length === 0) return null;
  const profile = profileIds[roundRobinIndex % profileIds.length];
  roundRobinIndex++;
  return profile;
}

// Get assigned profile from rule
export async function getAssignedProfileFromRule(rule: AssignmentRule): Promise<string | null> {
  if (rule.profileIds.length === 0) return null;

  if (rule.ruleType === "roundRobin") {
    return getRoundRobinProfile(rule.profileIds);
  }

  if (rule.ruleType === "leastLoaded") {
    return getLeastLoadedProfile(rule.profileIds);
  }

  // Default: pick first profile
  return rule.profileIds[0];
}

function requireAgencyId(agencyId: string | null | undefined): string {
  const id = String(agencyId ?? "").trim();
  if (!id) throw new Error("agency_id je povinné.");
  return id;
}

// Store/Database operations — always scoped to caller agency + cookie-bearing client.
export async function listAssignmentRules(
  agencyId: string,
  scoped?: SupabaseClient | null,
): Promise<AssignmentRule[]> {
  const tenantAgencyId = requireAgencyId(agencyId);
  const supabase = await resolveTenantSupabase(scoped);
  if (!supabase) {
    return getDemoRulesStore().filter((r) => r.agencyId === tenantAgencyId);
  }

  const { data, error } = await supabase
    .from("lead_assignment_rules")
    .select("*")
    .eq("agency_id", tenantAgencyId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (!isMissingAssignmentRulesTableError(error?.message)) {
      console.error("listAssignmentRules error:", error?.message);
    }

    return getDemoRulesStore().filter((r) => r.agencyId === tenantAgencyId);
  }

  return (data as Parameters<typeof mapRule>[0][]).map(mapRule);
}

export async function createAssignmentRule(
  input: {
    agencyId: string;
    name: string;
    ruleType: AssignmentRule["ruleType"];
    profileIds: string[];
    criteria?: AssignmentRule["criteria"];
  },
  scoped?: SupabaseClient | null,
): Promise<AssignmentRule> {
  const tenantAgencyId = requireAgencyId(input.agencyId);
  const supabase = await resolveTenantSupabase(scoped);

  if (!supabase) {
    const createdRule: AssignmentRule = {
      id: crypto.randomUUID(),
      name: input.name,
      ruleType: input.ruleType,
      profileIds: input.profileIds,
      active: true,
      agencyId: tenantAgencyId,
      criteria: input.criteria,
      createdAt: new Date().toISOString(),
    };

    getDemoRulesStore().unshift(createdRule);
    return createdRule;
  }

  const { data, error } = await supabase
    .from("lead_assignment_rules")
    .insert({
      agency_id: tenantAgencyId,
      name: input.name,
      rule_type: input.ruleType,
      profile_ids: input.profileIds,
      criteria: input.criteria,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingAssignmentRulesTableError(error.message)) {
      const createdRule: AssignmentRule = {
        id: crypto.randomUUID(),
        name: input.name,
        ruleType: input.ruleType,
        profileIds: input.profileIds,
        active: true,
        agencyId: tenantAgencyId,
        criteria: input.criteria,
        createdAt: new Date().toISOString(),
      };

      getDemoRulesStore().unshift(createdRule);
      return createdRule;
    }

    throw new Error(error.message);
  }

  return mapRule(data as Parameters<typeof mapRule>[0]);
}

export async function updateAssignmentRule(
  id: string,
  agencyId: string,
  input: Partial<{
    name: string;
    profileIds: string[];
    criteria: AssignmentRule["criteria"];
    active: boolean;
  }>,
  scoped?: SupabaseClient | null,
): Promise<AssignmentRule> {
  const tenantAgencyId = requireAgencyId(agencyId);
  const supabase = await resolveTenantSupabase(scoped);

  if (!supabase) {
    const store = getDemoRulesStore();
    const index = store.findIndex((rule) => rule.id === id && rule.agencyId === tenantAgencyId);

    if (index === -1) {
      throw new Error("Pravidlo sa nenašlo.");
    }

    const updatedRule: AssignmentRule = {
      ...store[index],
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.profileIds !== undefined ? { profileIds: input.profileIds } : {}),
      ...(input.criteria !== undefined ? { criteria: input.criteria } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    };

    store[index] = updatedRule;
    return updatedRule;
  }

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.profileIds !== undefined) patch.profile_ids = input.profileIds;
  if (input.criteria !== undefined) patch.criteria = input.criteria;
  if (input.active !== undefined) patch.is_active = input.active;

  const { data, error } = await supabase
    .from("lead_assignment_rules")
    .update(patch)
    .eq("id", id)
    .eq("agency_id", tenantAgencyId)
    .select("*")
    .maybeSingle();

  if (error) {
    if (isMissingAssignmentRulesTableError(error.message)) {
      const store = getDemoRulesStore();
      const index = store.findIndex((rule) => rule.id === id && rule.agencyId === tenantAgencyId);

      if (index === -1) {
        throw new Error("Pravidlo sa nenašlo.");
      }

      const updatedRule: AssignmentRule = {
        ...store[index],
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.profileIds !== undefined ? { profileIds: input.profileIds } : {}),
        ...(input.criteria !== undefined ? { criteria: input.criteria } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      };

      store[index] = updatedRule;
      return updatedRule;
    }

    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Pravidlo sa nenašlo.");
  }

  return mapRule(data as Parameters<typeof mapRule>[0]);
}

export async function deleteAssignmentRule(
  id: string,
  agencyId: string,
  scoped?: SupabaseClient | null,
): Promise<void> {
  const tenantAgencyId = requireAgencyId(agencyId);
  const supabase = await resolveTenantSupabase(scoped);

  if (!supabase) {
    const store = getDemoRulesStore();
    const index = store.findIndex((rule) => rule.id === id && rule.agencyId === tenantAgencyId);

    if (index !== -1) {
      store.splice(index, 1);
    }

    return;
  }

  const { data, error } = await supabase
    .from("lead_assignment_rules")
    .delete()
    .eq("id", id)
    .eq("agency_id", tenantAgencyId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isMissingAssignmentRulesTableError(error.message)) {
      const store = getDemoRulesStore();
      const index = store.findIndex((rule) => rule.id === id && rule.agencyId === tenantAgencyId);

      if (index !== -1) {
        store.splice(index, 1);
      }

      return;
    }

    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Pravidlo sa nenašlo.");
  }
}

// Auto-assign logic
export async function autoAssignLeads(
  agencyId: string,
  scoped?: SupabaseClient | null,
): Promise<{ leadId: string; assignedTo: string }[]> {
  const tenantAgencyId = requireAgencyId(agencyId);
  const [{ listLeads }, { listProfiles }] = await Promise.all([
    import("@/lib/leads-store"),
    import("@/lib/team-store"),
  ]);

  const [leads, profiles, rules] = await Promise.all([
    listLeads(undefined, scoped),
    listProfiles(scoped),
    listAssignmentRules(tenantAgencyId, scoped),
  ]);

  const unassignedLeads = leads.filter((l) => !l.assignedProfileId || l.assignedAgent === "Nepriradený");

  const assignments: { leadId: string; assignedTo: string }[] = [];

  for (const lead of unassignedLeads) {
    const rule = await findMatchingRule(lead, rules);
    if (!rule) continue;

    const profileId = await getAssignedProfileFromRule(rule);
    if (!profileId) continue;
    if (!profiles.some((p) => p.id === profileId)) continue;

    assignments.push({
      leadId: lead.id,
      assignedTo: profileId,
    });
  }

  return assignments;
}
