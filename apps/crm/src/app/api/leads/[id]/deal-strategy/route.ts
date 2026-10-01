import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDealStrategy } from "@/lib/ai/deal-strategy";
import { sameAgency } from "@/lib/tenant-scope";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from("profiles").select("agency_id").eq("auth_user_id", user.id).maybeSingle();

  const { id } = await params;
  const { data: lead, error: leadError } = await supabase.from("leads").select("*").eq("id", id).single();
  if (leadError || !lead) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!sameAgency(callerProfile?.agency_id, (lead as { agency_id?: string | null }).agency_id)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const strategy = await generateDealStrategy(lead as Record<string, unknown>);
  return NextResponse.json({ ok: true, strategy });
}
