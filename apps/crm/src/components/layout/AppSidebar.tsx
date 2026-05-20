"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NavIcon } from "@/components/ui/NavIcon";
import {
  getNavItems,
  getMenuVariant,
  SECTION_LABELS,
  VARIANT_THEMES,
  DEFAULT_TEAM_PERMISSIONS,
  type MenuVariant,
  type NavItem,
  type NavSection,
  type BadgeVariant,
  type TeamMemberPermissions,
} from "@/types/navigation";
import {
  getPlanLabel,
  resolveProfilePlanKey,
  type DisplayPlanKey,
} from "@/lib/plan-display";

type FounderDemoProgram = "free" | "starter" | "active_force" | "market_vision" | "protocol_authority";

const FOUNDER_DEMO_PROGRAMS: Array<{ id: FounderDemoProgram; label: string }> = [
  { id: "free",               label: "Free"               },
  { id: "starter",            label: "Smart Start"        },
  { id: "active_force",       label: "Active Force"       },
  { id: "market_vision",      label: "Market Vision"      },
  { id: "protocol_authority", label: "Protocol Authority" },
];

const WORKDESK = {
  brand:       "#2563EB",
  brandDeep:   "#1D4ED8",
  brandSoft:   "#EFF6FF",
  brandBorder: "#BFDBFE",
  text:        "#1E293B",
  muted:       "#64748B",
  line:        "#E2E8F0",
  cta:         "#F97316",
  green:       "#047857",
  red:         "#BE123C",
};

const SLATE_BADGE_COLORS: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  hot:      { bg: "#FEE2E2", color: WORKDESK.red,       border: "#FECACA" },
  new:      { bg: WORKDESK.brandSoft, color: WORKDESK.brandDeep, border: WORKDESK.brandBorder },
  live:     { bg: "#FEE2E2", color: WORKDESK.red,       border: "#FECACA" },
  pro:      { bg: "#FFEDD5", color: "#C2410C",          border: "#FED7AA" },
  owner:    { bg: WORKDESK.brandSoft, color: WORKDESK.brandDeep, border: WORKDESK.brandBorder },
  team:     { bg: "#FEF3C7", color: "#92400E",          border: "#FDE68A" },
  protocol: { bg: WORKDESK.brandSoft, color: WORKDESK.brandDeep, border: WORKDESK.brandBorder },
};

function getDemoVariant(program: FounderDemoProgram): MenuVariant {
  switch (program) {
    case "free":
      return "agent_solo";
    case "starter":
      return "agent_solo";
    case "active_force":
      return "agent_team";
    case "market_vision":
      return "owner_vision";
    case "protocol_authority":
      return "owner_protocol";
    default:
      return "owner_protocol";
  }
}

function filterItemsByDemoProgram(items: NavItem[], program: FounderDemoProgram): NavItem[] {
  if (program === "free") {
    const allowedFreeIds = new Set(["today", "contacts", "settings"]);
    return items.filter((item) => allowedFreeIds.has(item.id));
  }
  if (program === "starter" || program === "active_force" || program === "market_vision") {
    return items.filter((item) => item.id !== "competition");
  }
  return items;
}

// ─── Kontextový subtitle podľa demo programu ──────────────────────────────
function getDemoSubtitle(program: FounderDemoProgram): string {
  switch (program) {
    case "free":
    case "starter":
      return "Základný prehľad";
    case "active_force":
      return "Prioritné príležitosti";
    case "market_vision":
      return "Trhová analytika";
    case "protocol_authority":
      return "Plná kontrola";
    default:
      return "Základný prehľad";
  }
}

// ─── Velocity arrow pre badge hodnoty ─────────────────────────────────────
const VELOCITY_VALUES: Record<string, number> = {
  "owner-dashboard": 23,
  "forecast":        8,
};

