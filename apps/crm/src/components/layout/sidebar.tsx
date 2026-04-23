"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Zap, Eye, Crown, ShieldCheck, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  NAVIGATION_ITEMS,
  NAV_GROUPS,
  type UserRole,
} from "@/lib/navigation";
import { AI_ASSISTANT_STATUS_ACTIVE } from "@/lib/ai-brand";
import { RadiantSpriteIcon } from "@/components/shared/radiant-sprite-icon";

// ─── Farebné identity podľa tieru ────────────────────────────────────────
const TIER_STYLES = {
  starter: {
    btnInactive: { color: "#94A3B8", background: "transparent", border: "1px solid transparent" },
    btnActive:   { color: "#F0F9FF", background: "rgba(100,116,139,0.10)", border: "1px solid rgba(100,116,139,0.30)" },
    iconActive:  "#94A3B8",
    iconInactive: "#475569",
    borderLeft:  "rgba(255,255,255,0.05)",
    itemDefault: "#475569",
    itemHover:   "#CBD5E1",
    itemSpecial: null,
    glow: undefined as string | undefined,
  },
  pro: {
    btnInactive: { color: "#94A3B8", background: "transparent", border: "1px solid transparent" },
    btnActive:   { color: "#C7D2FE", background: "rgba(129,140,248,0.10)", border: "1px solid rgba(129,140,248,0.30)" },
    iconActive:  "#818CF8",
    iconInactive: "#475569",
    borderLeft:  "rgba(129,140,248,0.15)",
    itemDefault: "#475569",
    itemHover:   "#C7D2FE",
    itemSpecial: null,
    glow: undefined as string | undefined,
  },
  market: {
    btnInactive: { color: "#94A3B8", background: "transparent", border: "1px solid transparent" },
    btnActive:   { color: "#BBF7D0", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" },
    iconActive:  "#34D399",
    iconInactive: "#475569",
    borderLeft:  "rgba(52,211,153,0.15)",
    itemDefault: "#475569",
    itemHover:   "#6EE7B7",
    itemSpecial: null,
    glow: undefined as string | undefined,
  },
  protocol: {
    btnInactive: { color: "#92400E", background: "transparent", border: "1px solid rgba(202,138,4,0.15)" },
    btnActive:   { color: "#FEF3C7", background: "linear-gradient(135deg, rgba(202,138,4,0.15) 0%, rgba(120,53,15,0.10) 100%)", border: "1px solid rgba(234,179,8,0.40)", boxShadow: "0 0 24px rgba(234,179,8,0.18)" },
    iconActive:  "#EAB308",
    iconInactive: "#92400E",
    borderLeft:  "rgba(234,179,8,0.25)",
    itemDefault: "#92400E",
    itemHover:   "#FDE68A",
    itemSpecial: "#EAB308",
    glow: "0 0 24px rgba(234,179,8,0.18)",
  },
} as const;

// ─── Programové balíky (accordion) ───────────────────────────────────────
type ProgramItem = { name: string; href: string };

const PROGRAMS: {
  id: string;
  name: string;
  icon: React.ElementType;
  tier: keyof typeof TIER_STYLES;
  isHolyGrail?: boolean;
  items: ProgramItem[];
}[] = [
  {
    id: "starter",
    name: "Smart Start",
    icon: Zap,
    tier: "starter",
    items: [
      { name: "Monitoring realitných portálov", href: "/dashboard" },
      { name: "Lead Generation (Standard)",     href: "/leads" },
      { name: "Základná cenová mapa SR",         href: "/dashboard" },
      { name: "Filtrovanie súkromnej inzercie",  href: "/leads" },
      { name: "Notifikácie nových ponúk",        href: "/leads" },
      { name: "Export listov nehnuteľností",     href: "/properties" },
    ],
  },
  {
    id: "pro",
    name: "Active Force",
    icon: Eye,
    tier: "pro",
    items: [
      { name: "AI Asistent 24/7",           href: "/revolis-ai" },
      { name: "Prediktívny deal scoring",   href: "/pipeline" },
      { name: "AI analýza hovorov",         href: "/leads" },
      { name: "Automatické follow-upy",     href: "/tasks" },
      { name: "AI Ghostwriter (správy)",    href: "/revolis-ai" },
      { name: "Kataster radar",             href: "/l99-hub" },
    ],
  },
  {
    id: "market",
    name: "Market Vision",
    icon: Crown,
    tier: "market",
    items: [
      { name: "Owner dashboard + tím",       href: "/dashboard" },
      { name: "Ghost Resurrection",          href: "/leads" },
      { name: "Register závierok (B2B)",     href: "/dashboard" },
      { name: "Predpoveď obratu pre tím",    href: "/dashboard" },
      { name: "Tímový AI mozog",             href: "/revolis-ai" },
      { name: "Manažérske reporty",          href: "/dashboard" },
    ],
  },
  {
    id: "protocol",
    name: "Protocol Authority",
    icon: ShieldCheck,
    tier: "protocol",
    isHolyGrail: true,
    items: [
      { name: '„Za koľko predal sused?"',        href: "/l99-hub" },
      { name: "Kataster Pulse (zmeny LV)",        href: "/l99-hub" },
      { name: "Ghost Resurrection – pokročilý",   href: "/leads" },
      { name: "Diskrétny náborový modul",         href: "/leads" },
      { name: "Neural Pulse Engine (real-time)",  href: "/l99-hub" },
      { name: "💎 Shadow Inventory (off-market)", href: "/l99-hub" },
      { name: "🛡️ Agent Integrity Monitor",      href: "/l99-hub" },
      { name: "Competition Heatmap",              href: "/l99-hub" },
      { name: "L99 Expert Support 24/7",          href: "/billing" },
    ],
  },
];

function ProgramAccordion() {
  const [open, setOpen] = useState<string | null>("protocol");

  return (
    <div className="mb-6">
      <p className="px-4 mb-2 text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: "#1D4ED8" }}>
        Programové balíky
      </p>
      <div className="space-y-1.5">
        {PROGRAMS.map((prog) => {
          const Icon = prog.icon;
          const isOpen = open === prog.id;
          const ts = TIER_STYLES[prog.tier];
          const btnStyle = isOpen ? ts.btnActive : ts.btnInactive;

          return (
            <div key={prog.id}>
              <button
                onClick={() => setOpen(isOpen ? null : prog.id)}
                className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-300 text-left"
                style={btnStyle}
              >
                <div className="flex items-center gap-3">
                  {/* Protocol Authority: Sparkles keď otvorený */}
                  {prog.isHolyGrail && isOpen
                    ? <Sparkles size={15} style={{ color: ts.iconActive }} className="animate-pulse" />
                    : <Icon size={15} style={{ color: isOpen ? ts.iconActive : ts.iconInactive }} />
                  }

                  {/* Protocol Authority: shimmer text keď otvorený */}
                  {prog.isHolyGrail && isOpen ? (
                    <span
                      className="text-sm font-black uppercase tracking-tight animate-shimmer bg-clip-text"
                      style={{
                        backgroundImage: "linear-gradient(90deg, #CA8A04 0%, #FEF08A 40%, #EAB308 60%, #CA8A04 100%)",
                        backgroundSize: "200% auto",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {prog.name}
                    </span>
                  ) : (
                    <span className="text-sm font-bold uppercase tracking-tight">{prog.name}</span>
                  )}
                </div>
                <ChevronDown
                  size={14}
                  className="transition-transform duration-300"
                  style={{
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    color: isOpen ? ts.iconActive : "#334155",
                  }}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div
                      className="ml-8 mt-1 mb-2 space-y-0.5 border-l-2"
                      style={{ borderColor: ts.borderLeft }}
                    >
                      {prog.items.map((item) => {
                        const isSpecial = item.name.startsWith("💎") || item.name.startsWith("🛡️");
                        const defaultColor = isSpecial && ts.itemSpecial ? ts.itemSpecial : ts.itemDefault;
                        const hoverColor = ts.itemHover;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className="block px-4 py-2 text-[11px] font-medium transition-all duration-150 hover:pl-6 rounded-lg"
                            style={{
                              color: defaultColor,
                              fontStyle: isSpecial ? "italic" : "normal",
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = hoverColor; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = defaultColor; }}
                          >
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MenuIcon ─────────────────────────────────────────────────────────────
function MenuIcon({ itemKey, fallback }: { itemKey: string; fallback: string }) {
  const supportsRadiant =
    itemKey === "dashboard" || itemKey === "playbook" || itemKey === "revolis-ai" ||
    itemKey === "leads" || itemKey === "tasks" || itemKey === "pipeline" ||
    itemKey === "properties" || itemKey === "import" || itemKey === "billing" ||
    itemKey === "settings";

  if (!supportsRadiant) return <span className="text-base">{fallback}</span>;
  return <RadiantSpriteIcon icon={itemKey as Parameters<typeof RadiantSpriteIcon>[0]["icon"]} sizeClassName="h-10 w-10" />;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname() ?? "";
  const visibleItems = NAVIGATION_ITEMS.filter((item) => item.visibleFor.includes(role));

  return (
    <aside
      className="flex h-screen w-64 flex-col"
      style={{
        background: "linear-gradient(180deg, #080D1A 0%, #050914 100%)",
        borderRight: "1px solid #0F1F3D",
      }}
    >
      {/* Logo */}
      <div className="px-6 py-5" style={{ borderBottom: "1px solid #0F1F3D" }}>
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
            style={{
              background: "linear-gradient(135deg, #1B4FD8 0%, #22D3EE 100%)",
              boxShadow: "0 0 16px rgba(34,211,238,0.4)",
              color: "#fff",
            }}
          >
            R
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: "#F0F9FF" }}>Revolis.AI</h1>
            <p className="text-[10px]" style={{ color: "#475569" }}>AI platforma pre maklérov</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#22D3EE", boxShadow: "0 0 6px rgba(34,211,238,0.8)" }} />
          <span className="text-[10px]" style={{ color: "#22D3EE" }}>{AI_ASSISTANT_STATUS_ACTIVE}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => {
          const groupItems = visibleItems.filter((item) => group.keys.includes(item.key));
          if (groupItems.length === 0) return null;

          // Sekcia "Programy" dostane accordion namiesto flat linkov
          if (group.title === "Programy") {
            return (
              <div key={group.title} className="mb-6">
                <ProgramAccordion />
                {/* Billing + Porovnanie ostávajú ako normálne linky */}
                <div className="mt-2 space-y-1">
                  {groupItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                      <Link
                        key={item.key}
                        href={item.path}
                        className="flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200"
                        style={
                          isActive
                            ? { background: "linear-gradient(135deg,#0D2137,#1B3A6B)", color: "#67E8F9", borderLeft: "2px solid #22D3EE" }
                            : { color: "#94A3B8", borderLeft: "2px solid transparent" }
                        }
                      >
                        <MenuIcon itemKey={item.key} fallback={item.emoji} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <div key={group.title} className="mb-6">
              <p className="px-4 mb-2 text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: "#1D4ED8" }}>
                {group.title}
              </p>
              <ul className="space-y-1">
                {groupItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.path}
                        className="flex items-center gap-3.5 rounded-xl px-4 py-3 text-base font-medium transition-all duration-200"
                        style={
                          isActive
                            ? { background: "linear-gradient(135deg,#0D2137,#1B3A6B)", color: "#67E8F9", borderLeft: "2px solid #22D3EE", boxShadow: "0 0 20px rgba(34,211,238,0.10)" }
                            : { color: "#94A3B8", borderLeft: "2px solid transparent" }
                        }
                        onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "#0F1F3D"; (e.currentTarget as HTMLElement).style.color = "#CBD5E1"; } }}
                        onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#94A3B8"; } }}
                      >
                        <MenuIcon itemKey={item.key} fallback={item.emoji} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4" style={{ borderTop: "1px solid #0F1F3D" }}>
        <Link
          href="/billing"
          className="flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200 hover:opacity-80"
          style={{
            background: "rgba(202,138,4,0.08)",
            border: "1px solid rgba(202,138,4,0.20)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={14} style={{ color: "#EAB308" }} />
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#EAB308" }}>
              Upgrade Status
            </span>
          </div>
          <span
            className="h-2 w-2 rounded-full animate-ping"
            style={{ background: "#EAB308", boxShadow: "0 0 6px rgba(234,179,8,0.8)" }}
          />
        </Link>
        <div className="mt-2 text-[9px] text-center" style={{ color: "#1E3A5F" }}>© 2025 Revolis.AI</div>
      </div>
    </aside>
  );
}
