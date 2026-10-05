import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TEAM_PERMISSIONS, UNKNOWN_TEAM_PERMISSIONS } from "@/types/navigation";

/**
 * Tri východy tejto trasy vracali ten istý povoľujúci default, takže sa nedalo
 * odlíšiť „maklér nemá tím" (legitímny solo default) od „oprávnenia sa nedali
 * prečítať". Druhý prípad dnes nastáva vždy: tabuľka `team_member_permissions`
 * v PROD neexistuje, takže každý člen tímu mal export zdieľaných kontaktov
 * zapnutý. Nález P2 z docs/reports/2026-10-05-fail-open-sweep.md.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    // Neprihlásený: nevieme, kto to je → nič.
    if (!user) return NextResponse.json(UNKNOWN_TEAM_PERMISSIONS);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, team_license_id, ui_role")
      .eq("auth_user_id", user.id)
      .single();

    // Profil sa nedal prečítať — nevieme ani to, či je v tíme.
    if (profileError || !profile) {
      console.error("[api/nav/permissions] profil sa nedal prečítať:", profileError?.message);
      return NextResponse.json(UNKNOWN_TEAM_PERMISSIONS);
    }

    // Bez tímu = solo maklér. Toto je to jediné miesto, kde povoľujúci default patrí.
    if (!profile.team_license_id) {
      return NextResponse.json(DEFAULT_TEAM_PERMISSIONS);
    }

    const { data: perms, error: permsError } = await supabase
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

    // Člen tímu bez čitateľného riadku oprávnení → nevieme, čo mu tím povolil.
    if (permsError || !perms) {
      console.error(
        "[api/nav/permissions] oprávnenia člena tímu sa nedali prečítať:",
        permsError?.message ?? "žiadny riadok",
      );
      return NextResponse.json(UNKNOWN_TEAM_PERMISSIONS);
    }

    return NextResponse.json(perms);
  } catch (err) {
    console.error("[api/nav/permissions] Error:", err);
    return NextResponse.json(UNKNOWN_TEAM_PERMISSIONS);
  }
}
