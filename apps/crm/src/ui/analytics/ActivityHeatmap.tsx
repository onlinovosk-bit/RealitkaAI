"use client";

import { useEffect, useState } from "react";
import { describePeakHour } from "@/services/analytics/heatmap";

interface ActivityHeatmapProps {
  days?: number;
  className?: string;
}

interface HeatmapData {
  hourly: number[];
  peakHour: number;
  total: number;
  days: number;
}

export function ActivityHeatmap({ days = 30, className }: ActivityHeatmapProps) {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/analytics/heatmap?days=${days}`)
      .then((r) => r.json())
      .then((json) => setData(json.result ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div
        className={`rounded-2xl border p-5 ${className ?? ""}`}
        style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
      >
        <p className="text-sm" style={{ color: "#475569" }}>
          Načítavam aktivitu klientov…
        </p>
      </div>
    );
  }

  if (!data || data.hourly.length === 0) return null;

  const max = Math.max(...data.hourly, 1);

  return (
    <div
      className={`rounded-2xl border p-5 ${className ?? ""}`}
      style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "#22D3EE" }}
          >
            Aktivita klientov
          </p>
          <p className="text-xs" style={{ color: "#475569" }}>
            Posledných {data.days} dní · {data.total} interakcií
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold" style={{ color: "#F0F9FF" }}>
            Peak
          </p>
          <p className="text-xs" style={{ color: "#22D3EE" }}>
            {describePeakHour(data.peakHour)}
          </p>
        </div>
      </div>

      {/* Bars */}
      <div className="grid grid-cols-12 gap-[3px]">
        {data.hourly.map((value, hour) => {
          const intensity = value / max;
          const barStyle: React.CSSProperties =
            intensity === 0
              ? { background: "#0F1F3D" }
              : intensity < 0.33
              ? { background: "rgba(34,211,238,0.2)" }
              : intensity < 0.66
              ? { background: "rgba(34,211,238,0.5)" }
              : { background: "#22D3EE" };

          return (
            <div key={hour} className="flex flex-col items-center gap-1">
              <div
                className="w-full rounded-sm"
                style={{ height: 36, ...barStyle }}
                title={`${hour}:00 – ${value} aktivít`}
              />
              {hour % 6 === 0 && (
                <span
                  className="text-[9px]"
                  style={{ color: "#334155" }}
                >
                  {String(hour).padStart(2, "0")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
