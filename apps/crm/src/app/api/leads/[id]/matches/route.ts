import { NextResponse } from "next/server";
import { listLeadPropertyMatchesByLeadId } from "@/lib/matching-store";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const matches = await listLeadPropertyMatchesByLeadId(id);
    return NextResponse.json({ ok: true, matches });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nepodarilo sa načítať matching históriu.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
