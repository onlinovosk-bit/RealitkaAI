import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Seed dáta — realistické SK adresy pre demo
const SEED_ALERTS = [
  { address: "Sabinovská 14, Prešov",    area: "presov", event_type: "price_drop",     change_amount: -7500,  days_ago: 2,  is_urgent: true  },
  { address: "Sabinovská 8, Prešov",     area: "presov", event_type: "new_listing",    change_amount: null,   days_ago: 5,  is_urgent: false },
  { address: "Sabinovská 22, Prešov",    area: "presov", event_type: "sold",           change_amount: null,   days_ago: 12, is_urgent: false },
  { address: "Exnárova 3, Prešov",       area: "presov", event_type: "price_increase", change_amount: 5000,   days_ago: 3,  is_urgent: false },
  { address: "Hlavná 45, Prešov",        area: "presov", event_type: "price_drop",     change_amount: -12000, days_ago: 1,  is_urgent: true  },
  { address: "Nábrežná 7, Košice",       area: "kosice", event_type: "new_listing",    change_amount: null,   days_ago: 4,  is_urgent: false },
  { address: "Mlynská 12, Košice",       area: "kosice", event_type: "sold",           change_amount: null,   days_ago: 8,  is_urgent: false },
  { address: "Rooseveltova 18, Košice",  area: "kosice", event_type: "price_drop",     change_amount: -9000,  days_ago: 2,  is_urgent: true  },
  { address: "Obchodná 33, Bratislava",  area: "bratislava", event_type: "price_increase", change_amount: 15000, days_ago: 1, is_urgent: false },
  { address: "Dunajská 5, Bratislava",   area: "bratislava", event_type: "price_drop",  change_amount: -22000, days_ago: 3, is_urgent: true  },
  { address: "Štefánikova 9, Bratislava",area: "bratislava", event_type: "sold",        change_amount: null,   days_ago: 6, is_urgent: false },
  { address: "Nálepkova 21, Prešov",     area: "presov", event_type: "new_listing",    change_amount: null,   days_ago: 7,  is_urgent: false },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const area = (searchParams.get("area") ?? "presov").toLowerCase();

  try {
    const supabase = getServiceClient();

    // Skús načítať z Supabase
    const { data, error } = await supabase
      .from("neighborhood_alerts")
      .select("*")
      .ilike("area", `%${area}%`)
      .order("days_ago", { ascending: true })
      .limit(10);

    if (error || !data || data.length === 0) {
      // Fallback na seed dáta — filtruj podľa area alebo vráť presov default
      const filtered = SEED_ALERTS.filter(a =>
        area === "all" || a.area === area || (area !== "kosice" && area !== "bratislava" && a.area === "presov")
      );

      return NextResponse.json({
        alerts: filtered.map((a, i) => ({
          id: String(i + 1),
          address: a.address,
          area: a.area,
          eventType: a.event_type as NeighborAlertEventType,
          changeAmount: a.change_amount ?? undefined,
          daysAgo: a.days_ago,
          isUrgent: a.is_urgent,
        })),
        source: "seed",
      });
    }

    return NextResponse.json({
      alerts: data.map((row: NeighborAlertRow) => ({
        id: row.id,
        address: row.address,
        area: row.area,
        eventType: row.event_type as NeighborAlertEventType,
        changeAmount: row.change_amount ?? undefined,
        daysAgo: row.days_ago,
        isUrgent: row.is_urgent,
      })),
      source: "db",
    });
  } catch (err) {
    console.error("[neighborhood-watch/alerts]", err);
    // Vždy vráť seed dáta ako fallback
    const filtered = SEED_ALERTS.filter(a => a.area === area || a.area === "presov");
    return NextResponse.json({
      alerts: filtered.map((a, i) => ({
        id: String(i + 1),
        address: a.address,
        area: a.area,
        eventType: a.event_type as NeighborAlertEventType,
        changeAmount: a.change_amount ?? undefined,
        daysAgo: a.days_ago,
        isUrgent: a.is_urgent,
      })),
      source: "fallback",
    });
  }
}

type NeighborAlertEventType = 'price_drop' | 'new_listing' | 'sold' | 'price_increase';
type NeighborAlertRow = {
  id: string;
  address: string;
  area: string;
  event_type: string;
  change_amount: number | null;
  days_ago: number;
  is_urgent: boolean;
};
