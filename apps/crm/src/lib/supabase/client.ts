// DEBUG: vypíš všetky env premenné na serveri
if (typeof window === 'undefined') {
  // eslint-disable-next-line no-console
  console.log('DEBUG ENV', JSON.stringify(process.env, null, 2));
}
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

export const supabaseClient = createBrowserClient(supabaseUrl, supabaseKey);
