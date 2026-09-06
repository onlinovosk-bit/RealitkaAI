import type { SupabaseClient } from "@supabase/supabase-js";
import { isOperatorDashboardEnabled } from "@/lib/operator/config";

export type PlatformAdminProfile = {
  is_platform_admin?: boolean | null;
};

export function isPlatformAdmin(profile: PlatformAdminProfile | null | undefined): boolean {
  return profile?.is_platform_admin === true;
}

/**
 * Resolve platform-admin flag for the signed-in auth user.
 * Prod profiles often have profiles.id ≠ auth.uid() — match auth_user_id or legacy id.
 * Same pattern as app/(dashboard)/trh/page.tsx (#469).
 */
export async function fetchProfilePlatformAdminFlag(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<PlatformAdminProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .or(`auth_user_id.eq.${authUserId},id.eq.${authUserId}`)
    .maybeSingle();

  if (error) return null;
  return data;
}

/** Page/API gate: false when flag off, unauthenticated, or not platform admin. */
export async function canAccessOperatorDashboard(
  supabase: SupabaseClient,
  userId: string | undefined | null,
): Promise<boolean> {
  if (!isOperatorDashboardEnabled()) return false;
  if (!userId) return false;

  const profile = await fetchProfilePlatformAdminFlag(supabase, userId);
  return isPlatformAdmin(profile);
}
