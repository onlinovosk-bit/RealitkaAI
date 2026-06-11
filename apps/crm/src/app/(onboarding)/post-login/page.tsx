import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadWizardGateContext } from "@/lib/activation/wizard-gate";

export default async function PostLoginWizardGatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/post-login");

  const gate = await loadWizardGateContext(supabase, user.id, user.email, "/dashboard");
  if (gate.redirectTo) {
    redirect(gate.redirectTo);
  }

  redirect("/dashboard");
}
