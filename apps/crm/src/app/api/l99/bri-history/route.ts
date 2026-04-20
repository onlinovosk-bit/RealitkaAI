import { NextResponse } from "next/server";
import { checkEnterpriseAccess } from "@/lib/l99/entitlements";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const access = await checkEnterpriseAccess();
  if (!access.allowed) {
    return NextResponse.json(
      { error: "Vyžaduje Enterprise plán.", upgradeUrl: "/billing" },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Neautorizovaný." }, { status: 401 });

  const { data: history } = await supabase
    .from("bri_history")
    .select(`
      id,
      bri_score,
      reasoning_string,
      reasoning_factors,
      calculated_at,
      leads(id, name)
    `)
    .order("calculated_at", { ascending: false })
    .limit(10);

  return NextResponse.json({ history: history ?? [] });
}
