"use client";

import { Fragment } from "react";
import { MapPin } from "lucide-react";

import type { MarketHotspot } from "@/lib/analytics/market-density";

export function MarketHeatmap({ hotspots }: { hotspots: MarketHotspot[] }) {
  return (
    <div className="relative min-h-[300px] w-full overflow-hidden rounded-2xl border border-indigo-500/25 bg-slate-950/90 shadow-[0_0_60px_-12px_rgba(99,102,241,0.35)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.25), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(34,211,238,0.12), transparent)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.35) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {hotspots.map((h, i) => (
        <Fragment key={`${h.kind}-${i}-${h.x}-${h.y}-${h.label ?? ""}`}>
          <div
            className="pointer-events-none absolute rounded-full mix-blend-screen"
            style={{
              left: `${h.x}%`,
              top: `${h.y}%`,
              width: `${h.radius * 2}px`,
              height: `${h.radius * 2}px`,
              transform: "translate(-50%, -50%)",
              opacity: h.opacity,
              background:
                h.kind === "lead"
                  ? "radial-gradient(circle, rgba(129,140,248,0.95) 0%, rgba(99,102,241,0.35) 35%, transparent 72%)"
                  : "radial-gradient(circle, rgba(45,212,191,0.85) 0%, rgba(34,211,238,0.28) 38%, transparent 72%)",
              filter: "blur(10px)",
            }}
          />
          {h.label ? (
            <div
              className="pointer-events-none absolute z-20 -translate-x-1/2 text-center"
              style={{ left: `${h.x}%`, top: `calc(${h.y}% + 32px)` }}
            >
              <span className="inline-block max-w-[9rem] rounded-full border border-cyan-400/25 bg-slate-950/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100/95 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                {h.label}
              </span>
            </div>
          ) : null}
        </Fragment>
      ))}

      <div className="relative z-10 flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400/90">
              Market density
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-100">
              Dopyt vs. inventár
            </h3>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              Agregované lokácie leadov (indigo) a ponúk (cyan). Vyššia intenzita = viac záznamov v zóne.
            </p>
          </div>
          <MapPin className="h-8 w-8 shrink-0 text-indigo-500/40" aria-hidden />
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            Lead interest
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
            Properties
          </span>
        </div>
      </div>
    </div>
  );
}
