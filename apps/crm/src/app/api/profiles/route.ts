import { NextResponse } from "next/server";
import { listProfiles } from "@/lib/team-store";

export async function GET() {
  try {
    const profiles = await listProfiles();
    return NextResponse.json({ ok: true, profiles });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
