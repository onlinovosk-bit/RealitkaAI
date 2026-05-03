"use client";

import type { PlaybookFilterToggleProps } from "./components.map";

export function PlaybookFilterToggle({ value, onChange }: PlaybookFilterToggleProps) {
  return (
    <div
      className="inline-flex items-center rounded-full p-1"
      style={{ background: "rgba(8,13,26,0.8)", border: "1px solid rgba(34,211,238,0.12)" }}
    >
      {(["TODAY", "WEEK"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className="rounded-full px-4 font-medium transition-all active:scale-95"
          style={{
            minHeight: 36,
            fontSize: "0.8125rem",
            background: value === v ? "linear-gradient(135deg, #22D3EE, #0EA5E9)" : "transparent",
            color: value === v ? "#050914" : "#64748B",
            fontWeight: value === v ? 700 : 500,
          }}
        >
          {v === "TODAY" ? "Dnes" : "Týždeň"}
        </button>
      ))}
    </div>
  );
}
