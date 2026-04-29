import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type OnboardingLead = {
  id: string;
  agency_name: string | null;
  segment: string | null;
  status: string | null;
  contacted_at: string | null;
};

function buildTasks(lead: OnboardingLead): string[] {
  const agencyName = lead.agency_name?.trim() || "kancelária";
  const status = (lead.status ?? "").toUpperCase();
  const contacted = Boolean(lead.contacted_at);

  if (lead.segment === "A") {
    if (!contacted) {
      return [
        `Zavolaj do ${agencyName} do 60 minút a over záujem.`,
        "Pošli personalizovaný demo link s CTA na onboarding call.",
        "Naplánuj follow-up na zajtra o 09:00.",
      ];
    }
    if (status === "NEGOTIATION" || status === "QUALIFIED") {
      return [
        `Priprav pre ${agencyName} konkrétny business case (ROI + 30-dňový plán).`,
        "Pošli recap po hovore a navrhni podpis trial aktivácie.",
      ];
    }
    return [
      `Udržuj momentum v ${agencyName}: krátky check-in a next step.`,
      "Skontroluj otvorenie emailu a reakciu na CTA.",
    ];
  }

  if (lead.segment === "B") {
    return [
      `Sprav rýchly research webu a ponuky pre ${agencyName}.`,
      "Priprav 1 personalizovaný angle podľa typu inzerátov.",
      "Naplánuj jemný follow-up o 48 hodín.",
    ];
  }

  return [
    `Pasívne monitoruj signály pre ${agencyName}.`,
    "Neeskaluj kontakt, iba sleduj zmeny segmentu.",
  ];
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: leads, error } = await supabase
    .from("AI AGENT AUTOMAT ONBOARDING no.2.01")
    .select("id, agency_name, segment, status, contacted_at");

  if (error) {
    console.error("Fetch for playbook auto failed:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);
  let updated = 0;

  for (const lead of (leads ?? []) as OnboardingLead[]) {
    const tasks = buildTasks(lead);

    try {
      const { error: updateError } = await supabase
        .from("AI AGENT AUTOMAT ONBOARDING no.2.01")
        .update({
          playbook_date: today,
          tasks,
        })
        .eq("id", lead.id);

      if (updateError) {
        // Fallback for schemas that use playbook_tasks instead of tasks.
        const { error: fallbackError } = await supabase
          .from("AI AGENT AUTOMAT ONBOARDING no.2.01")
          .update({
            playbook_date: today,
            playbook_tasks: tasks,
          })
          .eq("id", lead.id);

        if (fallbackError) {
          console.error("Update playbook auto failed:", fallbackError);
          continue;
        }
      }

      updated += 1;
    } catch (e) {
      console.error("Playbook auto update exception:", e);
    }
  }

  return NextResponse.json({
    playbooks_generated: leads?.length ?? 0,
    playbooks_updated: updated,
    playbook_date: today,
  });
}
