"use client";

import { Fragment, useEffect } from "react";
import { MapPin } from "lucide-react";

import type { MarketHotspot } from "@/lib/analytics/market-density";
import { trackRevenueTelemetry } from "@/lib/analytics/revenue-telemetry";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";
import { PremiumLockedBlur, PremiumLockedOverlay } from "@/components/license/PremiumLockedOverlay";

export function MarketHeatmap({
  hotspots,
  canSeeDetails = true,
}: {
  hotspots: MarketHotspot[];
  canSeeDetails?: boolean;
}) {
  useEffect(() => {
    if (hotspots.length === 0) return;
    void trackRevenueTelemetry("market_signal", {
      hotspotCount: hotspots.length,
      canSeeDetails,
      leadSignals: hotspots.filter((h) => h.kind === "lead").length,
      listingSignals: hotspots.filter((h) => h.kind === "property").length,
    });
  }, [hotspots, canSeeDetails]);

  return (
    <div
      className="relative min-h-[300px] w-full overflow-hidden rounded-2xl border"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,235,0.08), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(59,130,246,0.06), transparent)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(226,232,240,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(226,232,240,0.8) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <PremiumLockedBlur active={!canSeeDetails}>
        {hotspots.map((h, i) => (
          <Fragment key={`${h.kind}-${i}-${h.x}-${h.y}-${h.label ?? ""}`}>
            <div
              className="pointer-events-none absolute rounded-full"
              style={{
                left: `${h.x}%`,
                top: `${h.y}%`,
                width: `${h.radius * 2}px`,
                height: `${h.radius * 2}px`,
                transform: "translate(-50%, -50%)",
                opacity: h.opacity,
                background:
                  h.kind === "lead"
                    ? "radial-gradient(circle, rgba(37,99,235,0.55) 0%, rgba(37,99,235,0.15) 40%, transparent 72%)"
                    : "radial-gradient(circle, rgba(14,165,233,0.45) 0%, rgba(14,165,233,0.12) 40%, transparent 72%)",
                filter: "blur(10px)",
              }}
            />
            {h.label ? (
              <div
                className="pointer-events-none absolute z-20 -translate-x-1/2 text-center"
                style={{ left: `${h.x}%`, top: `calc(${h.y}% + 32px)` }}
              >
                <span
                  className="inline-block max-w-[9rem] rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{
                    background: "#FFFFFF",
                    borderColor: SLATE_HORIZON.softBorder,
                    color: SLATE_HORIZON.brandDeep,
                  }}
                >
                  {h.label}
                </span>
              </div>
            ) : null}
          </Fragment>
        ))}
      </PremiumLockedBlur>

      <div className="relative z-10 flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: SLATE_HORIZON.brandDeep }}>
              Market density
            </p>
            <h3 className="mt-1 text-lg font-semibold" style={{ color: SLATE_HORIZON.ink }}>
              Dopyt vs. inventár
            </h3>
            <p className="mt-1 max-w-md text-xs" style={{ color: SLATE_HORIZON.muted }}>
              Agregované lokácie leadov (modrá) a ponúk (cyan). Vyššia intenzita = viac záznamov v zóne.
            </p>
          </div>
          <MapPin className="h-8 w-8 shrink-0" style={{ color: SLATE_HORIZON.softBorder }} aria-hidden />
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-[11px]" style={{ color: SLATE_HORIZON.muted }}>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: SLATE_HORIZON.brandDeep }} />
            Záujemcovia (dopyt)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            Nehnuteľnosti (ponuka)
          </span>
        </div>
      </div>

      {!canSeeDetails ? (
        <PremiumLockedOverlay
          capability="canUseMarketIntel"
          headline="V tejto zóne (Sekčov) práve vzniká dopytový pretlak o 22%."
          subline="Chceš vidieť presné ulice a zoznam čakajúcich kupcov? Odomkni Market Vision."
        />
      ) : null}
    </div>
  );
}
