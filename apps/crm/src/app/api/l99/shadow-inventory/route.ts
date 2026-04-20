import { NextResponse } from "next/server";
import { scanDormantLeads } from "@/lib/l99/shadow-inventory";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile?.agency_id) {
    return NextResponse.json({ error: "Profil nemá agency_id." }, { status: 400 });
  }

  const signals = await scanDormantLeads(profile.agency_id);
  return NextResponse.json({ signals, count: signals.length });
}
