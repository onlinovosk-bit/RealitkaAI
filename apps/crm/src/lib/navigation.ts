export type UserRole = "agent" | "owner";

type NavigationItem = {
  key: string;
  label: string;
  path: string;
  emoji: string;
  visibleFor: UserRole[];
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    key: "dashboard",
    label: "Prehľad biznisu",
    path: "/dashboard",
    emoji: "📊",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "playbook",
    label: "AI Plán práce",
    path: "/playbook",
    emoji: "🎯",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "revolis-ai",
    label: "Revolis AI",
    path: "/dashboard/revolis-ai",
    emoji: "✨",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "l99-hub",
    label: "Prediktívna Intel.",
    path: "/l99-hub",
    emoji: "⚡",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "porovnanie-programov",
    label: "Porovnanie programov",
    path: "/porovnanie-programov",
    emoji: "📊",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "rozpis-funkcionalit",
    label: "Rozpis funkcionalít",
    path: "/rozpis-funkcionalit",
    emoji: "📋",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "call-analyzer",
    label: "AI Call Analyzer",
    path: "/call-analyzer",
    emoji: "🎧",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "leads",
    label: "Príležitosti",
    path: "/leads",
    emoji: "🔥",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "tasks",
    label: "Úlohy",
    path: "/tasks",
    emoji: "✅",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "pipeline",
    label: "Stav klientov",
    path: "/pipeline",
    emoji: "📋",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "properties",
    label: "Moje ponuky",
    path: "/properties",
    emoji: "🏠",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "import",
    label: "Nahrať záujemcov",
    path: "/import",
    emoji: "📥",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "forecast",
    label: "Koľko zarobím",
    path: "/forecasting",
    emoji: "📈",
    visibleFor: ["owner"],
  },
  {
    key: "scoring",
    label: "AI hodnotenie",
    path: "/scoring",
    emoji: "🤖",
    visibleFor: ["owner"],
  },
  {
    key: "team",
    label: "Môj tím",
    path: "/team",
    emoji: "👥",
    visibleFor: ["owner"],
  },
  {
    key: "invite",
    label: "Pozvať kolegu",
    path: "/invite",
    emoji: "➕",
    visibleFor: ["owner"],
  },
  // ─── Akvizičné moduly ─────────────────────────────────────────────────
  {
    key: "odhad-magnet",
    label: "Odhad & Lead Magnet",
    path: "/akvizieia/odhad-magnet",
    emoji: "💰",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "radar-okolia",
    label: "Radar Okolia",
    path: "/akvizieia/radar-okolia",
    emoji: "📡",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "listy-z-katastra",
    label: "Listy z Katastra",
    path: "/akvizieia/listy-z-katastra",
    emoji: "📜",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "kupujuci-predajca",
    label: "Kupujúci = Predajca",
    path: "/akvizieia/kupujuci-predajca",
    emoji: "🔄",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "klonovanie-kupujucich",
    label: "Klonovanie Kupujúcich",
    path: "/akvizieia/klonovanie-kupujucich",
    emoji: "🎯",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "zachran-samopredajcu",
    label: "Zachrán Samopredajcu",
    path: "/akvizieia/zachran-samopredajcu",
    emoji: "🚨",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "settings",
    label: "Nastavenia",
    path: "/settings",
    emoji: "⚙️",
    visibleFor: ["agent", "owner"],
  },
  {
    key: "billing",
    label: "Predplatné",
    path: "/billing",
    emoji: "💳",
    visibleFor: ["owner"],
  },
  {
    key: "admin-health",
    label: "SLA & Health",
    path: "/admin/health",
    emoji: "🩺",
    visibleFor: ["owner"],
  },
];

// Skupiny pre sidebar (len vizuálne oddelenie)
export const NAV_GROUPS = [
  {
    title: "Hlavná",
    keys: [
      "dashboard",
      "playbook",
      "revolis-ai",
      "l99-hub",
      "call-analyzer",
      "leads",
      "tasks",
      "pipeline",
      "properties",
      "import",
    ],
  },
  {
    title: "Akvizícia AI",
    keys: [
      "odhad-magnet",
      "radar-okolia",
      "listy-z-katastra",
      "kupujuci-predajca",
      "klonovanie-kupujucich",
      "zachran-samopredajcu",
    ],
  },
  {
    title: "Biznis",
    keys: ["forecast", "scoring", "team", "invite"],
  },
  {
    title: "Programy",
    keys: ["porovnanie-programov", "rozpis-funkcionalit", "billing"],
  },
  {
    title: "Účet",
    keys: ["settings", "admin-health"],
  },
];

/**
 * Mapuje Supabase profile.role → UserRole
 * agent, "" → "agent"
 * manager, admin, owner → "owner"
 */
export function mapProfileRole(profileRole: string | null | undefined): UserRole {
  if (!profileRole) return "agent";
  if (["manager", "admin", "owner"].includes(profileRole)) return "owner";
  return "agent";
}
