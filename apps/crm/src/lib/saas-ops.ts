import { getCurrentBillingStatus } from "@/lib/billing-store";
import { planPriceIdOf, saasPlanKeyFromPriceId } from "@/lib/pricing-v2-plan";
import {
  fetchAgencyManualPlan,
  resolveBillingPlanFromManualPlan,
} from "@/lib/billing/resolve-agency-manual-plan";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listProfiles, listTeams } from "@/lib/team-store";
import { listLeads } from "@/lib/leads-store";
import { listProperties } from "@/lib/properties-store";

export type PlanKey =
  | "starter"
  | "pro"
  | "scale"
  | "free"
  | "market_vision"
  | "protocol_authority";

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
  /**
   * `unknown` nie je stav predplatného — je to priznanie, že sme sa naň nedokázali
   * spýtať (Stripe nedostupný, chýbajúci `STRIPE_SECRET_KEY`). Bez neho by sa
   * výpadok Stripe nedal odlíšiť od zrušeného predplatného; viď `accessLevelFrom`.
   */
  state: "trial" | "active" | "grace" | "limited" | "blocked" | "unknown";
  trialDaysLeft: number;
  graceDaysLeft: number;
  message: string;
};

/**
 * Plný (zápisový) prístup, alebo read-only.
 *
 * Founder rozhodnutie 2026-10-05, variant A: po vypršaní trialu alebo po zrušení
 * platby klient NESTRÁCA prístup k vlastným dátam — číta a exportuje ich ďalej,
 * ale nič nové nevytvorí a AI / outreach / integrácie sú zamknuté. Odrezať
 * maklérovi jeho vlastnú databázu leadov je dôvod odísť, nie zaplatiť.
 */
export type AppAccessLevel = "full" | "read_only";

/** Stavy, ktoré dávajú zápisový prístup. Čokoľvek iné je read-only. */
const WRITE_ACCESS_STATES: ReadonlySet<TrialGraceState["state"]> = new Set([
  "trial",
  "active",
  "grace",
  // `unknown` je tu ZÁMERNE, a je to jediné fail-open v tejto bráne.
  //
  // `getSafeBillingStatus()` prehltne každú chybu Stripe a vráti
  // `hasSubscription: false`, čo by `getTrialGraceState()` preložil na
  // `limited`. Bez tohto odlíšenia by výpadok Stripe — alebo chýbajúci
  // `STRIPE_SECRET_KEY` — prepnul do read-only KAŽDÉHO platiaceho klienta.
  //
  // Smer tu je opačný než pri súhlase agentúry s auto-odpoveďou (#811), a
  // zámerne: tam neznámy stav znamenal neposlať e-mail v mene klienta, tu by
  // neznámy stav znamenal vypnúť nástroj klientovi, ktorý zaplatil. Z dvoch
  // chýb je druhá horšia a naša vlastná. Nie je to ticho: snapshot nesie
  // `billingUnverified` a stav sa loguje.
  "unknown",
]);

export function accessLevelFrom(state: TrialGraceState["state"]): AppAccessLevel {
  return WRITE_ACCESS_STATES.has(state) ? "full" : "read_only";
}

type BillingStatus = Awaited<ReturnType<typeof getCurrentBillingStatus>>;

/**
 * Pravda o tom, či sa na Stripe vôbec podarilo spýtať. `getSafeBillingStatus()`
 * vracia pri chybe ten istý tvar ako „žiadne predplatné", takže bez tejto
 * značky sa tie dve veci nedajú rozlíšiť.
 */
type BillingLookup = { billing: BillingStatus; lookupFailed: boolean };

function getTrialDays() {
  return Number(process.env.APP_TRIAL_DAYS || "14");
}

function getGraceDays() {
  return Number(process.env.APP_GRACE_DAYS || "7");
}

/** Legacy ceny (starter/pro/scale) a cenník v2 (pásma); všetko ostatné je free. */
function getPlanFromPriceId(priceId: string | null | undefined): PlanKey {
  return saasPlanKeyFromPriceId(priceId);
}

function mapManualPlanToPlanKey(manualPlan: string | null | undefined): PlanKey | null {
  const billingPlan = resolveBillingPlanFromManualPlan(manualPlan);
  if (!billingPlan) return null;
  switch (billingPlan) {
    case "starter":
      return "starter";
    case "pro":
      return "pro";
    case "enterprise":
      return "scale";
    case "command":
      return "protocol_authority";
    default:
      return "free";
  }
}

