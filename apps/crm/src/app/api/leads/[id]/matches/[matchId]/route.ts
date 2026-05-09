import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateLeadPropertyMatchStatus } from "@/lib/matching-store";
import { addLeadActivity } from "@/lib/leads-store";

function formatMatchStatus(status: string) {
  switch (status) {
    case "sent":      return "Odoslané";
    case "viewed":    return "Prezreté";
    case "interested": return "Záujem";
    case "rejected":  return "Odmietnuté";
    default:          return status;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { id, matchId } = await params;

    const { data: callerProfile } = await supabase
      .from("profiles").select("agency_id").eq("id", user.id).maybeSingle();

    const { data: lead } = await supabase
      .from("leads").select("agency_id").eq("id", id).maybeSingle();

    if (callerProfile?.agency_id && lead?.agency_id !== callerProfile.agency_id) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

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
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Nepodarilo sa zmeniť stav matchu." },
      { status: 400 }
    );
  }
}
