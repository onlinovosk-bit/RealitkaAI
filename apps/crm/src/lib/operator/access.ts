import type { SupabaseClient } from "@supabase/supabase-js";
import { isOperatorDashboardEnabled } from "@/lib/operator/config";

export type PlatformAdminProfile = {
  is_platform_admin?: boolean | null;
};

export function isPlatformAdmin(profile: PlatformAdminProfile | null | undefined): boolean {
  return profile?.is_platform_admin === true;
}

/** Page/API gate: false when flag off, unauthenticated, or not platform admin. */
export async function canAccessOperatorDashboard(
  supabase: SupabaseClient,
  userId: string | undefined | null,
): Promise<boolean> {
  if (!isOperatorDashboardEnabled()) return false;
  if (!userId) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return false;
  return isPlatformAdmin(data);
}
