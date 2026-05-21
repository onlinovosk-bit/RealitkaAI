"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon as NavIconGlyph } from "@/components/ui/NavIcon";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";
import { WORKDESK_RAIL } from "@/lib/workdesk-nav";

export function WorkdeskRail() {
  const pathname = usePathname() ?? "";

  return (
    <aside
      aria-label="Hlavná navigácia"
      className="hidden lg:flex"
      style={{
        width: SLATE_HORIZON.railWidth,
        minWidth: SLATE_HORIZON.railWidth,
        height: "100vh",
        position: "sticky",
        top: 0,
        flexShrink: 0,
        flexDirection: "column",
        background: SLATE_HORIZON.railGradient,
        padding: "14px 10px",
        color: "#fff",
        boxShadow: "6px 0 24px rgba(8,17,32,0.14)",
        overflowY: "auto",
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: "rgba(255,255,255,0.16)",
          border: "1px solid rgba(255,255,255,0.12)",
          display: "grid",
          placeItems: "center",
          fontWeight: 800,
          fontSize: 16,
          margin: "0 auto 16px",
        }}
      >
        R
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {WORKDESK_RAIL.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.id}
              href={item.href}
              style={{
                minHeight: 52,
                borderRadius: 14,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                padding: "6px 4px",
                fontSize: 9,
                fontWeight: 700,
                textAlign: "center",
                color: "#fff",
                background: active ? "rgba(255,255,255,0.14)" : "transparent",
                textDecoration: "none",
                transition: "background 0.15s ease",
              }}
            >
              <NavIconGlyph name={item.icon} size={20} color="#fff" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
