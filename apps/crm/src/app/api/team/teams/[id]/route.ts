import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateTeam } from "@/lib/team-store";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    const team = await updateTeam(id, {
      name:     typeof body.name     === "string"  ? body.name     : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    });

    return NextResponse.json({ ok: true, team });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Nepodarilo sa upraviť tím." },
      { status: 400 }
    );
  }
}
