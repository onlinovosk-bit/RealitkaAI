"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendOnboardingEmail } from "@/lib/send-onboarding-email";

const DEFAULT_AGENCY_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_TEAM_ID = "22222222-2222-2222-2222-222222222222";

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
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const role = !count || count === 0 ? "owner" : "agent";

    const { data: existingByUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!existingByUser) {
      const { data: existingByEmail } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingByEmail?.id) {
        await supabase
          .from("profiles")
          .update({
            auth_user_id: user.id,
            full_name: fullName || email,
            phone: phone || null,
            role,
            is_active: true,
          })
          .eq("id", existingByEmail.id);
      } else {
        await supabase.from("profiles").insert({
          agency_id: DEFAULT_AGENCY_ID,
          team_id: DEFAULT_TEAM_ID,
          auth_user_id: user.id,
          full_name: fullName || email,
          email,
          role,
          phone: phone || null,
          is_active: true,
        });
      }
      // Odoslanie welcome emailu
      try {
        await sendOnboardingEmail('welcome', email, fullName || email, 'https://app.revolis.ai/onboarding');
      } catch (e) {
        // Log error, ale nespomaľuj registráciu
        console.error('Nepodarilo sa odoslať welcome email:', e);
      }
    }
  }

  redirect("/login?registered=1");
}
