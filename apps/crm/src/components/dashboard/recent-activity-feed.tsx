"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SLATE_HORIZON, WORKDESK_PANEL } from "@/lib/slate-horizon-theme";

type Activity = {
  id: string;
  type: string;
  title?: string;
  text: string;
  actor_name?: string;
  lead_id?: string | null;
  created_at?: string;
};

function dot(type: string) {
  if (type === "Email") return "bg-blue-400";
  if (type === "Obhliadka") return "bg-emerald-400";
  if (type === "Telefonát" || type === "Telefonat") return "bg-amber-400";
  if (type === "Pipeline") return "bg-violet-400";
  if (type === "AI Scoring") return "bg-violet-500";
  return "bg-gray-400";
}

function formatType(type: string) {
  if (type === "Pipeline") return "Stav klientov";
  return type;
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "práve teraz";
  if (diff < 3600) return `pred ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `pred ${Math.floor(diff / 3600)} hod`;
  return `pred ${Math.floor(diff / 86400)} dňami`;
}

export default function RecentActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activities?limit=8")
      .then(r => r.json())
      .then(data => {
        if (data.activities) setActivities(data.activities);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="rounded-[20px] border p-4 md:p-5"
      style={{
        background: WORKDESK_PANEL.background,
        borderColor: WORKDESK_PANEL.borderColor,
        boxShadow: WORKDESK_PANEL.boxShadow,
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold" style={{ color: SLATE_HORIZON.deep }}>
            Posledné signály
          </h2>
          <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
            Čo sa hýbe v pipeline — kontakt, obhliadka, AI scoring.
          </p>
        </div>
        <Link
          href="/activities"
          className={`flex min-h-11 cursor-pointer items-center text-xs transition-colors duration-200 hover:opacity-80 ${SLATE_HORIZON.focusRing}`}
          style={{ color: SLATE_HORIZON.brandDeep }}
        >
          Všetky →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: SLATE_HORIZON.line }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 rounded w-3/4" style={{ background: SLATE_HORIZON.soft }} />
                <div className="h-2.5 rounded w-1/2" style={{ background: SLATE_HORIZON.soft }} />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>Zatiaľ žiadne aktivity.</p>
      ) : (
        <div className="space-y-3">
          {activities.map(act => (
            <div key={act.id} className="flex items-start gap-3">
              <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot(act.type)}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold" style={{ color: SLATE_HORIZON.navText }}>
                    {formatType(act.type)}
                  </span>
                  {act.actor_name && act.actor_name !== "Systém" && (
                    <span className="text-xs" style={{ color: SLATE_HORIZON.muted }}>{act.actor_name}</span>
                  )}
                  <span className="text-xs" style={{ color: SLATE_HORIZON.muted }}>{timeAgo(act.created_at)}</span>
                </div>
                <p className="text-xs truncate mt-0.5" style={{ color: SLATE_HORIZON.muted }}>{act.text}</p>
                {act.lead_id && (
                  <Link
                    href={`/leads/${act.lead_id}`}
                    className="cursor-pointer text-xs transition-colors duration-200 hover:opacity-80"
                    style={{ color: SLATE_HORIZON.brandDeep }}
                  >
                    Otvoriť →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
