import type { SupabaseClient } from "@supabase/supabase-js";
import { getActivationFeatureFlags } from "@/lib/activation/flags";
import {
  extractWizardFromChecklist,
  resolvePostLoginPath,
  type WizardState,
} from "@/lib/onboarding-wizard";

export type WizardGateContext = {
  enabled: boolean;
  role: string | null;
  state: WizardState;
  redirectTo: string | null;
};

export async function loadWizardGateContext(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string | null | undefined,
  requestedPath = "/dashboard",
): Promise<WizardGateContext> {
  const flags = getActivationFeatureFlags();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, agency_id, full_name")
    .eq("auth_user_id", userId)
    .maybeSingle();

  const role = profile?.role ?? null;
  let state: WizardState = {
    wizardCompleted: false,
    wizardSkipped: false,
    wizardStep: 1,
  };

  if (profile?.agency_id && userEmail) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("name")
      .eq("id", profile.agency_id)
      .maybeSingle();

    const company = agency?.name?.trim();
    if (company) {
      const { data: progress } = await supabase
        .from("client_onboarding_progress")
        .select("checklist")
        .ilike("company", company)
        .ilike("contact_email", userEmail.trim().toLowerCase())
        .maybeSingle();

      if (progress?.checklist && typeof progress.checklist === "object") {
        state = extractWizardFromChecklist(progress.checklist as Record<string, unknown>);
      }
    }
  }

  const redirectTo = flags.onboardingWizardEnabled
    ? resolvePostLoginPath(flags.onboardingWizardEnabled, state, role, requestedPath)
    : null;

  const needsWizard =
    flags.onboardingWizardEnabled &&
    redirectTo !== null &&
    redirectTo.startsWith("/get-started") &&
    redirectTo !== requestedPath;

  return {
    enabled: flags.onboardingWizardEnabled,
    role,
    state,
    redirectTo: needsWizard ? redirectTo : null,
  };
}
