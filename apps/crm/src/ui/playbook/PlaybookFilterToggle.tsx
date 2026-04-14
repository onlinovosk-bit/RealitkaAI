"use client";

import type { PlaybookFilterToggleProps } from "./components.map";

export function PlaybookFilterToggle({ value, onChange }: PlaybookFilterToggleProps) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full bg-gray-100 p-1">
      <button
        type="button"
        onClick={() => onChange("TODAY")}
        className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
          value === "TODAY" ? "bg-black text-white" : "text-gray-700 hover:text-gray-900"
        }`}
      >
        Dnes
      </button>
      <button
        type="button"
        onClick={() => onChange("WEEK")}
        className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
          value === "WEEK" ? "bg-black text-white" : "text-gray-700 hover:text-gray-900"
        }`}
      >
        Tento týždeň
      </button>
    </div>
  );
}
