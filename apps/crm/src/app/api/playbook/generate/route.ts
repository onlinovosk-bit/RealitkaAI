import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: leads, error } = await supabase
    .from("AI AGENT AUTOMAT ONBOARDING no.2.01")
    .select("id, agency_name, segment, demo_url, contacted_at");

  if (error) {
    console.error("Fetch for playbook failed:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);

  for (const l of leads ?? []) {
    const tasks: string[] = [];

    if (l.segment === "A") {
      tasks.push(
        `Zavolaj do ${l.agency_name} a nadviaž na demo.`,
        `Pošli follow-up email s konkrétnym use-case.`,
      );
    } else if (l.segment === "B") {
      tasks.push(
        `Skontroluj web ${l.agency_name} a priprav personalizovaný angle.`,
      );
    } else {
      tasks.push(`Len pasívne sleduj signály pre ${l.agency_name}.`);
    }

    try {
      await supabase
        .from("AI AGENT AUTOMAT ONBOARDING no.2.01")
        .update({ playbook_date: today, playbook_tasks: tasks })
        .eq("id", l.id);
    } catch (e) {
      console.error("Update playbook failed:", e);
    }
  }

  return NextResponse.json({ playbooks_generated: leads?.length ?? 0 });
}
