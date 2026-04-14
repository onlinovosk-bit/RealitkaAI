"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NAVIGATION_ITEMS,
  NAV_GROUPS,
  type UserRole,
} from "@/lib/navigation";
import { AI_ASSISTANT_STATUS_ACTIVE } from "@/lib/ai-brand";
import { RadiantSpriteIcon } from "@/components/shared/radiant-sprite-icon";

function MenuIcon({ itemKey, fallback }: { itemKey: string; fallback: string }) {
  const supportsRadiant =
    itemKey === "dashboard" ||
    itemKey === "playbook" ||
    itemKey === "revolis-ai" ||
    itemKey === "leads" ||
    itemKey === "tasks" ||
    itemKey === "pipeline" ||
    itemKey === "properties" ||
    itemKey === "import" ||
    itemKey === "billing" ||
    itemKey === "settings";

  if (!supportsRadiant) {
    return <span className="text-base">{fallback}</span>;
  }

  return <RadiantSpriteIcon icon={itemKey as Parameters<typeof RadiantSpriteIcon>[0]["icon"]} sizeClassName="h-10 w-10" />;
}

export default function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname() ?? "";
  const visibleItems = NAVIGATION_ITEMS.filter((item) =>
    item.visibleFor.includes(role)
  );

  return (
    <aside
      className="flex h-screen w-64 flex-col"
      style={{
        background: 'linear-gradient(180deg, #080D1A 0%, #050914 100%)',
        borderRight: '1px solid #0F1F3D',
      }}
    >
      {/* Logo */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid #0F1F3D' }}>
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, #1B4FD8 0%, #22D3EE 100%)',
              boxShadow: '0 0 16px rgba(34,211,238,0.4)',
              color: '#fff',
            }}
          >
            R
          </div>
          <div>
            <h1
              className="text-base font-bold"
              style={{ color: '#F0F9FF' }}
            >
              Revolis.AI
            </h1>
            <p className="text-[10px]" style={{ color: '#475569' }}>
              AI platforma pre maklérov
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: '#22D3EE', boxShadow: '0 0 6px rgba(34,211,238,0.8)' }}
          />
          <span className="text-[10px]" style={{ color: '#22D3EE' }}>
            {AI_ASSISTANT_STATUS_ACTIVE}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => {
          const groupItems = visibleItems.filter((item) =>
            group.keys.includes(item.key)
          );
          if (groupItems.length === 0) return null;

          return (
            <div key={group.title} className="mb-6">
              <p
                className="px-4 mb-2 text-[9px] font-bold uppercase tracking-[0.2em]"
                style={{ color: '#1D4ED8' }}
              >
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
                            ? {
                                background: 'linear-gradient(135deg, #0D2137 0%, #1B3A6B 100%)',
                                color: '#67E8F9',
                                borderLeft: '2px solid #22D3EE',
                                boxShadow: '0 0 20px rgba(34,211,238,0.10), inset 0 0 20px rgba(34,211,238,0.05)',
                              }
                            : {
                                color: '#94A3B8',
                                borderLeft: '2px solid transparent',
                              }
                        }
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = '#0F1F3D';
                            (e.currentTarget as HTMLElement).style.color = '#CBD5E1';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = '#94A3B8';
                          }
                        }}
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
      <div className="px-6 py-4" style={{ borderTop: '1px solid #0F1F3D' }}>
        <div className="text-[10px]" style={{ color: '#1E3A5F' }}>
          © 2025 Revolis.AI
        </div>
      </div>
    </aside>
  );
}
