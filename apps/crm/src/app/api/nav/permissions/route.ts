import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TEAM_PERMISSIONS } from "@/types/navigation";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(DEFAULT_TEAM_PERMISSIONS);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, team_license_id, ui_role")
      .eq("auth_user_id", user.id)
      .single();

    // Ak nie je v tíme, vráť default
    if (!profile?.team_license_id) {
      return NextResponse.json(DEFAULT_TEAM_PERMISSIONS);
    }

    const { data: perms } = await supabase
      .from("team_member_permissions")
      .select(`
        can_see_team_pipeline,
        can_see_colleague_leads,
        can_see_team_forecast,
        can_see_shared_contacts,
        can_export_contacts,
        can_delete_leads,
        can_edit_colleagues_tasks
      `)
      .eq("agent_profile_id", profile.id)
      .eq("team_license_id",  profile.team_license_id)
      .single();

    return NextResponse.json(perms ?? DEFAULT_TEAM_PERMISSIONS);
  } catch (err) {
    console.error("[api/nav/permissions] Error:", err);
    return NextResponse.json(DEFAULT_TEAM_PERMISSIONS);
  }
}
