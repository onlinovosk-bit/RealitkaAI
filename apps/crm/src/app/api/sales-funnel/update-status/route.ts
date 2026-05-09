import { okResponse, errorResponse } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

const VALID_STATUSES = ["new", "contacted", "demo_booked", "proposal_sent", "won", "lost"];



export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const id = String(body?.id ?? "").trim();
    const status = String(body?.status ?? "").trim();

    if (!id) return errorResponse("Chýba id.", 400);
    if (!VALID_STATUSES.includes(status)) return errorResponse("Neplatný stav.", 400);

    const { error } = await supabase
      .from("saas_leads")
      .update({ status })
      .eq("id", id);

    if (error) return errorResponse(error.message, 500);

    return okResponse({ id, status });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa aktualizovať stav.",
      400
    );
  }
}
