import type { SupabaseClient } from "@supabase/supabase-js";

/** Lowercase header names for `Headers` API. */
export const TENANT_HEADER_AGENCY = "x-tenant-agency-id";
export const TENANT_HEADER_PROFILE = "x-tenant-profile-id";
export const TENANT_HEADER_USER = "x-tenant-user-id";

export type TenantForwardContext = {
  userId: string;
  profileId: string | null;
  agencyId: string | null;
};

/**
 * Loads profile for the signed-in user (same session as RLS). Safe to call
 * after middleware confirms `user` exists.
 */
export async function resolveTenantFromSupabaseSession(
  supabase: SupabaseClient,
): Promise<TenantForwardContext | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, agency_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return null;
  }

  return {
    userId: user.id,
    profileId: profile?.id ?? null,
    agencyId: profile?.agency_id ?? null,
  };
}

/**
 * Copies request headers and appends tenant forwarding keys for downstream
 * handlers (Server Actions / route handlers can read `headers()`).
 */
export function appendTenantHeadersToRequest(
  requestHeaders: Headers,
  tenant: TenantForwardContext,
): Headers {
  const next = new Headers(requestHeaders);
  next.set(TENANT_HEADER_USER, tenant.userId);
  if (tenant.profileId) {
    next.set(TENANT_HEADER_PROFILE, tenant.profileId);
  } else {
    next.delete(TENANT_HEADER_PROFILE);
  }
  if (tenant.agencyId) {
    next.set(TENANT_HEADER_AGENCY, tenant.agencyId);
  } else {
    next.delete(TENANT_HEADER_AGENCY);
  }
  return next;
}

/**
 * Reads tenant forwarded headers (e.g. in Route Handlers). Values are hints only;
 * enforce authorization with RLS + `withTenant` where needed.
 */
export function readTenantFromHeaders(headers: Headers): {
  userId: string | null;
  profileId: string | null;
  agencyId: string | null;
} {
  return {
    userId: headers.get(TENANT_HEADER_USER),
    profileId: headers.get(TENANT_HEADER_PROFILE),
    agencyId: headers.get(TENANT_HEADER_AGENCY),
  };
}
