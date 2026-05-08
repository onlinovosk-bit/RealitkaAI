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

    // Enforce caller's own agency — prevents privilege escalation via body.agencyId
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", user.id)
      .maybeSingle();
    const agencyId: string = callerProfile?.agency_id ?? body.agencyId ?? "";

    const team = await createTeam({
      agencyId,
      name: body.name,
    });

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
    });

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
