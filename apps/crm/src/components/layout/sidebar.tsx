"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Role = "owner" | "manager" | "agent";

const menuItems = [
    { label: "Sales", href: "/sales", roles: ["owner", "manager", "agent"] },
  { label: "Prehľad", href: "/dashboard", roles: ["owner", "manager", "agent"] },
  { label: "Kontrola kvality", href: "/qa", roles: ["owner", "manager", "agent"], highlight: true },
  { label: "Riadenie", href: "/management", roles: ["owner", "manager", "agent"] },
  { label: "Predikcie", href: "/forecasting", roles: ["owner", "manager", "agent"] },
  { label: "Fakturácia", href: "/billing", roles: ["owner", "manager"] },
  { label: "Leady", href: "/leads", roles: ["owner", "manager", "agent"] },
  { label: "Obchodný lievik", href: "/pipeline", roles: ["owner", "manager", "agent"] },
  { label: "Párovanie", href: "/matching", roles: ["owner", "manager", "agent"] },
  { label: "AI Scoring", href: "/scoring", roles: ["owner", "manager", "agent"] },
  { label: "AI odporúčania", href: "/recommendations", roles: ["owner", "manager", "agent"] },
  { label: "Komunikácia", href: "/communication", roles: ["owner", "manager", "agent"] },
  { label: "Oslovovanie", href: "/outreach", roles: ["owner", "manager", "agent"] },
  { label: "Integrácie", href: "/integrations", roles: ["owner", "manager", "agent"] },
  { label: "Úlohy", href: "/tasks", roles: ["owner", "manager", "agent"] },
  { label: "Nehnuteľnosti", href: "/properties", roles: ["owner", "manager", "agent"] },
  { label: "Tím", href: "/team", roles: ["owner", "manager"] },
  { label: "Predajný lievik", href: "/sales-funnel", roles: ["owner", "manager"] },
  { label: "Aktivity", href: "/activities", roles: ["owner", "manager", "agent"] },
  { label: "Systém", href: "/system", roles: ["owner", "manager", "agent"] },
  { label: "Nastavenia", href: "/settings", roles: ["owner", "manager", "agent"] },
];

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [menuToast, setMenuToast] = useState<string | null>(null);
  const normalizedRole = (role || "agent").toLowerCase() as Role;
  const visibleItems = menuItems.filter(
    (item) => item.href === "/settings" || item.roles.includes(normalizedRole)
  );

  // DEBUG: vypíš všetky položky menuItems a visibleItems do konzoly
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("[Sidebar DEBUG] menuItems:", menuItems);
    // eslint-disable-next-line no-console
    console.log("[Sidebar DEBUG] visibleItems:", visibleItems);
  }

  function showLockedMessage() {
    setMenuToast("Nastavenia sú dostupné len pre owner rolu.");
    setTimeout(() => {
      setMenuToast(null);
    }, 2200);
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900">Realitka AI</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generátor realitných záujemcov
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4">
        <ul className="space-y-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            const isLocked = item.href === "/settings" && !item.roles.includes(normalizedRole);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={
                    isLocked
                      ? (event) => {
                          event.preventDefault();
                          showLockedMessage();
                        }
                      : undefined
                  }
                  title={isLocked ? "Dostupné len pre owner rolu" : undefined}
                  className={`block rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isLocked
                      ? "text-gray-500 hover:bg-gray-100"
                      : isActive
                        ? "bg-gray-900 text-white border-l-4 border-blue-600"
                        : item.highlight
                          ? "text-blue-700 font-bold hover:bg-blue-50 hover:text-blue-900"
                          : "text-gray-700 hover:bg-gray-100"
                  }`}
                  aria-disabled={isLocked}
                >
                  {item.label}
                  {item.href === "/qa" && (
                    <span className="ml-2 inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">QA</span>
                  )}
                  {isLocked ? " (zamknuté)" : ""}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {menuToast ? (
        <div className="mx-4 mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {menuToast}
        </div>
      ) : null}

      <div className="border-t border-gray-200 px-6 py-4">
        <div className="text-sm font-semibold text-gray-800">
          Fakturácia a predplatné
        </div>
        <div className="mt-1 text-xs text-gray-500">Stripe monetizácia SaaS</div>
      </div>
    </aside>
  );
}
