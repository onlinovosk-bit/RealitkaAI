"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAIActivityStore, type AIActivity, type ActivityType } from "@/store/aiActivityStore";

const typeStyle: Record<ActivityType, { color: string; icon: string }> = {
  message_sent: { color: "#10b981", icon: "MSG" },
  lead_scored: { color: "#6366f1", icon: "AI" },
  pipeline_moved: { color: "#f59e0b", icon: "PIPE" },
  property_matched: { color: "#8b5cf6", icon: "MATCH" },
  followup_scheduled: { color: "#0ea5e9", icon: "PLAN" },
};

const nextSteps: Record<ActivityType, string[]> = {
  message_sent: [
    "Skontroluj otvorenie emailu do 4h",
    "Priprav personalizovanú ponuku nehnuteľností",
    "Naplánuj telefonický follow-up o 48h",
  ],
  lead_scored: [
    "Kontaktuj záujemcu do 24h — vysoké skóre",
    "Spusti AI párovanie nehnuteľností",
    "Zaraď do prioritnej follow-up sekvencie",
  ],
  pipeline_moved: [
    "Aktualizuj interné poznámky k fáze",
    "Priprav dokumenty pre ďalší krok",
    "Informuj tím o posune v pipeline",
  ],
  property_matched: [
    "Ponúkni obhliadku v najbližších 48h",
    "Pošli detailný prehľad nehnuteľnosti",
    "Porovnaj s predchádzajúcimi preferenciami",
  ],
  followup_scheduled: [
    "Priprav agendu a kľúčové body stretnutia",
    "Skontroluj históriu komunikácie pred hovorom",
    "Priprav aktualizovanú cenovú ponuku",
  ],
};

/** Žiadny `Date.now()` pri prvom renderi — len po mounte (hydration-safe). */
function useRelativeTimeLabel(date: Date) {
  const [label, setLabel] = useState("…");
  useEffect(() => {
    const tick = () => {
      const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
      setLabel(s <= 1 ? "práve teraz" : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [date]);
  return label;
}

function PulseCard({
  activity,
  onDismiss,
}: {
  activity: AIActivity;
  onDismiss: (id: string) => void;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const relLabel = useRelativeTimeLabel(activity.timestamp);
  const style = typeStyle[activity.type];
  const steps = nextSteps[activity.type];

  const handleClick = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleNavigate = useCallback(() => {
    if (activity.leadId) {
      router.push(`/leads/${activity.leadId}`);
    }
    onDismiss(activity.id);
  }, [activity.leadId, activity.id, router, onDismiss]);

  const edgeColor = expanded ? `${style.color}60` : "rgba(255,255,255,0.08)";

  return (
    <motion.div
      key={activity.id}
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onClick={handleClick}
      className="w-[340px] rounded-xl p-3 pointer-events-auto cursor-pointer select-none"
      style={{
        background: "rgba(15,23,42,0.92)",
        backdropFilter: "blur(16px)",
        borderTopWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderLeftWidth: 3,
        borderTopStyle: "solid",
        borderRightStyle: "solid",
        borderBottomStyle: "solid",
        borderLeftStyle: "solid",
        borderTopColor: edgeColor,
        borderRightColor: edgeColor,
        borderBottomColor: edgeColor,
        borderLeftColor: style.color,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-200">
          <span style={{ color: style.color }} className="mr-1 font-semibold">
            {style.icon}
          </span>
          {activity.detail}
        </p>
        <span className="text-[10px] text-slate-500">{relLabel}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-green-400 animate-ping" />
          <p className="text-xs font-semibold" style={{ color: style.color }}>
            {activity.lead}
          </p>
        </div>
        {!expanded && (
          <span className="text-[10px] text-slate-500">Klikni pre AI kroky →</span>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                NEXUS AI odporúča
              </p>
              <ul className="space-y-1.5">
                {steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span
                      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                      style={{ background: style.color + "25", color: style.color }}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                {activity.leadId && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigate();
                    }}
                    className="rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors"
                    style={{
                      background: style.color + "20",
                      color: style.color,
                      border: `1px solid ${style.color}40`,
                    }}
                  >
                    Otvoriť záujemcu →
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(activity.id);
                  }}
                  className="rounded-lg px-3 py-1.5 text-[11px] text-slate-500 transition-colors hover:text-slate-300"
                >
                  Zavrieť
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AIPulseSystem() {
  const storeActivities = useAIActivityStore((s) => s.activities);
  const removeActivity = useAIActivityStore((s) => s.removeActivity);
  const activities = useMemo(() => storeActivities.slice(0, 3), [storeActivities]);
  const [visible, setVisible] = useState<string[]>([]);
  /** IDs that should not get an auto-dismiss timer (Set in state was unstable vs. effect deps). */
  const skipTimerRef = useRef<Set<string>>(new Set());

  const activityIds = useMemo(
    () => activities.map((a) => a.id).join(","),
    [activities],
  );

  useEffect(() => {
    const ids = activityIds ? activityIds.split(",") : [];
    setVisible((prev) =>
      prev.length === ids.length && prev.every((v, i) => v === ids[i]) ? prev : ids,
    );
    const timers = ids
      .filter((id) => !skipTimerRef.current.has(id))
      .map((id) =>
        setTimeout(() => {
          removeActivity(id);
        }, 10000),
      );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [activityIds, removeActivity]);

  const handleDismiss = useCallback(
    (id: string) => {
      removeActivity(id);
      skipTimerRef.current.delete(id);
    },
    [removeActivity],
  );

  return (
    <div className="fixed bottom-24 right-4 z-50 space-y-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {activities
          .filter((a) => visible.includes(a.id))
          .map((a) => (
            <PulseCard key={a.id} activity={a} onDismiss={handleDismiss} />
          ))}
      </AnimatePresence>
    </div>
  );
}
