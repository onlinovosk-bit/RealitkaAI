import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeSalesBrain } from "@/lib/ai/sales-brain";
import { sameAgency } from "@/lib/tenant-scope";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from("profiles").select("agency_id").eq("auth_user_id", user.id).maybeSingle();

  const { id } = await params;
  const { data: lead } = await supabase
    .from("leads")
    .select("id, agency_id, status, score, bri_score, budget, location, property_type, rooms, last_contact_at, created_at, financing, timeline")
    .eq("id", id)
    .single();
  if (!lead) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!sameAgency(callerProfile?.agency_id, (lead as { agency_id?: string | null }).agency_id)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const insight = await analyzeSalesBrain(id, lead as Record<string, unknown>);
  return NextResponse.json({ ok: true, insight });
}
