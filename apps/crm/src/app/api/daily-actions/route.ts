import { NextResponse } from "next/server"; // response helper
import { generateDailyActions } from "@/lib/daily-actions"; // import logiky

export async function GET() {
  // TODO: nahradiť reálnym fetch zo Supabase
  const leads = [
    {
      id: "1",
      name: "Ján Novák",
      status: "Horúci",
      last_contact_at: "2026-04-07",
      created_at: "2026-04-05",
    },
    {
      id: "2",
      name: "Petra Kováčová",
      status: "Nový",
      created_at: "2026-04-09",
    },
  ];

  const actions = generateDailyActions(leads); // generovanie akcií

  return NextResponse.json({ actions }); // response
}
