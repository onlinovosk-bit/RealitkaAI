"use client";

import { useEffect, useRef } from "react";
import { useAIActivityStore, type ActivityType } from "@/store/aiActivityStore";

type LeadEntry = { name: string; id: string };

const FALLBACK_LEADS: LeadEntry[] = [
  { name: "Mária K.", id: "" },
  { name: "Peter N.", id: "" },
  { name: "Jana H.", id: "" },
  { name: "Tomáš B.", id: "" },
  { name: "Eva M.", id: "" },
];

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

let firstCall = true;
function randomDelayMs() {
  if (firstCall) {
    firstCall = false;
    return Math.floor(2000 + Math.random() * 2000);
  }
  return Math.floor(8000 + Math.random() * 7000);
}

export function useMockAIActivity() {
  const addActivity = useAIActivityStore((s) => s.addActivity);
  const setSofiaStatus = useAIActivityStore((s) => s.setSofiaStatus);
  const leadsRef = useRef<LeadEntry[]>(FALLBACK_LEADS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/leads")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        leadsRef.current = data
          .filter((l: { id?: string; name?: string }) => l.id && l.name)
          .slice(0, 10)
          .map((l: { id: string; name: string }) => ({ name: l.name, id: l.id }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const type = randomFrom(TYPES);
      const leadObj = randomFrom(leadsRef.current);

      setSofiaStatus("thinking", "NEXUS AI analyzuje nové signály");
      addActivity({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        lead: leadObj.name,
        leadId: leadObj.id || undefined,
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
      setSofiaStatus("active", "NEXUS AI monitoruje príležitosti");

      timeoutId = setTimeout(tick, randomDelayMs());
    };

    timeoutId = setTimeout(tick, randomDelayMs());

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      setSofiaStatus("idle", "NEXUS AI je pripravená");
    };
  }, [addActivity, setSofiaStatus]);
}
