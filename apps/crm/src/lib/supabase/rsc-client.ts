import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Jednotný server Supabase pre RSC stránky a route handlery. */
export async function getRscSupabase() {
  return createClient();
}
