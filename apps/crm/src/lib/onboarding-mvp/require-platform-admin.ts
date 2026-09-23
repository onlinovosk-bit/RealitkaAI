import { errorResponse } from "@/lib/api-response";
import { fetchProfilePlatformAdminFlag, isPlatformAdmin } from "@/lib/operator/access";
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

  const profile = await fetchProfilePlatformAdminFlag(supabase, user.id);

  if (!isPlatformAdmin(profile)) {
    return errorResponse("forbidden", 403);
  }

  return null;
}
