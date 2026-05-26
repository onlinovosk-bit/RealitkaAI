import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * Tenant Supabase pre RLS.
 * - Browser: cookies cez @supabase/ssr browser client.
 * - Server (RSC / API): vždy predaj `scoped` z `createClient()` — inak len browser singleton (často 0 riadkov).
 */
export async function resolveTenantSupabase(
  scoped?: SupabaseClient | null,
): Promise<SupabaseClient | null> {
  if (scoped) return scoped;
  return getSupabaseClient();
}
