import type { UiRole } from "./intelligence-hub";

// ─── Menu varianty ─────────────────────────────────────────────────────────
export type MenuVariant =
  | "agent_solo"      // Smart Start / Active Force (bez tímu)
  | "agent_team"      // Active Force v tíme (MV alebo PA licencia)
  | "owner_vision"    // Market Vision owner
  | "owner_protocol"; // Protocol Authority owner

// ─── Typy ─────────────────────────────────────────────────────────────────
export type NavSection   = "main" | "team" | "tools" | "settings";
export type BadgeVariant = "hot" | "new" | "live" | "pro" | "owner" | "team" | "protocol";

export type NavIcon =
  | "clock"       // Ranný briefing
  | "fire"        // Hot leady
  | "users"       // Klienti / Tím
  | "calendar"    // Úlohy
  | "chart-up"    // Výkonnosť / Forecast
  | "building"    // Ponuky
  | "money"       // Revenue
  | "radar"       // Competition
  | "ghost"       // Ghost Resurrection
  | "invoice"     // Billing
  | "settings"    // Nastavenia
  | "ai"          // AI asistent
  | "team-pulse"  // Tímový pipeline
  | "shield"      // Leady kolegov
  | "lock";       // Permissions

export type NavBadge = {
  label:   string;
  variant: BadgeVariant;
};

export type NavItem = {
  id:             string;
  label:          string;
  sublabel:       string;
  href:           string;
  icon:           NavIcon;
  badge?:         NavBadge;
  section:        NavSection;
  showFor:        MenuVariant[];
  permissionKey?: keyof TeamMemberPermissions;
};

export type TeamMemberPermissions = {
  can_see_team_pipeline:      boolean;
  can_see_colleague_leads:    boolean;
  can_see_team_forecast:      boolean;
  can_see_shared_contacts:    boolean;
  can_export_contacts:        boolean;
  can_delete_leads:           boolean;
  can_edit_colleagues_tasks:  boolean;
};

export const DEFAULT_TEAM_PERMISSIONS: TeamMemberPermissions = {
  can_see_team_pipeline:      true,
  can_see_colleague_leads:    false,
  can_see_team_forecast:      false,
  can_see_shared_contacts:    true,
  can_export_contacts:        true,
  can_delete_leads:           false,
  can_edit_colleagues_tasks:  false,
};

// ─── Dizajn tokeny pre každý variant ──────────────────────────────────────
export type VariantTheme = {
  accentColor:    string; // hlavný akcentový odtieň
  accentBg:       string; // svetlý bg pre aktívnu položku
  accentBorder:   string; // farba ľavého borderou pri active
  badgeColors:    Record<BadgeVariant, { bg: string; color: string; border: string }>;
  planLabel:      string; // zobrazovaný názov plánu
  planIcon:       string; // Unicode symbol pri mene
  roleLabel:      string; // napr. "Maklér" / "Majiteľ"
  greeting:       string; // kontextový pozdrav
};

