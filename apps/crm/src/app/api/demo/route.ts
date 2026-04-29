import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: leads, error } = await supabase
    .from("AI AGENT AUTOMAT ONBOARDING no.2.01")
    .select("id, agency_name, website_url, segment, demo_url")
    .eq("segment", "A")
    .is("demo_url", null);

  if (error) {
    console.error("Fetch demo leads failed:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  for (const l of leads ?? []) {
    const demoUrl = `https://app.revolis.ai/demo/live?agencyId=${l.id}`;

    try {
      await supabase
        .from("AI AGENT AUTOMAT ONBOARDING no.2.01")
        .update({ demo_url: demoUrl })
        .eq("id", l.id);
    } catch (e) {
      console.error("Update demo_url failed:", e);
    }
  }

  return NextResponse.json({ demo_prepared: leads?.length ?? 0 });
}
