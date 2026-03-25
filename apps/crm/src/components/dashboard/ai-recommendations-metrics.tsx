"use client";

import { useEffect, useState } from "react";
import {
  getAiRecommendationMetricsForToday,
  getAiRecommendationMetricsLast7Days,
  type AiRecommendationMetric,
  type AiRecommendationMetricsTimeline,
} from "@/lib/leads-store";

function StatCard({ label, value, color }: { label: string; value: number; color: "green" | "blue" | "orange" | "red" }) {
  const colors = {
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className={`rounded-lg ${colors[color]} p-3`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

export default function AiRecommendationsMetrics() {
  const [todayMetrics, setTodayMetrics] = useState<AiRecommendationMetric>({
    activated: 0,
    deactivated: 0,
    created: 0,
    updated: 0,
    total: 0,
  });
  const [last7DaysMetrics, setLast7DaysMetrics] = useState<AiRecommendationMetricsTimeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const [today, last7Days] = await Promise.all([
          getAiRecommendationMetricsForToday(),
          getAiRecommendationMetricsLast7Days(),
        ]);
        setTodayMetrics(today);
        setLast7DaysMetrics(last7Days);
      } catch (error) {
        console.error("Failed to load AI metrics:", error);
      } finally {
        setIsLoading(false);
      }
    }

    void loadMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-center text-sm text-gray-500">Načítavam metriky...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">AI Odporúčania - Metriky</h2>
        <p className="text-sm text-gray-500">Aktivita odporúčaní za dnešok a minulý týždeň</p>
      </div>

      <div className="mb-6">
        <h3 className="mb-3 text-sm font-medium text-gray-700">Dnešok</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Aktivovaných" value={todayMetrics.activated} color="green" />
          <StatCard label="Deaktivovaných" value={todayMetrics.deactivated} color="red" />
          <StatCard label="Vytvorených" value={todayMetrics.created} color="blue" />
          <StatCard label="Celkom" value={todayMetrics.total} color="orange" />
        </div>
      </div>

      {last7DaysMetrics.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-700">Posledných 7 dní</h3>
          <div className="space-y-2">
            {last7DaysMetrics.map((day, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="text-sm font-medium text-gray-600">{day.date}</span>
                <div className="flex gap-2">
                  {day.activated > 0 && (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                      ✓ {day.activated}
                    </span>
                  )}
                  {day.deactivated > 0 && (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                      ✕ {day.deactivated}
                    </span>
                  )}
                  {day.created > 0 && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                      ◆ {day.created}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {todayMetrics.total === 0 && last7DaysMetrics.length === 0 && (
        <div className="rounded-lg bg-gray-50 p-4 text-center">
          <p className="text-sm text-gray-500">Zatiaľ nie sú žiadne metriky</p>
        </div>
      )}
    </div>
  );
}
