import { create } from "zustand";

export type ActivityType =
  | "message_sent"
  | "lead_scored"
  | "pipeline_moved"
  | "property_matched"
  | "followup_scheduled";

export interface AIActivity {
  id: string;
  type: ActivityType;
  lead: string;
  leadId?: string;
  detail: string;
  timestamp: Date;
  channel?: "whatsapp" | "email";
  score?: number;
  delta?: number;
}

interface AIActivityStore {
  activities: AIActivity[];
  latestActivity: AIActivity | null;
  sofiaStatus: "active" | "thinking" | "idle";
  sofiaStatusText: string;
  addActivity: (a: AIActivity) => void;
  removeActivity: (id: string) => void;
  setSofiaStatus: (s: "active" | "thinking" | "idle", text: string) => void;
}

export const useAIActivityStore = create<AIActivityStore>((set) => ({
  activities: [],
  latestActivity: null,
  sofiaStatus: "idle",
  sofiaStatusText: "AI Asistent je pripravený",
  addActivity: (a) =>
    set((state) => ({
      activities: [a, ...state.activities].slice(0, 50),
      latestActivity: a,
    })),
  removeActivity: (id) =>
    set((state) => ({
      activities: state.activities.filter((item) => item.id !== id),
    })),
  setSofiaStatus: (s, text) => set({ sofiaStatus: s, sofiaStatusText: text }),
}));

