import { createBrowserClient } from "@supabase/ssr";

function getKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = getKey();

const fallbackSupabaseUrl = "https://placeholder-project.supabase.co";
const fallbackSupabaseKey = "placeholder-anon-key";

export const supabaseClient = createBrowserClient(
  supabaseUrl || fallbackSupabaseUrl,
  supabaseKey || fallbackSupabaseKey,
);
