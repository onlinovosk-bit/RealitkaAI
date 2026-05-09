import { NextResponse } from "next/server";
import { okResponse, errorResponse } from "@/lib/api-response";
import { importPortalLeadsFromCsv } from "@/lib/integrations-store";
import { requireFeature } from "@/lib/feature-gating";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    await requireFeature("integrations");

    const body = await request.json();
    const csv = String(body?.csv ?? "");

    if (!csv.trim()) {
      return errorResponse("Chýba CSV obsah.", 400);
    }

    const result = await importPortalLeadsFromCsv(csv);
    return okResponse({ result });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Portálový import zlyhal.",
      400
    );
  }
}
