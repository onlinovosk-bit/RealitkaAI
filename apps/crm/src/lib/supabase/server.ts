import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

function getUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

export function createAdminClient() {
  const url = getUrl() || "https://placeholder-project.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getKey() || "placeholder-key";
  return createSupabaseClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = getUrl() || "https://placeholder-project.supabase.co";
  const supabaseKey = getKey() || "placeholder-anon-key";

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
          }
        },
      },
    }
  );
}
