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
        padding:         "8px 10px",
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
            "rgba(255,255,255,0.04)";
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
          width:           "26px",
          height:          "26px",
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
          size={13}
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
              fontSize:    "12px",
              fontWeight:  isActive ? "500" : "400",
              color:       isActive
                ? "#F0F9FF"
                : "rgba(148,163,184,0.85)",
              lineHeight:  "1.3",
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
            fontSize:      "10px",
            color:         "rgba(71,85,105,0.90)",
            marginTop:     "1px",
            lineHeight:    "1.3",
            overflow:      "hidden",
            textOverflow:  "ellipsis",
            whiteSpace:    "nowrap",
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
        padding:       "10px 10px 4px",
        fontSize:      "9px",
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

  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [permissions,  setPermissions]  = useState<TeamMemberPermissions>(
    DEFAULT_TEAM_PERMISSIONS
  );
  const [permLoading, setPermLoading]   = useState(false);

  // Vypočítaj variant
  const variant: MenuVariant = getMenuVariant(uiRole, isInTeam, appRole);
  const theme                = VARIANT_THEMES[variant];
  const planLabel            = getPlanDisplayName(variant, accountTier);

  // Načítaj permissions pre tímového makléra
  useEffect(() => {
    if (variant !== "agent_team") return;
    setPermLoading(true);
    fetch("/api/nav/permissions")
      .then((r) => r.ok ? r.json() : DEFAULT_TEAM_PERMISSIONS)
      .then((data: TeamMemberPermissions) => setPermissions(data))
      .catch(() => setPermissions(DEFAULT_TEAM_PERMISSIONS))
      .finally(() => setPermLoading(false));
  }, [variant]);

  // Nav položky filtrované podľa variantu + permissions
  const navItems = getNavItems(variant, permissions);

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
        borderRight:    "1px solid rgba(255,255,255,0.06)",
        overflow:       "hidden",
      }}
    >
      {/* Akcentový top border podľa role */}
      <div
        style={{
          height:     "2px",
          background: `linear-gradient(90deg, ${theme.accentColor}80, transparent)`,
          flexShrink: 0,
        }}
      />

      {/* Header */}
      <div
        style={{
          padding:      "16px 12px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
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
                    background: "rgba(255,255,255,0.05)",
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
          borderTop: "1px solid rgba(255,255,255,0.06)",
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
              background: "rgba(255,255,255,0.03)",
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
          width:        "220px",
          minWidth:     "220px",
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
          background:   "#0A0F1E",
          border:       `1px solid ${theme.accentColor}30`,
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
              width:     "260px",
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
