import { NextResponse } from "next/server";
import { getActivitiesByLeadId } from "@/lib/leads-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activities = await getActivitiesByLeadId(id);

    return NextResponse.json({ ok: true, activities });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nepodarilo sa načítať aktivity.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}