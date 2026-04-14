"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAIActivityStore, type ActivityType } from "@/store/aiActivityStore";

const typeStyle: Record<ActivityType, { color: string; icon: string }> = {
  message_sent: { color: "#10b981", icon: "MSG" },
  lead_scored: { color: "#6366f1", icon: "AI" },
  pipeline_moved: { color: "#f59e0b", icon: "PIPE" },
  property_matched: { color: "#8b5cf6", icon: "MATCH" },
  followup_scheduled: { color: "#0ea5e9", icon: "PLAN" },
};

function relativeTime(date: Date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s <= 1) return "práve teraz";
  return `${s}s`;
}

export default function AIPulseSystem() {
  const activities = useAIActivityStore((s) => s.activities.slice(0, 3));
  const removeActivity = useAIActivityStore((s) => s.removeActivity);
  const [visible, setVisible] = useState<string[]>([]);

  const activityIds = useMemo(() => activities.map((a) => a.id), [activities]);

  useEffect(() => {
    setVisible(activityIds);
    const timers = activityIds.map((id) =>
      setTimeout(() => {
        removeActivity(id);
      }, 4000)
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [activityIds, removeActivity]);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {activities
          .filter((a) => visible.includes(a.id))
          .map((a) => {
            const style = typeStyle[a.type];
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="w-[320px] rounded-xl border p-3 pointer-events-auto"
                style={{
                  background: "rgba(15,23,42,0.85)",
                  backdropFilter: "blur(16px)",
                  borderColor: "rgba(255,255,255,0.08)",
                  borderLeft: `3px solid ${style.color}`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-200">
                    <span style={{ color: style.color }} className="mr-1 font-semibold">{style.icon}</span>
                    {a.detail}
                  </p>
                  <span className="text-[10px] text-slate-500">{relativeTime(a.timestamp)}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-400 animate-ping" />
                  <p className="text-xs font-semibold" style={{ color: style.color }}>{a.lead}</p>
                </div>
              </motion.div>
            );
          })}
      </AnimatePresence>
    </div>
  );
}

