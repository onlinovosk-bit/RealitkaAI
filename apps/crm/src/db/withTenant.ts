import type { SupabaseClient } from "@supabase/supabase-js";

/** Thrown when session is missing, profile cannot be loaded, or agency does not match. */
export class TenantAccessDeniedError extends Error {
  constructor(message = "Tenant access denied") {
    super(message);
    this.name = "TenantAccessDeniedError";
  }
}

export type WithTenantContext = {
  agencyId: string;
  supabase: SupabaseClient;
};

/**
 * Runs `run` only if the current Supabase session maps to a profile whose
 * `agency_id` equals `agencyId`. Use a user-scoped client (cookie session) so
 * Postgres RLS policies tied to `auth.uid()` apply inside `run`.
 */
export async function withTenant<T>(
  agencyId: string,
  supabase: SupabaseClient,
  run: (ctx: WithTenantContext) => Promise<T>,
): Promise<T> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new TenantAccessDeniedError("Not authenticated");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new TenantAccessDeniedError(profileError.message);
  }

  const resolved = profile?.agency_id ?? null;
  if (!resolved || resolved !== agencyId) {
    throw new TenantAccessDeniedError("Agency mismatch");
  }

  return run({ agencyId, supabase });
}
