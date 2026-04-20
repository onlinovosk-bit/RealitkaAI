import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    ok: true,
    plan: {
      today: ["Skontrolovať top 3 leady", "Odpovedať na otvorené emaily", "Aktualizovať pipeline"],
      thisWeek: ["Follow-up s leadmi bez kontaktu 7+ dní", "Revízia cenových ponúk", "Tímový briefing"],
    },
  });
}
