import { NextResponse } from "next/server";
import { updateTeam } from "@/lib/team-store";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const team = await updateTeam(id, {
      name: typeof body.name === "string" ? body.name : undefined,
      isActive:
        typeof body.isActive === "boolean" ? body.isActive : undefined,
    });

    return NextResponse.json({ ok: true, team });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nepodarilo sa upraviť tím.",
      },
      { status: 400 }
    );
  }
}
