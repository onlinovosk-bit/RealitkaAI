"use client";

import Link from "next/link";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";

type WorkdeskTopbarProps = {
  userName?: string;
};

function initials(name?: string): string {
  if (!name) return "OS";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function WorkdeskTopbar({ userName }: WorkdeskTopbarProps) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        height: 64,
        minHeight: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        background: SLATE_HORIZON.topbarGradient,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 1px 12px rgba(8,17,32,0.12)",
        zIndex: 30,
        flexShrink: 0,
      }}
    >
      <div style={{ width: 40 }} aria-hidden />
      <div style={{ flex: 1, maxWidth: 520, margin: "0 auto" }}>
        <label htmlFor="workdesk-search" className="sr-only">
          Hľadať lead, lokalitu, makléra, províziu
        </label>
        <input
          id="workdesk-search"
          readOnly
          placeholder="Hľadať lead, lokalitu, makléra, províziu…"
          style={{
            width: "100%",
            height: 40,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: "0 16px",
            color: "#fff",
            fontSize: 13,
          }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link
          href="/porovnanie-programov"
          style={{
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 12,
            height: 38,
            padding: "0 16px",
            fontSize: 13,
            fontWeight: 700,
            color: "#fff",
            background: "rgba(255,255,255,0.08)",
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          Programy
        </Link>
        <Link
          href="/settings"
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            height: 38,
            padding: "0 16px",
            fontSize: 13,
            fontWeight: 700,
            color: "#fff",
            background: SLATE_HORIZON.inkDeep,
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          Nastavenia
        </Link>
        <Link
          href="/dashboard#actions"
          style={{
            border: 0,
            borderRadius: 12,
            height: 38,
            padding: "0 18px",
            fontSize: 13,
            fontWeight: 700,
            color: SLATE_HORIZON.brandDeep,
            background: "#fff",
            boxShadow: "0 2px 16px rgba(255,255,255,0.22)",
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          Spustiť akcie
        </Link>
        <div
          aria-label="Profil"
          title={userName}
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {initials(userName)}
        </div>
      </div>
    </header>
  );
}