export const VARIANT_THEMES: Record<MenuVariant, VariantTheme> = {
  // ── AGENT SOLO: Smart Start / Active Force ──────────────────
  agent_solo: {
    accentColor:  "#22D3EE",   // cyan
    accentBg:     "rgba(34,211,238,0.08)",
    accentBorder: "#22D3EE",
    planLabel:    "Active Force",
    planIcon:     "◆",
    roleLabel:    "Maklér",
    greeting:     "Prioritné príležitosti na dnes",
    badgeColors: {
      hot:      { bg: "rgba(239,68,68,0.15)",   color: "#FCA5A5", border: "rgba(239,68,68,0.30)"   },
      new:      { bg: "rgba(34,211,238,0.12)",  color: "#67E8F9", border: "rgba(34,211,238,0.25)"  },
      live:     { bg: "rgba(239,68,68,0.15)",   color: "#FCA5A5", border: "rgba(239,68,68,0.30)"   },
      pro:      { bg: "rgba(99,102,241,0.15)",  color: "#A5B4FC", border: "rgba(99,102,241,0.30)"  },
      owner:    { bg: "rgba(168,85,247,0.15)",  color: "#D8B4FE", border: "rgba(168,85,247,0.30)"  },
      team:     { bg: "rgba(245,158,11,0.15)",  color: "#FCD34D", border: "rgba(245,158,11,0.30)"  },
      protocol: { bg: "rgba(59,130,246,0.15)",  color: "#93C5FD", border: "rgba(59,130,246,0.30)"  },
    },
  },

  // ── AGENT TEAM: Active Force v tíme ─────────────────────────
  agent_team: {
    accentColor:  "#F59E0B",   // amber – tímová energia
    accentBg:     "rgba(245,158,11,0.08)",
    accentBorder: "#F59E0B",
    planLabel:    "Active Force · Tím",
    planIcon:     "◈",
    roleLabel:    "Maklér tímu",
    greeting:     "Denný prehľad tímových priorít",
    badgeColors: {
      hot:      { bg: "rgba(239,68,68,0.15)",   color: "#FCA5A5", border: "rgba(239,68,68,0.30)"   },
      new:      { bg: "rgba(34,211,238,0.12)",  color: "#67E8F9", border: "rgba(34,211,238,0.25)"  },
      live:     { bg: "rgba(239,68,68,0.15)",   color: "#FCA5A5", border: "rgba(239,68,68,0.30)"   },
      pro:      { bg: "rgba(99,102,241,0.15)",  color: "#A5B4FC", border: "rgba(99,102,241,0.30)"  },
      owner:    { bg: "rgba(168,85,247,0.15)",  color: "#D8B4FE", border: "rgba(168,85,247,0.30)"  },
      team:     { bg: "rgba(245,158,11,0.20)",  color: "#FCD34D", border: "rgba(245,158,11,0.40)"  },
      protocol: { bg: "rgba(59,130,246,0.15)",  color: "#93C5FD", border: "rgba(59,130,246,0.30)"  },
    },
  },

  // ── OWNER VISION: Market Vision ─────────────────────────────
  owner_vision: {
    accentColor:  "#06B6D4",   // cyan – elegantný
    accentBg:     "rgba(6,182,212,0.08)",
    accentBorder: "#06B6D4",
    planLabel:    "Market Vision",
    planIcon:     "◉",
    roleLabel:    "Majiteľ kancelárie",
    greeting:     "Prehľad tržieb a výkonnosť pipeline",
    badgeColors: {
      hot:      { bg: "rgba(239,68,68,0.15)",   color: "#FCA5A5", border: "rgba(239,68,68,0.30)"   },
      new:      { bg: "rgba(6,182,212,0.12)",   color: "#67E8F9", border: "rgba(6,182,212,0.25)"   },
      live:     { bg: "rgba(239,68,68,0.15)",   color: "#FCA5A5", border: "rgba(239,68,68,0.30)"   },
      pro:      { bg: "rgba(99,102,241,0.15)",  color: "#A5B4FC", border: "rgba(99,102,241,0.30)"  },
      owner:    { bg: "rgba(6,182,212,0.20)",   color: "#67E8F9", border: "rgba(6,182,212,0.35)"   },
      team:     { bg: "rgba(245,158,11,0.15)",  color: "#FCD34D", border: "rgba(245,158,11,0.30)"  },
      protocol: { bg: "rgba(59,130,246,0.15)",  color: "#93C5FD", border: "rgba(59,130,246,0.30)"  },
    },
  },

  // ── OWNER PROTOCOL: Protocol Authority ──────────────────────
  owner_protocol: {
    accentColor:  "#3B82F6",   // electric blue – premium military
    accentBg:     "rgba(59,130,246,0.10)",
    accentBorder: "#3B82F6",
    planLabel:    "Protocol Authority",
    planIcon:     "⬡",
    roleLabel:    "Protocol Commander",
    greeting:     "Kľúčové trhové upozornenia a príležitosti",
    badgeColors: {
      hot:      { bg: "rgba(239,68,68,0.15)",   color: "#FCA5A5", border: "rgba(239,68,68,0.30)"   },
      new:      { bg: "rgba(59,130,246,0.15)",  color: "#93C5FD", border: "rgba(59,130,246,0.30)"  },
      live:     { bg: "rgba(239,68,68,0.15)",   color: "#FCA5A5", border: "rgba(239,68,68,0.30)"   },
      pro:      { bg: "rgba(99,102,241,0.15)",  color: "#A5B4FC", border: "rgba(99,102,241,0.30)"  },
      owner:    { bg: "rgba(59,130,246,0.20)",  color: "#93C5FD", border: "rgba(59,130,246,0.40)"  },
      team:     { bg: "rgba(245,158,11,0.15)",  color: "#FCD34D", border: "rgba(245,158,11,0.30)"  },
      protocol: { bg: "rgba(59,130,246,0.25)",  color: "#BFDBFE", border: "rgba(59,130,246,0.50)"  },
    },
  },
};

