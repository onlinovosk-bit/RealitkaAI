import { okResponse, errorResponse } from "@/lib/api-response";
import { syncEmailInbox } from "@/lib/integrations-store";
import { requireFeature } from "@/lib/feature-gating";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    await requireFeature("integrations");
    const result = await syncEmailInbox("");
    return okResponse({ result });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Email inbox sync zlyhal.",
      400
    );
  }
}
