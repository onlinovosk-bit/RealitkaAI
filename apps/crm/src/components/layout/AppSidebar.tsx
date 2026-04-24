"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  type TeamMemberPermissions,
} from "@/types/navigation";

type FounderDemoProgram = "free" | "active_force" | "market_vision" | "protocol_authority";

const FOUNDER_DEMO_PROGRAMS: Array<{ id: FounderDemoProgram; label: string }> = [
  { id: "free", label: "Free" },
  { id: "active_force", label: "Active Force" },
  { id: "market_vision", label: "Market Vision" },
  { id: "protocol_authority", label: "Protocol Authority" },
];

function getDemoVariant(program: FounderDemoProgram): MenuVariant {
  switch (program) {
    case "free":
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
  if (program === "active_force" || program === "market_vision") {
    return items.filter((item) => item.id !== "competition");
  }
  return items;
}

// ─── Typy props ────────────────────────────────────────────────────────────
interface AppSidebarProps {
  uiRole:       string;
  accountTier:  string;
  isInTeam:     boolean;
  appRole?:     string;
  agencyName?:  string;
  userName?:    string;
}

// ─── Smart Start badge (iný label pre 49€ plán) ────────────────────────────
function getPlanDisplayName(
  variant:     MenuVariant,
  accountTier: string
): string {
  if (variant === "agent_solo" && accountTier === "starter") {
    return "Smart Start";
  }
  return VARIANT_THEMES[variant].planLabel;
}

// ─── Jedna nav položka ─────────────────────────────────────────────────────
function NavItemRow({
  item,
  isActive,
  theme,
}: {
  item:     NavItem;
  isActive: boolean;
  theme:    typeof VARIANT_THEMES[MenuVariant];
}) {
  const badgeStyle = item.badge
    ? theme.badgeColors[item.badge.variant]
    : null;

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
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background =
            "rgba(34,211,238,0.10)";
        }
      }}
      onMouseLeave={(e) => {
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
            ? theme.accentBg
            : "rgba(255,255,255,0.05)",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          flexShrink:      0,
          marginTop:       "1px",
          border:          isActive
            ? `1px solid ${theme.accentBorder}30`
            : "1px solid rgba(255,255,255,0.06)",
          transition:      "all 0.12s ease",
        }}
      >
        <NavIcon
          name={item.icon}
          size={15}
          color={
            isActive
              ? theme.accentColor
              : "rgba(148,163,184,0.70)"
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
                ? "#F0F9FF"
                : "rgba(203,213,225,0.92)",
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
      </div>
    </Link>
  );
}

