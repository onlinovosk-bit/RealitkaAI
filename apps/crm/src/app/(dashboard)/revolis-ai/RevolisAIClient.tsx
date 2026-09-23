"use client";

import { useCallback, useState } from "react";
import { Loader2, Zap } from "lucide-react";

import DemandHeatmap from "@/components/analytics/DemandHeatmap";
import { AIActivityFeed } from "@/components/revolis/AIActivityFeed";
import { BriLivePulse } from "@/components/revolis/BriLivePulse";
import { MarketHeatmap } from "@/components/revolis/MarketHeatmap";
import type { MarketHotspot } from "@/lib/analytics/market-density";
import type { AiActivityFeedItem } from "@/lib/app-mode-types";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";
import { useLicenseCapabilities } from "@/hooks/useLicenseCapabilities";

export default function RevolisAIClient({
  hotspots,
  feedSeed,
  demandData,
  supplyData,
  detectedGap,
  accountTier,
}: {
  hotspots: MarketHotspot[];
  feedSeed: AiActivityFeedItem[];
  demandData: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      geometry: { type: "Point"; coordinates: [number, number] };
      properties: { search_weight: number };
    }>;
  };
  supplyData: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      geometry: { type: "Point"; coordinates: [number, number] };
      properties: { search_weight: number };
    }>;
  };
  detectedGap: string | null;
  accountTier: string | null;
}) {
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const runScan = useCallback(async () => {
    setScanning(true);
    setScanMessage(null);
    try {
      const res = await fetch("/api/matching/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        result?: { totalRows?: number };
      };
      if (!res.ok) {
        throw new Error(data.error || "Scan zlyhal.");
      }
      const rows = data.result?.totalRows ?? 0;
      setScanMessage(`Hotovo · ${rows} zhôd zapísaných.`);
    } catch (e) {
      setScanMessage(
        e instanceof Error ? e.message : "Nepodarilo sa spustiť matching scan."
      );
    } finally {
      setScanning(false);
    }
  }, []);

  const { can } = useLicenseCapabilities(accountTier);
  const canSeeMarketVisionDetails = can("canUseMarketIntel");

  return (
    <div className="relative min-h-screen" style={{ background: SLATE_HORIZON.bg, color: SLATE_HORIZON.ink }}>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <header className="mb-10 flex flex-col gap-6 border-b pb-8 md:flex-row md:items-center md:justify-between" style={{ borderColor: SLATE_HORIZON.line }}>
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ background: SLATE_HORIZON.brandDeep }}
              >
                R
              </div>
              <div>
                <p className="text-sm font-bold leading-none" style={{ color: SLATE_HORIZON.ink }}>Revolis.AI</p>
                <p className="text-[10px]" style={{ color: SLATE_HORIZON.muted }}>AI platforma pre maklérov</p>
              </div>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl" style={{ color: SLATE_HORIZON.ink }}>
              AI Párovanie
            </h1>
            <p className="mt-2 max-w-xl text-sm" style={{ color: SLATE_HORIZON.muted }}>
              Denný trhový scan, hustota dopytu a živý Buyer Readiness Index – na jednom mieste.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <BriLivePulse />
            <button
              type="button"
              onClick={runScan}
              disabled={scanning}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: SLATE_HORIZON.brandDeep }}
            >
              {scanning ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Zap className="h-5 w-5" aria-hidden />
              )}
              {scanning ? "Skenujem…" : "Spustiť scan"}
            </button>
          </div>
        </header>

        {scanMessage ? (
          <p
            className="mb-6 text-sm font-medium"
            style={{ color: scanMessage.includes("Hotovo") ? SLATE_HORIZON.greenDark : SLATE_HORIZON.amber }}
          >
            {scanMessage}
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="relative lg:col-span-3">
            <MarketHeatmap hotspots={hotspots} canSeeDetails={canSeeMarketVisionDetails} />
          </div>
          <div className="lg:col-span-2">
            <AIActivityFeed items={feedSeed} />
          </div>
        </div>

        <div className="mt-8">
          <DemandHeatmap
            demandData={demandData}
            supplyData={supplyData}
            detectedGap={detectedGap}
            canViewDetails={can("canViewDemandHeatmap")}
          />
        </div>
      </div>
    </div>
  );
}
