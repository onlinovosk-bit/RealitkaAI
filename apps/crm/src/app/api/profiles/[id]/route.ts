import { NextResponse } from "next/server";
import { getProfileById, updateProfile } from "@/lib/team-store";

type ProfileInput = {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  teamId: string | null;
  isActive: boolean;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await getProfileById(id);
  if (!profile) {
    return NextResponse.json({ error: "Profil nenájdený" }, { status: 404 });
  }
  return NextResponse.json({ profile });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