function mapManualPlanKeyToPlanKey(manualPlan: string | null | undefined): PlanKey | null {
  const key = manualPlan?.trim().toLowerCase();
  if (!key) return null;
  if (key === "market_vision") return "market_vision";
  if (key === "protocol_authority") return "protocol_authority";
  return mapManualPlanToPlanKey(manualPlan);
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
    case "market_vision":
    case "protocol_authority":
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

/**
 * Koniec trialu: ak má agentúra `trial_ends_at` (samoobslužný signup), platí ten — je ukotvený
 * na agentúre, nie na dátume vzniku auth účtu (druhý člen tímu by inak dostal už vypršaný trial).
 * Inak historické odvodenie z `auth.users.created_at` + APP_TRIAL_DAYS (nezmenené správanie).
 */
export function resolveTrialEndMs(input: {
  agencyTrialEndsAt: string | null | undefined;
  userCreatedAt: string | null | undefined;
  trialDays: number;
  nowMs: number;
}): number {
  if (input.agencyTrialEndsAt) {
    const t = new Date(input.agencyTrialEndsAt).getTime();
    if (Number.isFinite(t)) return t;
  }
  const createdAt = input.userCreatedAt ? new Date(input.userCreatedAt).getTime() : input.nowMs;
  return createdAt + input.trialDays * 86400000;
}

async function loadAgencyTrialEndsAt(): Promise<string | null> {
  try {
    const profile = await getCurrentProfile();
    if (!profile?.agency_id) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agencies")
      .select("trial_ends_at")
      .eq("id", profile.agency_id)
      .maybeSingle();
    if (error) return null; // stĺpec ešte nie je nasadený → historické správanie
    return (data as { trial_ends_at?: string | null } | null)?.trial_ends_at ?? null;
  } catch {
    return null;
  }
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

async function getSafeBillingStatus(): Promise<BillingLookup> {
  try {
    return { billing: await getCurrentBillingStatus(), lookupFailed: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown billing error";

    // Oba prípady vracajú ten istý prázdny tvar, ale `lookupFailed: true` hovorí,
    // že je to naša nevedomosť, nie zistenie o klientovi.
    if (message.includes("STRIPE_SECRET_KEY")) {
      return { billing: getFallbackBillingStatus(), lookupFailed: true };
    }

    console.error("Billing snapshot fallback:", message);
    return { billing: getFallbackBillingStatus(), lookupFailed: true };
  }
}

export async function getTrialGraceState(input: {
  billing: Awaited<ReturnType<typeof getCurrentBillingStatus>>;
  /** True, keď sa na Stripe nepodarilo spýtať. Nie je to to isté ako „bez predplatného". */
  lookupFailed?: boolean;
}): Promise<TrialGraceState> {
  const billing = input.billing;

  if (input.lookupFailed) {
    return {
      state: "unknown",
      trialDaysLeft: 0,
      graceDaysLeft: 0,
      message: "Stav predplatného sa teraz nedá overiť. Prístup zostáva zachovaný.",
    };
  }

  const user = await getCurrentUser();

  const now = Date.now();
  const trialDays = getTrialDays();
  const graceDays = getGraceDays();

  const trialEnd = resolveTrialEndMs({
    agencyTrialEndsAt: await loadAgencyTrialEndsAt(),
    userCreatedAt: user?.created_at,
    trialDays,
    nowMs: now,
  });
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
  const [billingLookup, profile, profiles, teams, leads, properties] = await Promise.all([
    getSafeBillingStatus(),
    getCurrentProfile(),
    listProfiles(),
    listTeams(),
    listLeads(),
    listProperties(),
  ]);

  const billing = billingLookup.billing;
  // V2 predplatné nesie pásmo aj voliteľný balík; plán určuje pásmo.
  const priceId = planPriceIdOf(billing.subscription?.items) || null;
  let plan = getPlanFromPriceId(priceId);

  const user = await getCurrentUser();
  if (user?.id) {
    try {
      const supabase = await createClient();
      const manualPlan = await fetchAgencyManualPlan(supabase, user.id);
      const manualKey = mapManualPlanKeyToPlanKey(manualPlan);
      if (manualKey) plan = manualKey;
    } catch (error) {
      console.error("saas-ops manual_plan fallback:", error);
    }
  }
  const flags = getFeatureFlagsForPlan(plan);
  const limits = getLimitsForPlan(plan);

  const usage: UsageCounters = {
    agents: profiles.filter((item) => item.isActive).length,
    leads: leads.length,
    properties: properties.length,
    teams: teams.filter((item) => item.isActive).length,
  };

  const usageHealth = getUsageHealth(usage, limits);
  const trialGrace = await getTrialGraceState({
    billing,
    lookupFailed: billingLookup.lookupFailed,
  });

  // Tu bolo `const canUseFullApp = true;` s komentárom
  // „DEV OVERRIDE: Always allow full app access for development/testing".
  // Odišlo to do produkcie, takže `requireActiveAppAccess()` nemohol nikdy
  // vyhodiť výnimku: stav trialu sa počítal a nikto ho nepoužil. 8 API ciest
  // a 7 stránok tou bránou prechádza (viď docs/reports/2026-10-05-fail-open-sweep.md).
  // Dopad bol 0 €, lebo Stripe ešte nie je live — a práve preto to bol termín,
  // nie incident: v deň spustenia by ten jeden riadok zrušil paywall.
  const accessLevel = accessLevelFrom(trialGrace.state);
  const canUseFullApp = accessLevel === "full";

  if (billingLookup.lookupFailed) {
    // Fail-open musí byť vidieť. Bez tohto riadku by sa trvalý výpadok Stripe
    // javil ako normálny prevádzkový stav.
    console.warn(
      "[saas-ops] stav predplatného neoverený (Stripe nedostupný alebo bez kľúča) — prístup ponechaný plný",
    );
  }

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
    accessLevel,
    /** True = o stave predplatného nevieme; `canUseFullApp` je potom ústupok, nie zistenie. */
    billingUnverified: billingLookup.lookupFailed,
  };
}