function getVelocityArrow(itemId: string): { arrow: string; color: string } | null {
  const val = VELOCITY_VALUES[itemId];
  if (val === undefined) return null;
  if (val > 10)  return { arrow: "↑", color: "#22C55E" };
  if (val >= 5)  return { arrow: "→", color: "#94A3B8" };
  return         { arrow: "↓", color: "#EF4444" };
}

// ─── Keyboard shortcut mapa ────────────────────────────────────────────────
const KB_SHORTCUTS: Record<string, string> = {
  "today":          "G+D",
  "owner-dashboard":"G+D",
  "contacts":       "G+L",
  "pipeline":       "G+L",
  "performance":    "G+R",
  "forecast":       "G+R",
};

// ─── Typy props ────────────────────────────────────────────────────────────
interface AppSidebarProps {
  uiRole:       string;
  accountTier:  string;
  isInTeam:     boolean;
  appRole?:     string;
  agencyName?:  string;
  userName?:    string;
}

// ─── Jedna nav položka ─────────────────────────────────────────────────────
function NavItemRow({
  item,
  isActive,
  theme,
  demoProgram,
}: {
  item:        NavItem;
  isActive:    boolean;
  theme:       typeof VARIANT_THEMES[MenuVariant];
  demoProgram: FounderDemoProgram;
}) {
  const [hovered, setHovered] = useState(false);

  const badgeStyle = item.badge
    ? SLATE_BADGE_COLORS[item.badge.variant]
    : null;
  const accentColor = theme.accentColor === "#F59E0B" ? WORKDESK.cta : WORKDESK.brand;

  const velocity  = getVelocityArrow(item.id);
  const shortcut  = KB_SHORTCUTS[item.id];
  const subtitle  = getDemoSubtitle(demoProgram);

  return (
    <Link
      href={item.href}
      style={{
        display:         "flex",
        alignItems:      "flex-start",
        gap:             "10px",
        padding:         "10px 12px",
        borderRadius:    "14px",
        background:      isActive ? WORKDESK.brandSoft : "transparent",
        textDecoration:  "none",
        borderLeft:      isActive
          ? `2px solid ${accentColor}`
          : "2px solid transparent",
        marginLeft:      "-2px",
        transition:      "background 0.2s ease, border-color 0.2s ease",
        cursor:          "pointer",
        position:        "relative",
      }}
      onMouseEnter={(e) => {
        setHovered(true);
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background =
            "rgba(239,246,255,0.95)";
        }
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }
      }}
    >
      {/* Ikona kontajner */}
      <div
        style={{
          width:           "30px",
          height:          "30px",
          borderRadius:    "6px",
          background:      isActive
            ? "#DBEAFE"
            : "#F8FAFC",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          flexShrink:      0,
          marginTop:       "1px",
          border:          isActive
            ? `1px solid ${WORKDESK.brandBorder}`
            : `1px solid ${WORKDESK.line}`,
          transition:      "all 0.2s ease",
        }}
      >
        <NavIcon
          name={item.icon}
          size={15}
          color={
            isActive
              ? accentColor
              : WORKDESK.muted
          }
        />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display:     "flex",
            alignItems:  "center",
            gap:         "5px",
            flexWrap:    "wrap",
          }}
        >
          <span
            style={{
              fontSize:    "14px",
              fontWeight:  isActive ? "600" : "500",
              color:       isActive
                ? WORKDESK.brandDeep
                : "#334155",
              lineHeight:  "1.35",
              letterSpacing: "-0.01em",
            }}
          >
            {item.label}
          </span>

          {/* Badge */}
          {badgeStyle && item.badge && (
            <span
              style={{
                fontSize:     "9px",
                padding:      "1px 5px",
                borderRadius: "3px",
                background:   badgeStyle.bg,
                color:        badgeStyle.color,
                border:       `0.5px solid ${badgeStyle.border}`,
                fontWeight:   "600",
                flexShrink:   0,
                letterSpacing: "0.02em",
              }}
            >
              {item.badge.label}
            </span>
          )}

          {/* Velocity arrow */}
          {velocity && (
            <span
              style={{
                fontSize:   "11px",
                fontWeight: "700",
                color:      velocity.color,
                flexShrink: 0,
                lineHeight: "1",
              }}
            >
              {velocity.arrow}
            </span>
          )}

          {/* Keyboard shortcut hint – zobrazí sa pri hover */}
          {shortcut && hovered && (
            <span
              style={{
                marginLeft:   "auto",
                fontSize:     "9px",
                padding:      "1px 5px",
                borderRadius: "3px",
                background:   "#F8FAFC",
                color:        WORKDESK.muted,
                border:       `0.5px solid ${WORKDESK.line}`,
                fontWeight:   "600",
                flexShrink:   0,
                letterSpacing: "0.04em",
                fontFamily:   "monospace",
              }}
            >
              {shortcut}
            </span>
          )}
        </div>

        <p
          style={{
            fontSize:      "12px",
            color:         WORKDESK.muted,
            marginTop:     "2px",
            lineHeight:    "1.3",
            overflow:      "hidden",
            textOverflow:  "ellipsis",
            display:       "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            whiteSpace:    "normal",
          }}
        >
          {item.sublabel}
        </p>

        {/* Kontextový subtitle – len pri aktívnej položke */}
        {isActive && (
          <p
            style={{
              fontSize:     "10px",
              color:        WORKDESK.muted,
              marginTop:    "3px",
              lineHeight:   "1.2",
              overflow:     "hidden",
              textOverflow: "ellipsis",
              whiteSpace:   "nowrap",
              maxWidth:     "160px",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Sekcia hlavička (collapsible) ─────────────────────────────────────────
function SectionHeader({
  label,
  accentColor,
  sectionKey,
  collapsed,
  onToggle,
}: {
  label:       string;
  accentColor: string;
  sectionKey:  NavSection;
  collapsed:   boolean;
  onToggle:    (key: NavSection) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(sectionKey)}
      style={{
        display:       "flex",
        alignItems:    "center",
        justifyContent: "space-between",
        width:         "100%",
        padding:       "12px 12px 6px",
        fontSize:      "10px",
        fontWeight:    "600",
        color:         WORKDESK.muted,
        textTransform: "uppercase" as const,
        letterSpacing: "0.10em",
        marginTop:     "6px",
        background:    "transparent",
        border:        "none",
        cursor:        "pointer",
      }}
    >
      <span>{label}</span>
      <span
        style={{
          fontSize:   "9px",
          color:      accentColor,
          transition: "transform 0.2s ease",
          display:    "inline-block",
          transform:  collapsed ? "rotate(-90deg)" : "rotate(0deg)",
        }}
      >
        ▾
      </span>
    </button>
  );
}

// ─── Plan badge v headeri ──────────────────────────────────────────────────
function PlanBadge({
  label,
  icon,
  accentColor,
}: {
  label:       string;
  icon:        string;
  accentColor: string;
}) {
  return (
    <div
      style={{
        display:      "inline-flex",
        alignItems:   "center",
        gap:          "5px",
        padding:      "3px 8px",
        borderRadius: "999px",
        background:   WORKDESK.brandSoft,
        border:       `0.5px solid ${WORKDESK.brandBorder}`,
        marginTop:    "5px",
      }}
    >
      <span style={{ fontSize: "11px", color: accentColor }}>{icon}</span>
      <span
        style={{
          fontSize:      "10px",
          fontWeight:    "500",
          color:         accentColor,
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Revenue Toast ─────────────────────────────────────────────────────────
function RevenueToast({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position:   "fixed",
        bottom:     "24px",
        right:      "24px",
        zIndex:     9999,
        transition: "opacity 0.35s ease, transform 0.35s ease",
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(12px)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "10px",
          background:   "#FFFFFF",
          borderLeft:   `3px solid ${WORKDESK.cta}`,
          borderRadius: "12px",
          padding:      "12px 14px",
          boxShadow:    "0 16px 40px rgba(30,41,59,0.14), 0 0 0 1px rgba(226,232,240,0.9)",
          minWidth:     "260px",
          maxWidth:     "320px",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={WORKDESK.cta}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
          aria-hidden="true"
        >
          <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
        <span
          style={{
            flex:       1,
            fontSize:   "13px",
            fontWeight: "500",
            color:      WORKDESK.text,
            lineHeight: "1.4",
          }}
        >
          Hot Alert: Ján Kováč — skóre 91
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background:  "transparent",
            border:      "none",
            color:       WORKDESK.muted,
            fontSize:    "16px",
            lineHeight:  "1",
            cursor:      "pointer",
            padding:     "0 2px",
            flexShrink:  0,
          }}
          aria-label="Zavrieť notifikáciu"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ─── Hlavný komponent ──────────────────────────────────────────────────────
export default function AppSidebar({
  uiRole,
  accountTier,
  isInTeam,
  appRole,
  agencyName,
  userName,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const isFounderDemo = appRole === "founder";

  const [mobileOpen,      setMobileOpen]      = useState(false);
  const [permissions,     setPermissions]     = useState<TeamMemberPermissions>(
    DEFAULT_TEAM_PERMISSIONS
  );
  const [permLoading,     setPermLoading]     = useState(false);
  const [demoProgram,     setDemoProgram]     = useState<FounderDemoProgram>("protocol_authority");
  const [toastVisible,    setToastVisible]    = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<NavSection[]>([]);
  const gKeyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gPressedRef = useRef(false);

  // Vypočítaj variant a plán z profilu (nie len z menu variantu)
  const variant: MenuVariant = getMenuVariant(uiRole, isInTeam, appRole, accountTier);
  const demoVariant          = getDemoVariant(demoProgram);
  const renderVariant        = isFounderDemo ? demoVariant : variant;
  const theme                = VARIANT_THEMES[renderVariant];
  const profilePlanKey: DisplayPlanKey = resolveProfilePlanKey({
    account_tier: accountTier,
    ui_role:      uiRole,
  });
  const planLabel = isFounderDemo
    ? FOUNDER_DEMO_PROGRAMS.find((p) => p.id === demoProgram)?.label ?? "Protocol Authority"
    : getPlanLabel(profilePlanKey);
  const showProtocolBadge = isFounderDemo
    ? demoProgram === "protocol_authority"
    : profilePlanKey === "protocol_authority";

  // Načítaj demo program z localStorage
  useEffect(() => {
    if (!isFounderDemo || typeof window === "undefined") return;
    const stored = window.localStorage.getItem("founderDemoProgram");
    if (
      stored === "free" ||
      stored === "starter" ||
      stored === "active_force" ||
      stored === "market_vision" ||
      stored === "protocol_authority"
    ) {
      setDemoProgram(stored);
    }
  }, [isFounderDemo]);

  // Načítaj stav zbalených skupín z localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("sidebarCollapsed");
      if (raw) {
        const parsed = JSON.parse(raw) as NavSection[];
        setCollapsedGroups(parsed);
      }
    } catch {
      // ignoruj
    }
  }, []);

  // Toast — zobraz 3s po načítaní, zmizne po 4s
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setToastVisible(true);
      const hideTimer = setTimeout(() => {
        setToastVisible(false);
      }, 4000);
      return () => clearTimeout(hideTimer);
    }, 3000);
    return () => clearTimeout(showTimer);
  }, []);

  // Keyboard shortcuts: G+D, G+L, G+R
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "g" || e.key === "G") {
        gPressedRef.current = true;
        if (gKeyRef.current) clearTimeout(gKeyRef.current);
        gKeyRef.current = setTimeout(() => {
          gPressedRef.current = false;
        }, 500);
        return;
      }

      if (gPressedRef.current) {
        gPressedRef.current = false;
        if (gKeyRef.current) clearTimeout(gKeyRef.current);

        switch (e.key.toLowerCase()) {
          case "d":
            router.push("/dashboard");
            break;
          case "l":
            router.push("/contacts");
            break;
          case "r":
            router.push("/analytics");
            break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Načítaj permissions pre tímového makléra
  useEffect(() => {
    if (renderVariant !== "agent_team") return;
    setPermLoading(true);
    fetch("/api/nav/permissions")
      .then((r) => r.ok ? r.json() : DEFAULT_TEAM_PERMISSIONS)
      .then((data: TeamMemberPermissions) => setPermissions(data))
      .catch(() => setPermissions(DEFAULT_TEAM_PERMISSIONS))
      .finally(() => setPermLoading(false));
  }, [renderVariant]);

  // Toggle collapsible group
  const toggleGroup = useCallback((sectionKey: NavSection) => {
    setCollapsedGroups((prev) => {
      const next = prev.includes(sectionKey)
        ? prev.filter((k) => k !== sectionKey)
        : [...prev, sectionKey];
      if (typeof window !== "undefined") {
        window.localStorage.setItem("sidebarCollapsed", JSON.stringify(next));
      }
      return next;
    });
  }, []);

  // Nav položky filtrované podľa variantu + permissions
  const navItems = filterItemsByDemoProgram(
    getNavItems(renderVariant, permissions),
    demoProgram
  );

  // Zoskup do sekcií v správnom poradí
  const SECTION_ORDER: NavSection[] = ["main", "team", "tools", "settings"];
  const grouped: Partial<Record<NavSection, NavItem[]>> = {};
  SECTION_ORDER.forEach((s) => {
    const items = navItems.filter((i) => i.section === s);
    if (items.length) grouped[s] = items;
  });

  // Aktívna položka
  const isActive = useCallback(
    (href: string): boolean => {
      if (!pathname) return false;
      const base = href.split("?")[0];
      if (base === "/dashboard") return pathname === "/dashboard";
      return pathname.startsWith(base);
    },
    [pathname]
  );

  // Zatvor mobile menu pri navigate
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // ─── Obsah sidebaru ──────────────────────────────────
  const sidebarContent = (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        height:         "100%",
        background:     "rgba(255,255,255,0.96)",
        borderRight:    `1px solid ${WORKDESK.line}`,
        overflow:       "hidden",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Akcentový top border podľa role */}
      <div
        style={{
          height:     "2px",
          background: `linear-gradient(90deg, ${WORKDESK.brand}, ${WORKDESK.cta}, transparent)`,
          flexShrink: 0,
        }}
      />

      {/* Header */}
      <div
        style={{
          padding:      "18px 18px 16px",
          borderBottom: `1px solid ${WORKDESK.line}`,
          flexShrink:   0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display:     "flex",
            alignItems:  "center",
            gap:         "8px",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              width:       "24px",
              height:      "24px",
              borderRadius: "8px",
              background:  WORKDESK.brandSoft,
              border:      `1px solid ${WORKDESK.brandBorder}`,
              display:     "flex",
              alignItems:  "center",
              justifyContent: "center",
              fontSize:    "11px",
              fontWeight:  "700",
              color:       WORKDESK.brandDeep,
              letterSpacing: "-0.02em",
            }}
          >
            R
          </div>
          <span
            style={{
              fontSize:   "14px",
              fontWeight: "600",
              color:      WORKDESK.text,
              letterSpacing: "-0.02em",
            }}
          >
            Revolis.AI
          </span>

          {/* Protocol badge — len skutočný PA plán alebo founder demo */}
          {showProtocolBadge && (
            <span
              className="rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold text-orange-700"
              style={{ letterSpacing: "0.06em" }}
            >
              PROTOCOL
            </span>
          )}

          {isFounderDemo && (
            <span
              style={{
                fontSize: "9px",
                fontWeight: "700",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                borderRadius: "9999px",
                padding: "2px 7px",
                color: "#FFFFFF",
                background: WORKDESK.cta,
                border: "1px solid #FDBA74",
              }}
            >
              Demo
            </span>
          )}
        </div>

        {/* Greeting + plan badge */}
        <p
          style={{
            fontSize:   "10px",
            color:      WORKDESK.muted,
            marginBottom: "4px",
            fontWeight: "500",
            letterSpacing: "0.02em",
          }}
        >
          {theme.greeting}
        </p>

        <PlanBadge
          label={planLabel}
          icon={theme.planIcon}
          accentColor={theme.accentColor}
        />

        {isFounderDemo && (
          <div style={{ marginTop: "8px" }}>
            <p
              style={{
                fontSize: "10px",
                color: WORKDESK.muted,
                marginBottom: "6px",
                fontWeight: "600",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Founder Demo Mode
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {FOUNDER_DEMO_PROGRAMS.map((program) => {
                const selected = demoProgram === program.id;
                return (
                  <button
                    key={program.id}
                    type="button"
                    onClick={() => {
                      setDemoProgram(program.id);
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem("founderDemoProgram", program.id);
                        window.dispatchEvent(new CustomEvent("founderDemoProgramChanged", { detail: program.id }));
                      }
                    }}
                    style={{
                      fontSize: "10px",
                      fontWeight: selected ? "700" : "600",
                      borderRadius: "7px",
                      padding: "6px 8px",
                      border: selected
                        ? `1px solid ${WORKDESK.brandBorder}`
                        : `1px solid ${WORKDESK.line}`,
                      background: selected
                        ? WORKDESK.brandSoft
                        : "#FFFFFF",
                      color: selected ? WORKDESK.brandDeep : "#334155",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    {program.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Agency name */}
        {agencyName && (
          <p
            style={{
              fontSize:  "10px",
              color:     WORKDESK.muted,
              marginTop: "6px",
              overflow:  "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {agencyName}
          </p>
        )}
      </div>

      {/* Nav položky */}
      <nav
        style={{
          flex:      1,
          overflowY: "auto",
          padding:   "10px 14px",
          scrollbarWidth: "none",
        }}
      >
        {SECTION_ORDER.map((sectionKey) => {
          const items = grouped[sectionKey];
          if (!items) return null;
          // Settings sú renderované v footer div
          if (sectionKey === "settings") return null;

          const sectionLabel = SECTION_LABELS[sectionKey];
          const isCollapsed  = collapsedGroups.includes(sectionKey);

          return (
            <div
              key={sectionKey}
              style={{
                marginBottom: "4px",
              }}
            >
              {/* Oddeľovač pred tools a team */}
              {(sectionKey === "tools" || sectionKey === "team") && (
                <div
                  style={{
                    height:     "1px",
                    background: WORKDESK.line,
                    margin:     "8px 0",
                  }}
                />
              )}

              {/* Sekcia nadpis – collapsible len ak má label */}
              {sectionLabel ? (
                <SectionHeader
                  label={sectionLabel}
                  accentColor={theme.accentColor}
                  sectionKey={sectionKey}
                  collapsed={isCollapsed}
                  onToggle={toggleGroup}
                />
              ) : null}

              {/* Položky s smooth max-height transition */}
              <div
                style={{
                  overflow:   "hidden",
                  maxHeight:  isCollapsed ? "0px" : "600px",
                  transition: "max-height 0.25s ease",
                }}
              >
                {items.map((item) => (
                  <NavItemRow
                    key={item.id}
                    item={item}
                    isActive={isActive(item.href)}
                    theme={theme}
                    demoProgram={demoProgram}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Settings separator + user footer */}
      <div
        style={{
          borderTop: `1px solid ${WORKDESK.line}`,
          padding:   "10px 14px 12px",
          flexShrink: 0,
        }}
      >
        {/* Settings položky */}
        {grouped.settings?.map((item) => (
          <NavItemRow
            key={item.id}
            item={item}
            isActive={isActive(item.href)}
            theme={theme}
            demoProgram={demoProgram}
          />
        ))}

        {/* User info */}
        {userName && (
          <div
            style={{
              display:    "flex",
              alignItems: "center",
              gap:        "8px",
              marginTop:  "8px",
              padding:    "6px 8px",
              borderRadius: "8px",
              background: WORKDESK.brandSoft,
            }}
          >
            <div
              style={{
                width:          "26px",
                height:         "26px",
                borderRadius:   "50%",
                background:     "#FFFFFF",
                border:         `1px solid ${WORKDESK.brandBorder}`,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontSize:       "10px",
                fontWeight:     "600",
                color:          WORKDESK.brandDeep,
                flexShrink:     0,
                letterSpacing:  "0.02em",
              }}
            >
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  fontSize:     "11px",
                  fontWeight:   "500",
                  color:        WORKDESK.text,
                  overflow:     "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace:   "nowrap",
                  lineHeight:   "1.3",
                }}
              >
                {userName}
              </p>
              <p
                style={{
                  fontSize:  "10px",
                  color:     WORKDESK.muted,
                  marginTop: "1px",
                  lineHeight: "1.2",
                }}
              >
                {theme.roleLabel}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ─── Desktop sidebar ─────────────────────────────────── */}
      <aside
        style={{
          width:        "300px",
          minWidth:     "300px",
          height:       "100vh",
          position:     "sticky",
          top:          0,
          flexShrink:   0,
          display:      "flex",
          flexDirection: "column",
        }}
        className="hidden lg:flex"
      >
        {sidebarContent}
      </aside>

      {/* ─── Mobile hamburger tlačidlo ────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden"
        style={{
          position:     "fixed",
          top:          "14px",
          left:         "14px",
          zIndex:       60,
          width:        "36px",
          height:       "36px",
          borderRadius: "10px",
          background:   WORKDESK.brand,
          border:       `1px solid ${WORKDESK.brandDeep}`,
          boxShadow:    "0 8px 24px rgba(37,99,235,0.25)",
          display:      "flex",
          flexDirection: "column",
          alignItems:   "center",
          justifyContent: "center",
          gap:          "4px",
          cursor:       "pointer",
        }}
        aria-label="Otvoriť menu"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width:       i === 1 ? "12px" : "16px",
              height:      "1.5px",
              background:  "#FFFFFF",
              borderRadius: "1px",
              transition:  "width 0.2s ease",
            }}
          />
        ))}
      </button>

      {/* ─── Mobile drawer ────────────────────────────────────── */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset:    0,
            zIndex:   100,
            display:  "flex",
          }}
        >
          {/* Overlay */}
          <div
            style={{
              position:   "absolute",
              inset:      0,
              background: "rgba(15,23,42,0.45)",
              backdropFilter: "blur(2px)",
            }}
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer panel */}
          <aside
            style={{
              position:  "relative",
              width:     "288px",
              height:    "100%",
              zIndex:    1,
              display:   "flex",
              flexDirection: "column",
            }}
          >
            {/* Zavrieť tlačidlo */}
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                position:     "absolute",
                top:          "14px",
                right:        "-44px",
                width:        "36px",
                height:       "36px",
                borderRadius: "50%",
                background:   "#FFFFFF",
                border:       `1px solid ${WORKDESK.line}`,
                color:        WORKDESK.muted,
                fontSize:     "18px",
                lineHeight:   "1",
                cursor:       "pointer",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                zIndex:       2,
              }}
              aria-label="Zavrieť menu"
            >
              ×
            </button>

            <div style={{ height: "100%" }}>
              {sidebarContent}
            </div>
          </aside>
        </div>
      )}

      {/* ─── Revenue Toast notifikácia ────────────────────────── */}
      <RevenueToast
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </>
  );
}