// ─── Všetky nav položky ────────────────────────────────────────────────────
export const ALL_NAV_ITEMS: NavItem[] = [

  // ════════ HLAVNÉ – agent_solo + agent_team ════════

  {
    id: "today",
    label: "Dnes uzavriem",
    sublabel: "Ranný briefing · Hot leady · Priority",
    href: "/dashboard",
    icon: "clock",
    badge: { label: "live", variant: "hot" },
    section: "main",
    showFor: ["agent_solo", "agent_team"],
  },
  {
    id: "pipeline",
    label: "Kto je pripravený kúpiť",
    sublabel: "BRI scoring · Pipeline · AI predikcia",
    href: "/leads",
    icon: "fire",
    badge: { label: "live", variant: "hot" },
    section: "main",
    showFor: ["agent_solo", "agent_team"],
  },
  {
    id: "contacts",
    label: "Moji klienti",
    sublabel: "Kontakty · História · AI odporúčania",
    href: "/contacts",
    icon: "users",
    section: "main",
    showFor: ["agent_solo", "agent_team"],
  },
  {
    id: "shared-contacts",
    label: "Klienti kancelárie",
    sublabel: "Zdieľané kontakty · Tímová databáza",
    href: "/contacts?scope=shared",
    icon: "users",
    section: "main",
    showFor: ["agent_team"],
    permissionKey: "can_see_shared_contacts",
  },
  {
    id: "tasks",
    label: "Čo mám urobiť dnes",
    sublabel: "Úlohy · Follow-upy · AI autopilot",
    href: "/tasks",
    icon: "calendar",
    section: "main",
    showFor: ["agent_solo", "agent_team"],
  },
  {
    id: "performance",
    label: "Koľko som zarobil",
    sublabel: "Výkonnosť · Konverzie · Týždenný report",
    href: "/performance",
    icon: "chart-up",
    section: "main",
    showFor: ["agent_solo", "agent_team"],
  },

  // ════════ TÍMOVÉ – len agent_team ════════

  {
    id: "team-pipeline",
    label: "Kde sú obchody tímu",
    sublabel: "Tímový pipeline · Kolegovia · Dealy",
    href: "/team-pipeline",
    icon: "team-pulse",
    badge: { label: "tím", variant: "team" },
    section: "team",
    showFor: ["agent_team"],
    permissionKey: "can_see_team_pipeline",
  },
  {
    id: "colleague-leads",
    label: "Leady kolegov",
    sublabel: "Kto rieši čo · Spolupráca na dealoch",
    href: "/leads?scope=team",
    icon: "shield",
    section: "team",
    showFor: ["agent_team"],
    permissionKey: "can_see_colleague_leads",
  },
  {
    id: "team-forecast-agent",
    label: "Plán kancelárie tento mesiac",
    sublabel: "Tímový forecast · Ciele · Môj podiel",
    href: "/forecast?scope=team",
    icon: "chart-up",
    section: "team",
    showFor: ["agent_team"],
    permissionKey: "can_see_team_forecast",
  },

  // ════════ NÁSTROJE – agent_solo + agent_team ════════

  {
    id: "properties",
    label: "Moje ponuky",
    sublabel: "Nehnuteľnosti · Listy z katastra",
    href: "/properties",
    icon: "building",
    badge: { label: "export", variant: "new" },
    section: "tools",
    showFor: ["agent_solo", "agent_team"],
  },
  {
    id: "ai-assistant",
    label: "Revolis AI asistent",
    sublabel: "Ghostwriter · Analýza hovorov",
    href: "/revolis-ai",
    icon: "ai",
    section: "tools",
    showFor: ["agent_solo", "agent_team"],
  },

  // ════════ OWNER HLAVNÉ – owner_vision + owner_protocol ════════

  {
    id: "owner-dashboard",
    label: "Kde sú peniaze dnes",
    sublabel: "Revenue pulse · Hot dealy · Alerty",
    href: "/dashboard",
    icon: "money",
    badge: { label: "live", variant: "hot" },
    section: "main",
    showFor: ["owner_vision", "owner_protocol"],
  },
  {
    id: "forecast",
    label: "Koľko zarobíme tento mesiac",
    sublabel: "Revenue forecast · Pipeline · AI predikcia",
    href: "/forecast",
    icon: "chart-up",
    section: "main",
    showFor: ["owner_vision", "owner_protocol"],
  },
  {
    id: "team",
    label: "Môj tím výkonnosť",
    sublabel: "Agent scoring · Aktivity · Ghost Resurrection",
    href: "/team",
    icon: "users",
    section: "main",
    showFor: ["owner_vision", "owner_protocol"],
  },
  {
    id: "team-permissions",
    label: "Čo vidí môj tím",
    sublabel: "Prístupy per maklér · Nastavenia",
    href: "/dashboard/reputation/integrity",
    icon: "lock",
    badge: { label: "nové", variant: "new" },
    section: "main",
    showFor: ["owner_vision", "owner_protocol"],
  },
  {
    id: "hidden-market",
    label: "Skryté príležitosti trhu",
    sublabel: "Ghost Resurrection · Shadow inventory",
    href: "/l99-hub?tab=ghost",
    icon: "ghost",
    section: "main",
    showFor: ["owner_vision", "owner_protocol"],
  },

  // ════════ OWNER PROTOCOL ONLY ════════

  {
    id: "competition",
    label: "Kde konkurencia spí",
    sublabel: "Competition Heatmap · Kataster radar",
    href: "/l99-hub",
    icon: "radar",
    badge: { label: "Protocol", variant: "protocol" },
    section: "main",
    showFor: ["owner_protocol"],
    // POZOR: IBA owner_protocol – NIE owner_vision
  },

  // ════════ SETTINGS – všetky varianty ════════

  {
    id: "billing",
    label: "Predplatné a licencie",
    sublabel: "Plán · Fakturácia · Sloty maklérov",
    href: "/billing",
    icon: "invoice",
    badge: { label: "v2", variant: "new" },
    section: "settings",
    showFor: ["owner_vision", "owner_protocol"],
  },
  {
    id: "settings",
    label: "Nastavenia a integrácie",
    sublabel: "Portály · GDPR · API · Notifikácie",
    href: "/settings",
    icon: "settings",
    section: "settings",
    showFor: ["agent_solo", "agent_team", "owner_vision", "owner_protocol"],
  },
  {
    id: "onboarding-monitor",
    label: "Onboarding Automat",
    sublabel: "Adopcia klientov · At-risk · Emaily",
    href: "/onboarding-monitor",
    icon: "chart-up",
    badge: { label: "automat", variant: "new" },
    section: "settings",
    showFor: ["owner_vision", "owner_protocol"],
  },
];

// ─── Helper funkcie ────────────────────────────────────────────────────────

export function getNavItems(
  variant:     MenuVariant,
  permissions?: Partial<TeamMemberPermissions>
): NavItem[] {
  const perms = { ...DEFAULT_TEAM_PERMISSIONS, ...permissions };
  return ALL_NAV_ITEMS.filter((item) => {
    if (!item.showFor.includes(variant)) return false;
    if (item.permissionKey) return perms[item.permissionKey] === true;
    return true;
  });
}

export function getMenuVariant(
  uiRole:   string,
  isInTeam: boolean,
  appRole?: string
): MenuVariant {
  if (appRole === "founder")              return "owner_protocol";
  if (uiRole === "owner_protocol")        return "owner_protocol";
  if (uiRole === "owner_vision")          return "owner_vision";
  if (uiRole === "agent" && isInTeam)     return "agent_team";
  return "agent_solo";
}

export const SECTION_LABELS: Record<NavSection, string> = {
  main:     "",          // bez hlavičky
  team:     "Môj tím",
  tools:    "Nástroje",
  settings: "Nastavenia",
};
