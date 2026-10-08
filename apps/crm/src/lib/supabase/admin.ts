import { createClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "@/lib/supabase/fetch-timeout";

/**
 * Service role klient – len na serveri (cron, metriky, audit insert).
 * Nikdy neimportuj do "use client" komponentov.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  // SUPABASE_SECRET_KEY = nový „secret key" z integrácie Supabase↔Vercel (rovnaké oprávnenia ako service_role);
  // záloha, keď je SUPABASE_SERVICE_ROLE_KEY prázdny alebo nenastavený.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout },
  });
}
