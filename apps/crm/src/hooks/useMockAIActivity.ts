"use client";

import { useEffect } from "react";
import { useAIActivityStore, type ActivityType } from "@/store/aiActivityStore";

const NAMES = ["Mária K.", "Peter N.", "Jana H.", "Tomáš B.", "Eva M."];
const TYPES: ActivityType[] = [
  "message_sent",
  "lead_scored",
  "pipeline_moved",
  "property_matched",
  "followup_scheduled",
];

function randomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function randomDelayMs() {
  return Math.floor(5000 + Math.random() * 7000);
}

export function useMockAIActivity() {
  const addActivity = useAIActivityStore((s) => s.addActivity);
  const setSofiaStatus = useAIActivityStore((s) => s.setSofiaStatus);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const type = randomFrom(TYPES);
      const lead = randomFrom(NAMES);

      setSofiaStatus("thinking", "Sofia analyzuje nové signály");
      addActivity({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        lead,
        detail:
          type === "message_sent"
            ? "Odoslaný follow-up klientovi"
            : type === "lead_scored"
              ? "Prepočítané AI skóre príležitosti"
              : type === "pipeline_moved"
                ? "Posun v pipeline o jednu fázu"
                : type === "property_matched"
                  ? "Nájdená vhodná nehnuteľnosť"
                  : "Naplánovaný ďalší follow-up",
        timestamp: new Date(),
      });
      setSofiaStatus("active", "Sofia monitoruje príležitosti");

      timeoutId = setTimeout(tick, randomDelayMs());
    };

    timeoutId = setTimeout(tick, randomDelayMs());

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      setSofiaStatus("idle", "Sofia je pripravená");
    };
  }, [addActivity, setSofiaStatus]);
}

