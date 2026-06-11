import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadWizardGateContext } from "@/lib/activation/wizard-gate";
import { getActivationFeatureFlags } from "@/lib/activation/flags";
import { isWizardComplete } from "@/lib/onboarding-wizard";

export default async function GetStartedIndexPage() {
  const flags = getActivationFeatureFlags();
  if (!flags.onboardingWizardEnabled) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/get-started");

  const gate = await loadWizardGateContext(supabase, user.id, user.email, "/dashboard");
  if (isWizardComplete(gate.state)) {
    redirect("/dashboard");
  }

  redirect(`/get-started/${gate.state.wizardStep}`);
}
