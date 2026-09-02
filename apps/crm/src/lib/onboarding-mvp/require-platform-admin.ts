import { errorResponse } from "@/lib/api-response";
import { isPlatformAdmin } from "@/lib/operator/access";
import { createClient } from "@/lib/supabase/server";

/**
 * Gate for cross-tenant onboarding MVP admin routes.
 * Must run before createServiceRoleClient().
 */
export async function requirePlatformAdmin(): Promise<Response | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", 401);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !isPlatformAdmin(profile)) {
    return errorResponse("forbidden", 403);
  }

  return null;
}
