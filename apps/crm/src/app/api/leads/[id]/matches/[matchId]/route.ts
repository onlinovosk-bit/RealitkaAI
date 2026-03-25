import { NextResponse } from "next/server";
import { updateLeadPropertyMatchStatus } from "@/lib/matching-store";
import { addLeadActivity } from "@/lib/leads-store";

function formatMatchStatus(status: string) {
  switch (status) {
    case "sent":
      return "Odoslané";
    case "viewed":
      return "Prezreté";
    case "interested":
      return "Záujem";
    case "rejected":
      return "Odmietnuté";
    default:
      return status;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const { id, matchId } = await params;
    const body = await request.json();

    if (typeof body.status !== "string" || !body.status.trim()) {
      return NextResponse.json(
        { ok: false, error: "Chýba status matchu." },
        { status: 400 }
      );
    }

    const { match, previousStatus } = await updateLeadPropertyMatchStatus(
      id,
      matchId,
      body.status
    );

    if (previousStatus !== match.status) {
      await addLeadActivity(
        id,
        `Matching ponuka '${match.propertyTitle}' zmenila stav: ${formatMatchStatus(previousStatus ?? "sent")} -> ${formatMatchStatus(match.status ?? "sent")}.`,
        "Email"
      );
    }

    return NextResponse.json({ ok: true, match });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nepodarilo sa zmeniť stav matchu.";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
