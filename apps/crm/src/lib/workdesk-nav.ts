import type { NavIcon } from "@/types/navigation";

export type WorkdeskRailItem = {
  id: string;
  label: string;
  href: string;
  icon: NavIcon;
  match: (pathname: string) => boolean;
};

export const WORKDESK_RAIL: WorkdeskRailItem[] = [
  {
    id: "money",
    label: "Peniaze",
    href: "/dashboard",
    icon: "money",
    match: (p) => p === "/dashboard" || p.startsWith("/dashboard/"),
  },
  {
    id: "call",
    label: "Volať",
    href: "/contacts",
    icon: "users",
    match: (p) => p.startsWith("/contacts") || p.startsWith("/call-analyzer"),
  },
  {
    id: "leads",
    label: "Leady",
    href: "/leads",
    icon: "fire",
    match: (p) => p.startsWith("/leads") || p.startsWith("/pipeline"),
  },
  {
    id: "tasks",
    label: "Úlohy",
    href: "/tasks",
    icon: "calendar",
    match: (p) => p.startsWith("/tasks") || p.startsWith("/activities"),
  },
  {
    id: "forecast",
    label: "Obrat",
    href: "/forecast",
    icon: "chart-up",
    match: (p) =>
      p.startsWith("/forecast") ||
      p.startsWith("/forecasting") ||
      p.startsWith("/performance"),
  },
];
