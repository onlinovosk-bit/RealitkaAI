import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: rows, error } = await supabase
    .from("AI AGENT AUTOMAT ONBOARDING no.2.01")
    .select("id, lead_score");

  if (error) {
    console.error("Fetch for segmentation failed:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  for (const r of rows ?? []) {
    const s = r.lead_score ?? 0;
    let segment: "A" | "B" | "C" = "C";

    if (s >= 70) segment = "A";
    else if (s >= 40) segment = "B";

    try {
      await supabase
        .from("AI AGENT AUTOMAT ONBOARDING no.2.01")
        .update({ segment })
        .eq("id", r.id);
    } catch (e) {
      console.error("Update segment failed:", e);
    }
  }

  return NextResponse.json({ segmented: rows?.length ?? 0 });
}
