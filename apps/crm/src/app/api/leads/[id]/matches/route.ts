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

    const { data: callerProfile } = await supabase
      .from("profiles").select("agency_id").eq("id", user.id).maybeSingle();

    const { data: lead } = await supabase
      .from("leads").select("agency_id").eq("id", id).maybeSingle();

    if (callerProfile?.agency_id && lead?.agency_id !== callerProfile.agency_id) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

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
