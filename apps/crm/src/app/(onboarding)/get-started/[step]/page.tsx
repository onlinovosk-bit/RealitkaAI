import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivationFeatureFlags } from "@/lib/activation/flags";
import { loadWizardGateContext } from "@/lib/activation/wizard-gate";
import { isWizardComplete } from "@/lib/onboarding-wizard";
import WizardClient from "../WizardClient";

type PageProps = {
  params: Promise<{ step: string }>;
};

export default async function GetStartedStepPage({ params }: PageProps) {
  const { step: stepRaw } = await params;
  const step = Number(stepRaw);
  if (!Number.isInteger(step) || step < 1 || step > 3) notFound();

  const flags = getActivationFeatureFlags();
  if (!flags.onboardingWizardEnabled) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/get-started/${step}`);

  const gate = await loadWizardGateContext(supabase, user.id, user.email, "/dashboard");
  if (isWizardComplete(gate.state)) {
    redirect("/dashboard");
  }

  return (
    <div className="px-4 py-10">
      <WizardClient step={step} />
    </div>
  );
}
