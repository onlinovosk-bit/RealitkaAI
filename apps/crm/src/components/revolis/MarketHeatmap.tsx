"use client";

import { Fragment } from "react";
import { Lock, MapPin } from "lucide-react";

import type { MarketHotspot } from "@/lib/analytics/market-density";

export function MarketHeatmap({
  hotspots,
  canSeeDetails = true,
}: {
  hotspots: MarketHotspot[];
  canSeeDetails?: boolean;
}) {
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

      <div className={canSeeDetails ? "" : "blur-[5px] saturate-50"}>
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
      </div>

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
            Záujemcovia (dopyt)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
            Nehnuteľnosti (ponuka)
          </span>
        </div>
      </div>

      {!canSeeDetails ? (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center p-6"
          style={{ background: "rgba(2,6,23,0.58)", backdropFilter: "blur(3px)" }}
        >
          <div
            className="max-w-md rounded-2xl border p-4 text-center"
            style={{
              background: "rgba(15,23,42,0.92)",
              borderColor: "rgba(59,130,246,0.35)",
            }}
          >
            <div className="mb-2 flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-blue-300" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">
                Smart Tier Gating
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-100">
              V tejto zóne (Sekčov) práve vzniká dopytový pretlak o 22%.
            </p>
            <p className="mt-2 text-xs text-slate-300">
              Chceš vidieť presné ulice a zoznam čakajúcich kupcov? Aktivuj Market Vision.
            </p>
            <a
              href="/billing"
              className="mt-4 inline-flex rounded-xl px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white"
              style={{ background: "linear-gradient(135deg,#1D4ED8,#2563EB)" }}
            >
              Aktivovať Market Vision
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
