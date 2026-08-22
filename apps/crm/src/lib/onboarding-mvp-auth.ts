import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/api-response";

/**
 * Cross-tenant onboarding CSM routes (at-risk dump, email dispatch) must not
 * be reachable without an authenticated Revolis operator.
 * Public checklist/schedule stay open for the pre-login onboarding wizard.
 */
export async function requireOnboardingOperator() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, response: errorResponse("Unauthorized", 401) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_platform_admin")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const role = (profile?.role ?? "").trim().toLowerCase();
  const isOperator =
    role === "founder" || profile?.is_platform_admin === true;

  if (!isOperator) {
    return { ok: false as const, response: errorResponse("Forbidden", 403) };
  }

  return { ok: true as const, user, profile };
}
