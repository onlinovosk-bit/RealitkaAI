"use client";

import { FlaskConical, ShieldCheck } from "lucide-react";

import { useAppMode } from "@/hooks/useAppMode";

export function AppModeToggle() {
  const { mode, toggleMode, hydrated } = useAppMode();

  if (!hydrated) {
    return (
      <div
        className="h-8 w-[7.5rem] animate-pulse rounded-full"
        style={{ background: "rgba(148,163,184,0.08)" }}
        aria-hidden
      />
    );
  }

  const isDemo = mode === "demo";

  return (
    <button
      type="button"
      onClick={toggleMode}
      title={
        isDemo
          ? "Demo: zobrazujú sa optimalizované mock dáta"
          : "Produkcia: živé dáta z databázy"
      }
      className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:brightness-110"
      style={{
        borderColor: isDemo ? "rgba(129,140,248,0.45)" : "rgba(148,163,184,0.25)",
        background: isDemo
          ? "rgba(99,102,241,0.15)"
          : "rgba(15,23,42,0.6)",
        color: isDemo ? "#C7D2FE" : "#94A3B8",
      }}
    >
      {isDemo ? (
        <FlaskConical className="h-3.5 w-3.5 text-indigo-300" aria-hidden />
      ) : (
        <ShieldCheck className="h-3.5 w-3.5 text-slate-400" aria-hidden />
      )}
      {isDemo ? "Demo" : "Live"}
    </button>
  );
}
