"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Zap, Eye, Crown, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  NAVIGATION_ITEMS,
  NAV_GROUPS,
  type UserRole,
} from "@/lib/navigation";
import { AI_ASSISTANT_STATUS_ACTIVE } from "@/lib/ai-brand";
import { RadiantSpriteIcon } from "@/components/shared/radiant-sprite-icon";

// ─── Programové balíky (accordion) ───────────────────────────────────────
type ProgramItem = { name: string; href: string };

const PROGRAMS: {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  items: ProgramItem[];
}[] = [
  {
    id: "starter",
    name: "Smart Start",
    icon: Zap,
    color: "#EAB308",
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
    color: "#818CF8",
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
    color: "#5AAF3C",
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
    color: "#60A5FA",
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
      <div className="space-y-1">
        {PROGRAMS.map((prog) => {
          const Icon = prog.icon;
          const isOpen = open === prog.id;
          return (
            <div key={prog.id}>
              <button
                onClick={() => setOpen(isOpen ? null : prog.id)}
                className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200 text-left"
                style={{
                  background:  isOpen ? "rgba(37,99,235,0.10)" : "transparent",
                  border:      isOpen ? "1px solid rgba(37,99,235,0.20)" : "1px solid transparent",
                  color:       isOpen ? "#F0F9FF" : "#94A3B8",
                }}
              >
                <div className="flex items-center gap-3">
                  <Icon size={15} style={{ color: isOpen ? prog.color : "#475569" }} />
                  <span className="text-sm font-bold uppercase tracking-tight">{prog.name}</span>
                </div>
                <ChevronDown
                  size={14}
                  className="transition-transform duration-300"
                  style={{
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    color: isOpen ? "#60A5FA" : "#334155",
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
                    <div className="ml-8 mt-1 mb-2 space-y-0.5 border-l-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      {prog.items.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="block px-4 py-2 text-[11px] font-medium transition-all duration-150 hover:pl-6 rounded-lg hover:bg-white/[0.04]"
                          style={{
                            color: item.name.startsWith("💎") || item.name.startsWith("🛡️")
                              ? "#60A5FA"
                              : "#475569",
                            fontStyle: item.name.startsWith("💎") || item.name.startsWith("🛡️") ? "italic" : "normal",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = item.name.startsWith("💎") || item.name.startsWith("🛡️") ? "#93C5FD" : "#CBD5E1"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = item.name.startsWith("💎") || item.name.startsWith("🛡️") ? "#60A5FA" : "#475569"; }}
                        >
                          {item.name}
                        </Link>
                      ))}
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
      <div className="px-6 py-4" style={{ borderTop: "1px solid #0F1F3D" }}>
        <div className="text-[10px]" style={{ color: "#1E3A5F" }}>© 2025 Revolis.AI</div>
      </div>
    </aside>
  );
}
