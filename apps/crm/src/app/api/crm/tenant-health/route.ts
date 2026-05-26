import { okResponse, errorResponse } from "@/lib/api-response";
import { getTenantHealthSnapshot } from "@/lib/crm-tenant-health";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/crm/tenant-health — počty pod RLS pre prihláseného používateľa */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const snapshot = await getTenantHealthSnapshot(supabase);
  return okResponse({ snapshot });
}
