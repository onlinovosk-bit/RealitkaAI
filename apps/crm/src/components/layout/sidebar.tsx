"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NAVIGATION_ITEMS,
  NAV_GROUPS,
  type UserRole,
} from "@/lib/navigation";

export default function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname() ?? "";

  const visibleItems = NAVIGATION_ITEMS.filter((item) =>
    item.visibleFor.includes(role)
  );

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900">Revolis.AI</h1>
        <p className="mt-1 text-xs text-gray-500">AI platforma pre maklérov</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {NAV_GROUPS.map((group) => {
          const groupItems = visibleItems.filter((item) =>
            group.keys.includes(item.key)
          );
          if (groupItems.length === 0) return null;

          return (
            <div key={group.title} className="mb-4">
              <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {groupItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.path}
                        className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                          isActive
                            ? "bg-gray-900 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <span className="text-base">{item.emoji}</span>
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

      <div className="border-t border-gray-200 px-6 py-4">
        <div className="text-xs text-gray-400">© 2025 Revolis.AI</div>
      </div>
    </aside>
  );
}
