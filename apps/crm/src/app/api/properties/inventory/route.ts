import { okResponse, errorResponse } from "@/lib/api-response";
import { loadPropertiesInventory } from "@/lib/properties-store";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Inventár nehnuteľností pre prihláseného používateľa (RLS).
 * Používa PropertiesPageClient ak SSR vráti 0, ale session v prehliadači je platná.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const inventory = await loadPropertiesInventory(supabase);
  return okResponse({ inventory });
}
