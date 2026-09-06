"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendOnboardingEmail } from "@/lib/send-onboarding-email";

/**
 * Public registration must not attach users to a shared/default agency.
 * Agency+team bootstrap requires a privileged path (service_role) — not implemented
 * in this PR (tenant-creation security boundary; founder GO required).
 * Until then: fail closed rather than write into the production Smolko tenant
 * (11111111-1111-1111-1111-111111111111).
 */
export async function register(formData: FormData) {
  const supabase = await createClient();

  const fullName = String(formData.get("fullName") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const phone = String(formData.get("phone") ?? "");

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  const user = signUpData.user;

  if (user) {
    const { data: existingByUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!existingByUser) {
      const { data: existingByEmail } = await supabase
        .from("profiles")
        .select("id, agency_id")
        .eq("email", email)
        .maybeSingle();

      if (existingByEmail?.id) {
        // Link auth to an invite/pre-provisioned profile — do not invent role/agency
        // from a global profile count (that forced every signup to "agent").
        await supabase
          .from("profiles")
          .update({
            auth_user_id: user.id,
            full_name: fullName || email,
            phone: phone || null,
            is_active: true,
          })
          .eq("id", existingByEmail.id);
      } else {
        // No agency bootstrap mechanism exists for user-scoped clients (RLS: no
        // agencies INSERT policy). Do not fall back to Smolko UUID.
        redirect(
          `/register?error=${encodeURIComponent(
            "Registrácia je dočasne nedostupná: chýba bezpečné založenie agentúry. Kontaktujte podporu Revolis.",
          )}`,
        );
      }
      // Odoslanie welcome emailu
      try {
        await sendOnboardingEmail(
          "welcome",
          email,
          fullName || email,
          "https://app.revolis.ai/onboarding",
        );
      } catch (e) {
        // Log error, ale nespomaľuj registráciu
        console.error("Nepodarilo sa odoslať welcome email:", e);
      }
    }
  }

  redirect("/onboarding/step-1-vitaj");
}
