/** Enterprise Blue Workdesk — Preview 11 / Bloomberg-Palantir matte */
export const SLATE_HORIZON = {
  brand: "#2563EB",
  brand2: "#3B82F6",
  brandDeep: "#1D4ED8",
  brandNavy: "#174EA6",
  ink: "#0F172A",
  inkDeep: "#081120",
  deep: "#1E293B",
  muted: "#64748B",
  line: "#EBF0F7",
  soft: "#EEF2FF",
  softBorder: "#C7D7FE",
  bg: "#F8FAFC",
  green: "#10B981",
  greenDark: "#047857",
  money: "#047857",
  amber: "#F97316",
  warning: "#F59E0B",
  red: "#EF4444",
  danger: "#DC2626",
  navText: "#334155",
  sidebarBg: "rgba(255,255,255,0.98)",
  cardBg: "#FFFFFF",
  cardShadow: "0 8px 32px rgba(15,23,42,0.05)",
  cardHoverShadow: "0 12px 40px rgba(37,99,235,0.08)",
  topbarGradient: "linear-gradient(90deg, #1D4ED8 0%, #2563EB 55%, #174EA6 100%)",
  heroGradient: "linear-gradient(125deg, #081120 0%, #0F172A 28%, #174EA6 55%, #1D4ED8 100%)",
  heroAmbient: "radial-gradient(circle at top right, rgba(96,165,250,0.18), transparent 35%)",
  railGradient: "linear-gradient(180deg, #174EA6 0%, #1D4ED8 48%, #081120 100%)",
  railWidth: "76px",
  sidebarWidth: "300px",
  ctaGradient: "linear-gradient(90deg, #F97316, #FB923C)",
  focusRing: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
} as const;

export const WORKDESK_PANEL = {
  background: SLATE_HORIZON.cardBg,
  borderColor: SLATE_HORIZON.line,
  boxShadow: SLATE_HORIZON.cardShadow,
  borderRadius: "20px",
} as const;

export const WORKDESK_INNER_ROW = {
  background: SLATE_HORIZON.bg,
  borderColor: SLATE_HORIZON.line,
} as const;

/** Standard white enterprise card — Preview 11 / Bloomberg light */
export const WORKDESK_CARD = {
  background: "#FFFFFF",
  borderColor: "#E2E8F0",
  boxShadow: "0 8px 30px rgba(15,23,42,0.06)",
  borderRadius: "24px",
} as const;

/** Standard white input */
export const WORKDESK_INPUT = {
  background: "#FFFFFF",
  borderColor: "#E2E8F0",
  color: "#0F172A",
  placeholder: "#94A3B8",
  borderRadius: "12px",
} as const;

/** KPI strip card */
export const WORKDESK_KPI = {
  background: "#FFFFFF",
  borderColor: "#E2E8F0",
  borderRadius: "24px",
  boxShadow: "0 8px 30px rgba(15,23,42,0.06)",
} as const;

/** Premium locked / upgrade overlay */
export const WORKDESK_LOCKED = {
  background: "#FFFFFF",
  borderColor: "#E2E8F0",
  overlay: "linear-gradient(to bottom, transparent 0%, rgba(248,250,252,0.92) 100%)",
  glow: "0 8px 32px rgba(37,99,235,0.1)",
  titleColor: "#0F172A",
  subtitleColor: "#64748B",
} as const;

export const SLATE_HORIZON_BADGES = {
  hot: { bg: "#FEE2E2", color: "#BE123C", border: "#FECACA" },
  new: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  live: { bg: "#FEE2E2", color: "#BE123C", border: "#FECACA" },
  pro: { bg: "#EEF2FF", color: "#4338CA", border: "#C7D2FE" },
  owner: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  team: { bg: "#FFEDD5", color: "#C2410C", border: "#FED7AA" },
  protocol: { bg: "#DBEAFE", color: "#1D4ED8", border: "#93C5FD" },
} as const;
