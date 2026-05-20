"use client";

import type { PlaybookFilterToggleProps } from "./components.map";

export function PlaybookFilterToggle({ value, onChange }: PlaybookFilterToggleProps) {
  return (
    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm">
      {(["TODAY", "WEEK"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`min-h-11 cursor-pointer rounded-full px-4 text-[0.8125rem] font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-95 ${
            value === v
              ? "bg-blue-700 font-bold text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          {v === "TODAY" ? "Dnes" : "Týždeň"}
        </button>
      ))}
    </div>
  );
}
