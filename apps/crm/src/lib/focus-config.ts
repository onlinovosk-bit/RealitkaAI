// lib/focus-config.ts
// konfigurácia mapovania cieľov na focus sekcie dashboardu

export const goalToFocusMap: Record<string, string> = {
  more_leads: "new-leads", // sekcia pre nové leady
  increase_conversion: "hot-leads", // sekcia pre horúce leady
  better_overview: "pipeline", // pipeline sekcia
  faster_communication: "recent-contacts", // posledné kontakty
  team_management: "team-overview", // tím
  automation: "ai-insights", // AI sekcia
};