// ─── Sekcia hlavička ───────────────────────────────────────────────────────
function SectionHeader({
  label,
  accentColor,
}: {
  label:       string;
  accentColor: string;
}) {
  return (
    <div
      style={{
        padding:       "12px 12px 6px",
        fontSize:      "10px",
        fontWeight:    "600",
        color:         `${accentColor}80`,
        textTransform: "uppercase",
        letterSpacing: "0.10em",
        marginTop:     "6px",
      }}
    >
      {label}
    </div>
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
  const isFounderDemo = appRole === "founder";

  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [permissions,  setPermissions]  = useState<TeamMemberPermissions>(
    DEFAULT_TEAM_PERMISSIONS
  );
  const [permLoading, setPermLoading]   = useState(false);
  const [demoProgram, setDemoProgram] = useState<FounderDemoProgram>("protocol_authority");

  // Vypočítaj variant
  const variant: MenuVariant = getMenuVariant(uiRole, isInTeam, appRole);
  const demoVariant          = getDemoVariant(demoProgram);
  const renderVariant        = isFounderDemo ? demoVariant : variant;
  const theme                = VARIANT_THEMES[renderVariant];
  const planLabel            = isFounderDemo
    ? FOUNDER_DEMO_PROGRAMS.find((p) => p.id === demoProgram)?.label ?? "Protocol Authority"
    : getPlanDisplayName(variant, accountTier);

  useEffect(() => {
    if (!isFounderDemo || typeof window === "undefined") return;
    const stored = window.localStorage.getItem("founderDemoProgram");
    if (
      stored === "free" ||
      stored === "active_force" ||
      stored === "market_vision" ||
      stored === "protocol_authority"
    ) {
      setDemoProgram(stored);
    }
  }, [isFounderDemo]);

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

  // ─── Obsah sidebaru ──────────────────────────────────────────
  const sidebarContent = (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        height:         "100%",
        background:     "#050914",  // Revolis dark bg
        borderRight:    "1px solid rgba(34,211,238,0.18)",
        overflow:       "hidden",
        backgroundImage: "linear-gradient(180deg, #06122A 0%, #040B1F 100%)",
      }}
    >
      {/* Akcentový top border podľa role */}
      <div
        style={{
          height:     "2px",
          background: `linear-gradient(90deg, rgba(34,211,238,0.95), rgba(59,130,246,0.45), transparent)`,
          flexShrink: 0,
        }}
      />

      {/* Header */}
      <div
        style={{
          padding:      "16px 12px 14px 48px",
          borderBottom: "1px solid rgba(34,211,238,0.16)",
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
              borderRadius: "5px",
              background:  `${theme.accentColor}20`,
              border:      `1px solid ${theme.accentColor}40`,
              display:     "flex",
              alignItems:  "center",
              justifyContent: "center",
              fontSize:    "11px",
              fontWeight:  "700",
              color:       theme.accentColor,
              letterSpacing: "-0.02em",
              boxShadow:   "0 0 14px rgba(34,211,238,0.25)",
            }}
          >
            R
          </div>
          <span
            style={{
              fontSize:   "14px",
              fontWeight: "600",
              color:      "#F0F9FF",
              letterSpacing: "-0.02em",
            }}
          >
            Revolis.AI
          </span>
        </div>

        {/* Greeting + plan badge */}
        <p
          style={{
            fontSize:   "10px",
            color:      `${theme.accentColor}90`,
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
                color: "rgba(148,163,184,0.90)",
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
                      }
                    }}
                    style={{
                      fontSize: "10px",
                      fontWeight: selected ? "700" : "600",
                      borderRadius: "7px",
                      padding: "6px 8px",
                      border: selected
                        ? `1px solid ${theme.accentColor}`
                        : "1px solid rgba(148,163,184,0.25)",
                      background: selected
                        ? `${theme.accentColor}20`
                        : "rgba(15,23,42,0.40)",
                      color: selected ? "#E0F2FE" : "rgba(203,213,225,0.92)",
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
              color:     "rgba(71,85,105,0.80)",
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
          padding:   "8px 10px",
          scrollbarWidth: "none",
        }}
      >
        {SECTION_ORDER.map((sectionKey) => {
          const items = grouped[sectionKey];
          if (!items) return null;
          // Settings sú renderované v footer div
          if (sectionKey === "settings") return null;

          const sectionLabel = SECTION_LABELS[sectionKey];

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
                    background: "rgba(34,211,238,0.14)",
                    margin:     "8px 0",
                  }}
                />
              )}

              {/* Sekcia nadpis */}
              {sectionLabel && (
                <SectionHeader
                  label={sectionLabel}
                  accentColor={theme.accentColor}
                />
              )}

              {/* Položky */}
              {items.map((item) => (
                <NavItemRow
                  key={item.id}
                  item={item}
                  isActive={isActive(item.href)}
                  theme={theme}
                />
              ))}
            </div>
          );
        })}
      </nav>

      {/* Settings separator + user footer */}
      <div
        style={{
          borderTop: "1px solid rgba(34,211,238,0.16)",
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
              background: "rgba(34,211,238,0.06)",
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
                  color:        "#CBD5E1",
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
      {/* ─── Desktop sidebar ─────────────────────────────────── */}
      <aside
        style={{
          width:        "248px",
          minWidth:     "248px",
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
          borderRadius: "8px",
              background:   "linear-gradient(135deg, #06213F 0%, #0B1630 100%)",
              border:       "1px solid rgba(34,211,238,0.45)",
              boxShadow:    "0 0 16px rgba(34,211,238,0.22)",
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
              background:  theme.accentColor,
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
    </>
  );
}
