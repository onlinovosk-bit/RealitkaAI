import { createClient } from "@supabase/supabase-js";

/**
 * Service role klient – len na serveri (cron, metriky, audit insert).
 * Nikdy neimportuj do "use client" komponentov.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
