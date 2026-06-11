import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivationFeatureFlags } from "@/lib/activation/flags";

export default async function OnboardingGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const flags = getActivationFeatureFlags();
  if (!flags.onboardingWizardEnabled) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200 px-6 py-4">
        <p className="text-sm font-semibold text-cyan-700">Revolis · Úvodné nastavenie</p>
      </header>
      <main>{children}</main>
    </div>
  );
}
