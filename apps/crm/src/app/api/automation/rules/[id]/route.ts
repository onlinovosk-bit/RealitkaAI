export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { updateAssignmentRule, deleteAssignmentRule } from "@/lib/lead-automation-store";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const rule = await updateAssignmentRule(id, {
      name: body.name,
      profileIds: body.profileIds,
      criteria: body.criteria,
      active: body.active,
    });

    return NextResponse.json({ ok: true, rule });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nepodarilo sa aktualizovať pravidlo.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await deleteAssignmentRule(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nepodarilo sa vymazať pravidlo.",
      },
      { status: 400 }
    );
  }
}
