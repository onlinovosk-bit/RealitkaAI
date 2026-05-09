import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const ONBOARDING_TABLE = "AI AGENT AUTOMAT ONBOARDING no.2.01";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: leads, error } = await supabase
    .from(ONBOARDING_TABLE)
    .select("id, agency_name, segment, demo_url, contacted_at");

  if (error) {
    console.error("Fetch for playbook failed:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const upsertRows = (leads ?? []).map((l) => {
    const tasks: string[] = [];

    if (l.segment === "A") {
      tasks.push(
        `Zavolaj do ${l.agency_name} a nadviaž na demo.`,
        `Pošli follow-up email s konkrétnym use-case.`,
      );
    } else if (l.segment === "B") {
      tasks.push(`Skontroluj web ${l.agency_name} a priprav personalizovaný angle.`);
    } else {
      tasks.push(`Len pasívne sleduj signály pre ${l.agency_name}.`);
    }

    return { id: l.id, playbook_date: today, playbook_tasks: tasks };
  });

  if (upsertRows.length > 0) {
    const { error: upsertError } = await supabase
      .from(ONBOARDING_TABLE)
      .upsert(upsertRows, { onConflict: "id" });

    if (upsertError) {
      console.error("Batch playbook upsert failed:", upsertError);
      return NextResponse.json({ error: "upsert_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ playbooks_generated: upsertRows.length });
}
