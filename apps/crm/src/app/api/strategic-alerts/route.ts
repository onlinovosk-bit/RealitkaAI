import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type StrategicAlert = {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  type: string;
  location_focus: string | null;
  created_at: string;
};

const SEED_ALERTS: StrategicAlert[] = [
  {
    id: "seed-1",
    title: "PRÍLEŽITOSŤ: Reality ABC vykazuje útlm",
    description: "V lokalite Prešov - Sídlisko III klesla aktivita o 60%. Odporúčame spustiť náborovú kampaň v tejto zóne.",
    severity: "high",
    type: "COMPETITOR_SLEEP",
    location_focus: "Prešov - Sídlisko III",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "seed-2",
    title: "PRÍLEŽITOSŤ: Domov Plus nevložil nové inzeráty",
    description: "Za posledných 7 dní nulové nové listingy v zóne Sekčov. Aktivujte akvizičný skript pre 3-izbové byty.",
    severity: "high",
    type: "COMPETITOR_SLEEP",
    location_focus: "Prešov - Sekčov",
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
];

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strategic_alerts")
    .select("id,title,description,severity,type,location_focus,created_at")
    .order("created_at", { ascending: false })
    .limit(15);

  if (error || !data || data.length === 0) {
    return NextResponse.json({ ok: true, alerts: SEED_ALERTS, source: "seed" });
  }

  return NextResponse.json({ ok: true, alerts: data, source: "db" });
}
