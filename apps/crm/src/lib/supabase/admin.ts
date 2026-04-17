import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with service role. Use only in Route Handlers / server actions.
 * Required for cron + scraper upserts (RLS allows service_role full access).
 */
export function createSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Alias used across server modules (service role = admin client). */
export const createServiceRoleClient = createSupabaseAdmin;
