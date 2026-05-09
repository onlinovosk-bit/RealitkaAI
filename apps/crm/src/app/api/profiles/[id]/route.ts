import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileById, updateProfile } from "@/lib/team-store";

type ProfileInput = {
  fullName:  string;
  email:     string;
  phone:     string;
  role:      string;
  teamId:    string | null;
  isActive:  boolean;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const profile = await getProfileById(id);
  if (!profile) {
    return NextResponse.json({ error: "Profil nenájdený" }, { status: 404 });
  }

  if (id !== user.id) {
    const { data: callerProfile } = await supabase
      .from("profiles").select("agency_id").eq("id", user.id).maybeSingle();

    if (callerProfile?.agency_id && profile.agencyId !== callerProfile.agency_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({ profile });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from("profiles").select("agency_id").eq("id", user.id).maybeSingle();

  const { id } = await params;

  if (id !== user.id && callerProfile?.agency_id) {
    const targetProfile = await getProfileById(id);
    if (targetProfile?.agencyId !== callerProfile.agency_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let body: Partial<ProfileInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatný JSON" }, { status: 400 });
  }

  try {
    const updated = await updateProfile(id, body);
    return NextResponse.json({ ok: true, profile: updated });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
