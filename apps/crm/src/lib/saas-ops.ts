import { getCurrentBillingStatus } from "@/lib/billing-store";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { listProfiles, listTeams } from "@/lib/team-store";
import { listLeads } from "@/lib/leads-store";
import { listProperties } from "@/lib/properties-store";

export type PlanKey = "starter" | "pro" | "scale" | "free";

export type FeatureFlags = {
  aiScoring: boolean;
  aiRecommendations: boolean;
  matching: boolean;
  forecasting: boolean;
  communicationHub: boolean;
  outreach: boolean;
  integrations: boolean;
  teamManagement: boolean;
  advancedReporting: boolean;
  billing: boolean;
};

export type PlanLimits = {
  maxAgents: number;
  maxLeads: number;
  maxProperties: number;
  maxTeams: number;
  monthlyInboxSyncMessages: number;
  monthlyPortalImports: number;
  activeAutomationFlows: number;
};

export type UsageCounters = {
  agents: number;
  leads: number;
  properties: number;
  teams: number;
};

export type TrialGraceState = {
  state: "trial" | "active" | "grace" | "limited" | "blocked";
  trialDaysLeft: number;
  graceDaysLeft: number;
  message: string;
};

type BillingStatus = Awaited<ReturnType<typeof getCurrentBillingStatus>>;

function getTrialDays() {
  return Number(process.env.APP_TRIAL_DAYS || "14");
}

function getGraceDays() {
  return Number(process.env.APP_GRACE_DAYS || "7");
}

function getPlanFromPriceId(priceId: string | null | undefined): PlanKey {
  if (!priceId) return "free";

  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_SCALE) return "scale";

  return "free";
}

export function getFeatureFlagsForPlan(plan: PlanKey): FeatureFlags {
  // DEV OVERRIDE: Always enable all features for development/testing
  return {
    aiScoring: true,
    aiRecommendations: true,
    matching: true,
    forecasting: true,
    communicationHub: true,
    outreach: true,
    integrations: true,
    teamManagement: true,
    advancedReporting: true,
    billing: true,
  };
}

export function getLimitsForPlan(plan: PlanKey): PlanLimits {
  switch (plan) {
    case "starter":
      return {
        maxAgents: 5,
        maxLeads: 500,
        maxProperties: 100,
        maxTeams: 2,
        monthlyInboxSyncMessages: 250,
        monthlyPortalImports: 250,
        activeAutomationFlows: 5,
      };

    case "pro":
      return {
        maxAgents: 20,
        maxLeads: 5000,
        maxProperties: 1000,
        maxTeams: 10,
        monthlyInboxSyncMessages: 5000,
        monthlyPortalImports: 5000,
        activeAutomationFlows: 25,
      };

    case "scale":
      return {
        maxAgents: 999,
        maxLeads: 999999,
        maxProperties: 999999,
        maxTeams: 999,
        monthlyInboxSyncMessages: 999999,
        monthlyPortalImports: 999999,
        activeAutomationFlows: 999,
      };

    default:
      return {
        maxAgents: 2,
        maxLeads: 100,
        maxProperties: 25,
        maxTeams: 1,
        monthlyInboxSyncMessages: 25,
        monthlyPortalImports: 25,
        activeAutomationFlows: 1,
      };
  }
}

export function getUsageHealth(usage: UsageCounters, limits: PlanLimits) {
  const safePercent = (value: number, limit: number) => {
    if (!limit || limit <= 0) return 0;
    return Math.min(100, Math.round((value / limit) * 100));
  };

  return {
    agentsPercent: safePercent(usage.agents, limits.maxAgents),
    leadsPercent: safePercent(usage.leads, limits.maxLeads),
    propertiesPercent: safePercent(usage.properties, limits.maxProperties),
    teamsPercent: safePercent(usage.teams, limits.maxTeams),
  };
}

function diffInDays(futureMs: number, nowMs: number) {
  return Math.max(0, Math.ceil((futureMs - nowMs) / 86400000));
}

function getFallbackBillingStatus(): BillingStatus {
  return {
    hasCustomer: false,
    hasSubscription: false,
    customer: null,
    subscription: null,
    invoices: [],
  };
}

