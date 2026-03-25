import { supabaseClient } from "@/lib/supabase/client";
import { listProfiles } from "@/lib/team-store";
import { listLeads, type Lead } from "@/lib/leads-store";

export type AssignmentRule = {
  id: string;
  name: string;
  ruleType: "location" | "budget" | "propertyType" | "roundRobin" | "leastLoaded";
  profileIds: string[];
  active: boolean;
  criteria?: {
    locations?: string[];
    minBudget?: number;
    maxBudget?: number;
    propertyTypes?: string[];
  };
  createdAt: string;
};

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return supabaseClient;
}

const demoRules: AssignmentRule[] = [
  {
    id: "rule-1",
    name: "Bratislava - Lucia",
    ruleType: "location",
    profileIds: ["33333333-3333-3333-3333-333333333331"],
    active: true,
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

// Store/Database operations
export async function listAssignmentRules(): Promise<AssignmentRule[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return getDemoRulesStore();

  const { data, error } = await supabase
    .from("lead_assignment_rules")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (!isMissingAssignmentRulesTableError(error?.message)) {
      console.error("listAssignmentRules error:", error?.message);
    }

    return getDemoRulesStore();
  }

  return (data as any[]).map((row) => ({
    id: row.id,
    name: row.name,
    ruleType: row.rule_type,
    profileIds: row.profile_ids || [],
    active: row.is_active,
    criteria: row.criteria,
    createdAt: row.created_at,
  }));
}

export async function createAssignmentRule(input: {
  name: string;
  ruleType: AssignmentRule["ruleType"];
  profileIds: string[];
  criteria?: AssignmentRule["criteria"];
}): Promise<AssignmentRule> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const createdRule = {
      id: crypto.randomUUID(),
      name: input.name,
      ruleType: input.ruleType,
      profileIds: input.profileIds,
      active: true,
      criteria: input.criteria,
      createdAt: new Date().toISOString(),
    };

    getDemoRulesStore().unshift(createdRule);
    return createdRule;
  }

  const { data, error } = await supabase
    .from("lead_assignment_rules")
    .insert({
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
      const createdRule = {
        id: crypto.randomUUID(),
        name: input.name,
        ruleType: input.ruleType,
        profileIds: input.profileIds,
        active: true,
        criteria: input.criteria,
        createdAt: new Date().toISOString(),
      };

      getDemoRulesStore().unshift(createdRule);
      return createdRule;
    }

    throw new Error(error.message);
  }

  return {
    id: data.id,
    name: data.name,
    ruleType: data.rule_type,
    profileIds: data.profile_ids || [],
    active: data.is_active,
    criteria: data.criteria,
    createdAt: data.created_at,
  };
}

export async function updateAssignmentRule(
  id: string,
  input: Partial<{
    name: string;
    profileIds: string[];
    criteria: AssignmentRule["criteria"];
    active: boolean;
  }>
): Promise<AssignmentRule> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const store = getDemoRulesStore();
    const index = store.findIndex((rule) => rule.id === id);

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

  const patch: any = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.profileIds !== undefined) patch.profile_ids = input.profileIds;
  if (input.criteria !== undefined) patch.criteria = input.criteria;
  if (input.active !== undefined) patch.is_active = input.active;

  const { data, error } = await supabase
    .from("lead_assignment_rules")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (isMissingAssignmentRulesTableError(error.message)) {
      const store = getDemoRulesStore();
      const index = store.findIndex((rule) => rule.id === id);

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

  return {
    id: data.id,
    name: data.name,
    ruleType: data.rule_type,
    profileIds: data.profile_ids || [],
    active: data.is_active,
    criteria: data.criteria,
    createdAt: data.created_at,
  };
}

export async function deleteAssignmentRule(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const store = getDemoRulesStore();
    const index = store.findIndex((rule) => rule.id === id);

    if (index !== -1) {
      store.splice(index, 1);
    }

    return;
  }

  const { error } = await supabase.from("lead_assignment_rules").delete().eq("id", id);

  if (error) {
    if (isMissingAssignmentRulesTableError(error.message)) {
      const store = getDemoRulesStore();
      const index = store.findIndex((rule) => rule.id === id);

      if (index !== -1) {
        store.splice(index, 1);
      }

      return;
    }

    throw new Error(error.message);
  }
}

// Auto-assign logic
export async function autoAssignLeads(): Promise<{ leadId: string; assignedTo: string }[]> {
  const [leads, profiles, rules] = await Promise.all([
    listLeads(),
    listProfiles(),
    listAssignmentRules(),
  ]);

  const profileMap = new Map(profiles.map((p) => [p.id, p.fullName]));
  const unassignedLeads = leads.filter((l) => !l.assignedProfileId || l.assignedAgent === "Nepriradený");

  const assignments: { leadId: string; assignedTo: string }[] = [];

  for (const lead of unassignedLeads) {
    const rule = await findMatchingRule(lead, rules);
    if (!rule) continue;

    const profileId = await getAssignedProfileFromRule(rule);
    if (!profileId) continue;

    const profileName = profileMap.get(profileId) || "Priradený agent";

    assignments.push({
      leadId: lead.id,
      assignedTo: profileId,
    });
  }

  return assignments;
}
