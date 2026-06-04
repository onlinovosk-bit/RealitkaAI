"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NavIcon } from "@/components/ui/NavIcon";
import {
  getNavItems,
  SECTION_LABELS,
  VARIANT_THEMES,
  DEFAULT_TEAM_PERMISSIONS,
  type MenuVariant,
  type NavItem,
  type NavSection,
  type TeamMemberPermissions,
} from "@/types/navigation";
import { resolveWorkdeskMenuContext } from "@/lib/menu/resolve-workdesk-menu";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";
import { WorkdeskRail } from "@/components/layout/WorkdeskRail";

type FounderDemoProgram = "free" | "starter" | "active_force" | "market_vision" | "protocol_authority";

const FOUNDER_DEMO_PROGRAMS: Array<{ id: FounderDemoProgram; label: string }> = [
  { id: "free",               label: "Free"               },
  { id: "starter",            label: "Smart Start"        },
  { id: "active_force",       label: "Active Force"       },
  { id: "market_vision",      label: "Market Vision"      },
  { id: "protocol_authority", label: "Protocol Authority" },
];

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

// ─── Workdesk kompaktná položka (secondary sidebar) ───────────────────────
function WorkdeskNavRow({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  const countStyle = item.badge?.variant === "hot"
    ? { background: SLATE_HORIZON.red, color: "#fff" }
    : item.badge?.variant === "team"
      ? { background: SLATE_HORIZON.amber, color: "#fff" }
      : { background: SLATE_HORIZON.brand, color: "#fff" };

  return (
    <Link
      href={item.href}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        padding: "10px 12px",
        borderRadius: 14,
        fontSize: 13,
        fontWeight: 600,
        color: isActive ? SLATE_HORIZON.brandDeep : SLATE_HORIZON.navText,
        background: isActive ? SLATE_HORIZON.soft : "transparent",
        textDecoration: "none",
        transition: "background 0.15s ease, color 0.15s ease",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8, lineHeight: 1.25 }}>
        <NavIcon
          name={item.icon}
          size={18}
          color={isActive ? SLATE_HORIZON.brandDeep : SLATE_HORIZON.muted}
        />
        <b style={{ fontWeight: 700 }}>{item.label}</b>
      </span>
      {item.badge ? (
        <span
          style={{
            minWidth: 24,
            height: 24,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            fontSize: 11,
            fontWeight: 700,
            padding: "0 6px",
            ...countStyle,
          }}
        >
          {item.badge.label === "live" ? "3" : item.badge.label === "hot" ? "17" : item.badge.label.slice(0, 3)}
        </span>
      ) : null}
    </Link>
  );
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
    ? theme.badgeColors[item.badge.variant]
    : null;

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
        borderRadius:    "8px",
        background:      isActive ? theme.accentBg : "transparent",
        textDecoration:  "none",
        borderLeft:      isActive
          ? `2px solid ${theme.accentBorder}`
          : "2px solid transparent",
        marginLeft:      "-2px",
        transition:      "background 0.12s ease, border-color 0.12s ease",
        cursor:          "pointer",
        position:        "relative",
      }}
      onMouseEnter={(e) => {
        setHovered(true);
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = SLATE_HORIZON.soft;
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
            ? SLATE_HORIZON.soft
            : SLATE_HORIZON.bg,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          flexShrink:      0,
          marginTop:       "1px",
          border:          isActive
            ? `1px solid ${SLATE_HORIZON.softBorder}`
            : `1px solid ${SLATE_HORIZON.line}`,
          transition:      "all 0.12s ease",
        }}
      >
        <NavIcon
          name={item.icon}
          size={15}
          color={
            isActive
              ? SLATE_HORIZON.brandDeep
              : SLATE_HORIZON.muted
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
                ? SLATE_HORIZON.brandDeep
                : SLATE_HORIZON.navText,
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
                background:   "rgba(148,163,184,0.12)",
                color:        "rgba(148,163,184,0.70)",
                border:       "0.5px solid rgba(148,163,184,0.20)",
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
            color:         "rgba(148,163,184,0.90)",
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
              color:        "rgba(148,163,184,0.55)",
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
        color:         `${accentColor}80`,
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
          color:      `${accentColor}60`,
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
        borderRadius: "4px",
        background:   `${accentColor}12`,
        border:       `0.5px solid ${accentColor}30`,
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
          background:   "#1E293B",
          borderLeft:   "3px solid #22D3EE",
          borderRadius: "8px",
          padding:      "12px 14px",
          boxShadow:    "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(34,211,238,0.12)",
          minWidth:     "260px",
          maxWidth:     "320px",
        }}
      >
        <span style={{ fontSize: "15px", flexShrink: 0 }}>🔥</span>
        <span
          style={{
            flex:       1,
            fontSize:   "13px",
            fontWeight: "500",
            color:      "#F0F9FF",
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
            color:       "rgba(148,163,184,0.70)",
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

  const menuContext = resolveWorkdeskMenuContext(
    {
      ui_role: uiRole,
      account_tier: accountTier,
      role: appRole,
      team_license_id: isInTeam ? "team" : null,
    },
    { appRole },
  );
  const demoVariant   = getDemoVariant(demoProgram);
  const renderVariant = isFounderDemo ? demoVariant : menuContext.variant;
  const theme         = VARIANT_THEMES[renderVariant];
  const planLabel     = isFounderDemo
    ? FOUNDER_DEMO_PROGRAMS.find((p) => p.id === demoProgram)?.label ?? "Protocol Authority"
    : menuContext.planLabel;

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
        background:     SLATE_HORIZON.sidebarBg,
        borderRight:    `1px solid ${SLATE_HORIZON.line}`,
        overflow:       "hidden",
      }}
    >
      {/* Header — planbox ako v preview */}
      <div
        style={{
          padding:      "18px",
          flexShrink:   0,
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: SLATE_HORIZON.muted,
            marginBottom: 14,
            lineHeight: 1.45,
            marginTop: 0,
          }}
        >
          Predajný kokpit realitnej kancelárie
        </p>

        <div
          style={{
            padding: 16,
            borderRadius: 18,
            background: `linear-gradient(135deg, ${SLATE_HORIZON.bg}, #fff)`,
            border: `1px solid ${SLATE_HORIZON.line}`,
          }}
        >
          <label
            style={{
              display: "block",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontSize: 11,
              color: SLATE_HORIZON.muted,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Program používateľa
          </label>
          {isFounderDemo ? (
            <select
              value={demoProgram}
              onChange={(e) => {
                const next = e.target.value as FounderDemoProgram;
                setDemoProgram(next);
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("founderDemoProgram", next);
                  window.dispatchEvent(new CustomEvent("founderDemoProgramChanged", { detail: next }));
                }
              }}
              style={{
                width: "100%",
                border: `1px solid ${SLATE_HORIZON.line}`,
                background: "#fff",
                borderRadius: 12,
                padding: "11px 12px",
                fontWeight: 600,
                fontSize: 14,
                color: SLATE_HORIZON.deep,
                cursor: "pointer",
              }}
            >
              {FOUNDER_DEMO_PROGRAMS.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.label}
                </option>
              ))}
            </select>
          ) : (
            <div
              style={{
                width: "100%",
                border: `1px solid ${SLATE_HORIZON.line}`,
                background: "#fff",
                borderRadius: 12,
                padding: "11px 12px",
                fontWeight: 600,
                fontSize: 14,
                color: SLATE_HORIZON.deep,
              }}
            >
              {planLabel}
            </div>
          )}
          <p style={{ margin: "10px 0 0", fontSize: 12, color: SLATE_HORIZON.muted, lineHeight: 1.45 }}>
            Menu sa mení podľa zaplateného programu.
          </p>
        </div>

        {agencyName && (
          <p
            style={{
              fontSize: 11,
              color: SLATE_HORIZON.muted,
              marginTop: 10,
              overflow: "hidden",
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
          padding:   "0 18px 8px",
          scrollbarWidth: "none",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: SLATE_HORIZON.muted,
            margin: "0 4px 8px",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          Najdôležitejšie pre RK
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {(grouped.main ?? []).map((item) => (
            <WorkdeskNavRow key={item.id} item={item} isActive={isActive(item.href)} />
          ))}
        </div>

        {SECTION_ORDER.map((sectionKey) => {
          const items = grouped[sectionKey];
          if (!items || sectionKey === "main" || sectionKey === "settings") return null;

          const sectionLabel = SECTION_LABELS[sectionKey];
          const isCollapsed  = collapsedGroups.includes(sectionKey);

          return (
            <div key={sectionKey} style={{ marginTop: 16 }}>
              <div
                style={{
                  height: 1,
                  background: SLATE_HORIZON.line,
                  margin: "8px 0 12px",
                }}
              />
              {sectionLabel ? (
                <SectionHeader
                  label={sectionLabel}
                  accentColor={theme.accentColor}
                  sectionKey={sectionKey}
                  collapsed={isCollapsed}
                  onToggle={toggleGroup}
                />
              ) : null}
              <div
                style={{
                  overflow: "hidden",
                  maxHeight: isCollapsed ? "0px" : "600px",
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
          borderTop: `1px solid ${SLATE_HORIZON.line}`,
          padding:   "10px 10px 12px",
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
              background: SLATE_HORIZON.soft,
            }}
          >
            <div
              style={{
                width:          "26px",
                height:         "26px",
                borderRadius:   "50%",
                background:     `${theme.accentColor}15`,
                border:         `1px solid ${theme.accentColor}30`,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontSize:       "10px",
                fontWeight:     "600",
                color:          theme.accentColor,
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
                  color:        SLATE_HORIZON.deep,
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
                  color:     `${theme.accentColor}70`,
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
      {/* ─── Desktop: rail + sidebar ─────────────────────────── */}
      <div className="hidden lg:flex" style={{ flexShrink: 0, height: "100vh" }}>
        <WorkdeskRail />
        <aside
          style={{
            width: SLATE_HORIZON.sidebarWidth,
            minWidth: SLATE_HORIZON.sidebarWidth,
            height: "100vh",
            position: "sticky",
            top: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {sidebarContent}
        </aside>
      </div>

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
          borderRadius: "8px",
              background:   SLATE_HORIZON.railGradient,
          border:       "1px solid rgba(255,255,255,0.35)",
          boxShadow:    "0 4px 16px rgba(37,99,235,0.25)",
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
              background:  "#fff",
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
              background: "rgba(0,0,0,0.60)",
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
                background:   "rgba(15,20,40,0.90)",
                border:       "1px solid rgba(255,255,255,0.10)",
                color:        "#94A3B8",
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
