import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ONBOARDING_TABLE = "AI AGENT AUTOMAT ONBOARDING no.2.01";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const rawId = req.nextUrl.searchParams.get("id");
  const id = rawId && UUID_RE.test(rawId) ? rawId : null;

  const query = supabase
    .from(ONBOARDING_TABLE)
    .select("*")
    .order("lead_score", { ascending: false })
    .limit(1);

  const { data, error } = id ? await query.eq("id", id) : await query;

  if (error || !data || data.length === 0) {
    console.error("Decision fetch failed:", error);
    return NextResponse.json({ error: "no_candidate" }, { status: 404 });
  }

  const lead = data[0];

  let action = "WAIT";
  if (!lead.contacted_at) action = "CONTACT";
  else if (lead.demo_url && !lead.demo_clicked_at) action = "FOLLOW_UP_DEMO";
  else if (lead.segment === "A") action = "DEEPEN_RELATIONSHIP";

  return NextResponse.json({ lead_id: lead.id, action });
}
