"use client";
import { AiDailyPlanPanel } from "@/components/founder/AiDailyPlanPanel";
import { GrowthChart } from "@/components/founder/GrowthChart";
import { WhyLostPanel } from "@/components/founder/WhyLostPanel";
import type { GrowthDataPoint, WhyLostReason } from "@/lib/founder/types";

const MOCK_GROWTH: GrowthDataPoint[] = [
  { month: "2025-10", revenue: 12000, leads: 34 },
  { month: "2025-11", revenue: 15500, leads: 41 },
  { month: "2025-12", revenue: 18200, leads: 52 },
  { month: "2026-01", revenue: 21000, leads: 58 },
  { month: "2026-02", revenue: 19800, leads: 49 },
  { month: "2026-03", revenue: 24500, leads: 63 },
];

const MOCK_WHY_LOST: WhyLostReason[] = [
  { reason: "Cena príliš vysoká", count: 12, percentage: 40 },
  { reason: "Klient si vybral konkurenciu", count: 8, percentage: 27 },
  { reason: "Zmenil plány", count: 6, percentage: 20 },
  { reason: "Bez odpovede", count: 4, percentage: 13 },
];

export function FounderDashboard() {
  return (
    <div className="space-y-4">
      <AiDailyPlanPanel />
      <GrowthChart data={MOCK_GROWTH} />
      <WhyLostPanel reasons={MOCK_WHY_LOST} />
    </div>
  );
}