async function getSafeBillingStatus(): Promise<BillingStatus> {
  try {
    return await getCurrentBillingStatus();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown billing error";

    if (message.includes("STRIPE_SECRET_KEY")) {
      return getFallbackBillingStatus();
    }

    console.error("Billing snapshot fallback:", message);
    return getFallbackBillingStatus();
  }
}

export async function getTrialGraceState(input: {
  billing: Awaited<ReturnType<typeof getCurrentBillingStatus>>;
}): Promise<TrialGraceState> {
  const billing = input.billing;
  const user = await getCurrentUser();

  const now = Date.now();
  const trialDays = getTrialDays();
  const graceDays = getGraceDays();

  const createdAt = user?.created_at ? new Date(user.created_at).getTime() : now;
  const trialEnd = createdAt + trialDays * 86400000;
  const trialDaysLeft = diffInDays(trialEnd, now);

  if (!billing.hasSubscription) {
    if (trialDaysLeft > 0) {
      return {
        state: "trial",
        trialDaysLeft,
        graceDaysLeft: 0,
        message: `Beží trial obdobie. Zostáva ${trialDaysLeft} dní.`,
      };
    }

    return {
      state: "limited",
      trialDaysLeft: 0,
      graceDaysLeft: 0,
      message: "Trial skončil. Aktivuj platený plán, aby si odomkol všetky funkcie.",
    };
  }

  const status = String(billing.subscription?.status || "");

  if (status === "active" || status === "trialing") {
    return {
      state: "active",
      trialDaysLeft: status === "trialing" ? trialDaysLeft : 0,
      graceDaysLeft: 0,
      message:
        status === "trialing"
          ? "Predplatné je v trial režime cez Stripe."
          : "Predplatné je aktívne.",
    };
  }

  if (status === "past_due" || status === "unpaid") {
    const periodEnd = billing.subscription?.currentPeriodEnd
      ? billing.subscription.currentPeriodEnd * 1000
      : now;

    const graceEnd = periodEnd + graceDays * 86400000;
    const graceDaysLeft = diffInDays(graceEnd, now);

    if (graceDaysLeft > 0) {
      return {
        state: "grace",
        trialDaysLeft: 0,
        graceDaysLeft,
        message: `Platba vyžaduje pozornosť. Ochranná lehota zostáva ${graceDaysLeft} dní.`,
      };
    }

    return {
      state: "blocked",
      trialDaysLeft: 0,
      graceDaysLeft: 0,
      message: "Ochranná lehota skončila. Obnov platbu, aby sa služby znovu aktivovali.",
    };
  }

  if (status === "canceled" || status === "incomplete_expired") {
    return {
      state: "limited",
      trialDaysLeft: 0,
      graceDaysLeft: 0,
      message: "Predplatné nie je aktívne. Funkcie sú obmedzené.",
    };
  }

  return {
    state: "limited",
    trialDaysLeft: 0,
    graceDaysLeft: 0,
    message: "Predplatné je v obmedzenom režime.",
  };
}

export async function getSaasOpsSnapshot() {
  const [billing, profile, profiles, teams, leads, properties] = await Promise.all([
    getSafeBillingStatus(),
    getCurrentProfile(),
    listProfiles(),
    listTeams(),
    listLeads(),
    listProperties(),
  ]);

  const priceId = billing.subscription?.items?.[0]?.priceId || null;
  const plan = getPlanFromPriceId(priceId);
  const flags = getFeatureFlagsForPlan(plan);
  const limits = getLimitsForPlan(plan);

  const usage: UsageCounters = {
    agents: profiles.filter((item) => item.isActive).length,
    leads: leads.length,
    properties: properties.length,
    teams: teams.filter((item) => item.isActive).length,
  };

  const usageHealth = getUsageHealth(usage, limits);
  const trialGrace = await getTrialGraceState({ billing });

  // DEV OVERRIDE: Always allow full app access for development/testing
  const canUseFullApp = true;

  return {
    profile,
    billing,
    plan,
    flags,
    limits,
    usage,
    usageHealth,
    trialGrace,
    canUseFullApp,
  };
}
