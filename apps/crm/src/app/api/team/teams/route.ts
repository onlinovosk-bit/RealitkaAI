import { NextResponse } from "next/server";
import { createTeam, listTeams } from "@/lib/team-store";
import { createActivity } from "@/lib/activities-store";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const teams = await listTeams();
    return NextResponse.json({ ok: true, teams });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nepodarilo sa načítať tímy.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    // Owner/founder only; agency always from caller profile (ignore client agency claim).
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role, agency_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (callerProfile?.role !== "owner" && callerProfile?.role !== "founder") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    if (!callerProfile.agency_id) {
      return NextResponse.json(
        { ok: false, error: "Váš profil nemá priradenú agentúru." },
        { status: 403 },
      );
    }

    const team = await createTeam({
      agencyId: callerProfile.agency_id,
      name: body.name,
    }, supabase);

    await createActivity({
      leadId: null,
      type: "Tím",
      title: "Vytvorený tím",
      text: `Bol vytvorený nový tím: ${team.name}.`,
      entityType: "team",
      entityId: team.id,
      actorName: "Systém",
      source: "team",
      severity: "info",
    }, supabase);

    return NextResponse.json({ ok: true, team });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nepodarilo sa vytvoriť tím.",
      },
      { status: 400 }
    );
  }
}
