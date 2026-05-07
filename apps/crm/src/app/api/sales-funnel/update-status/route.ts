import { okResponse, errorResponse } from "@/lib/api-response";
import { getSupabaseClient } from "@/lib/supabase/client";

const VALID_STATUSES = ["new", "contacted", "demo_booked", "proposal_sent", "won", "lost"];



export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = String(body?.id ?? "").trim();
    const status = String(body?.status ?? "").trim();

    if (!id) return errorResponse("Chýba id.", 400);
    if (!VALID_STATUSES.includes(status)) return errorResponse("Neplatný stav.", 400);

    const supabase = getSupabaseClient();

    if (!supabase) {
      // No DB configured — return success optimistically (UI already updated)
      return okResponse({ id, status });
    }

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
