import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { buildCompetitionRadar } from "@/lib/hub/competition-radar";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await buildCompetitionRadar();
  return NextResponse.json(payload);
}
