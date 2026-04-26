"use client";

import { useCallback, useState } from "react";
import { Loader2, Zap } from "lucide-react";

import DemandHeatmap from "@/components/analytics/DemandHeatmap";
import { AIActivityFeed } from "@/components/revolis/AIActivityFeed";
import { BriLivePulse } from "@/components/revolis/BriLivePulse";
import { MarketHeatmap } from "@/components/revolis/MarketHeatmap";
import { RadiantSpriteIcon } from "@/components/shared/radiant-sprite-icon";
import type { MarketHotspot } from "@/lib/analytics/market-density";
import type { AiActivityFeedItem } from "@/lib/app-mode-types";

export default function RevolisAIClient({
  hotspots,
  feedSeed,
  demandData,
  supplyData,
  detectedGap,
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030712] text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 20% -10%, rgba(99,102,241,0.35), transparent), radial-gradient(ellipse 50% 40% at 90% 20%, rgba(34,211,238,0.12), transparent)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:px-6">
        <header className="mb-10 flex flex-col gap-6 border-b border-white/10 pb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #1B4FD8 0%, #22D3EE 100%)",
                  boxShadow: "0 0 16px rgba(34,211,238,0.4)",
                }}
              >
                R
              </div>
              <div>
                <p className="text-sm font-bold leading-none" style={{ color: "#F0F9FF" }}>Revolis.AI</p>
                <p className="text-[10px]" style={{ color: "#475569" }}>AI platforma pre maklérov</p>
              </div>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
              AI Párovanie
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Denný trhový scan, hustota dopytu a živý Buyer Readiness Index – na jednom mieste.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <BriLivePulse />
            <button
              type="button"
              onClick={runScan}
              disabled={scanning}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-500 px-8 py-3.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(99,102,241,0.45)] transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
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
            className={`mb-6 text-sm ${scanMessage.includes("Hotovo") ? "text-emerald-400/90" : "text-amber-400/90"}`}
          >
            {scanMessage}
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="relative lg:col-span-3">
            <MarketHeatmap hotspots={hotspots} />
          </div>
          <div className="lg:col-span-2">
            <AIActivityFeed items={feedSeed} />
          </div>
        </div>

        <div className="mt-8">
          <DemandHeatmap demandData={demandData} supplyData={supplyData} detectedGap={detectedGap} />
        </div>
      </div>
    </div>
  );
}
