"use client";

import type { L99Result } from "@/lib/ai/l99-engine";
import { SLATE_HORIZON, WORKDESK_INNER_ROW, WORKDESK_PANEL } from "@/lib/slate-horizon-theme";

export function L99PredictiveCard({ result }: { result: L99Result }) {
  if (result.status === "LOCKED") {
    return (
      <div
        className="relative rounded-[20px] border-2 border-dashed p-6"
        style={{
          borderColor: SLATE_HORIZON.line,
          background: WORKDESK_PANEL.background,
        }}
      >
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-full text-lg"
            style={{ background: SLATE_HORIZON.soft, color: SLATE_HORIZON.brandDeep }}
          >
            🔒
          </div>
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: SLATE_HORIZON.muted }}>
            L99 RADAR PRÍLEŽITOSTÍ
          </h3>
          <p className="mt-1 text-[10px]" style={{ color: SLATE_HORIZON.muted }}>
            Dostupné iba v programe Enterprise
          </p>
          <a
            href="/billing"
            className="mt-4 rounded-full px-4 py-2 text-xs font-bold text-white transition-colors hover:opacity-95"
            style={{ background: SLATE_HORIZON.brandDeep }}
          >
            UPGRADE NA ENTERPRISE
          </a>
        </div>
      </div>
    );
  }

  const bri = result.bri ?? 0;
  const isHot = bri > 85;

  return (
    <div
      className="rounded-[20px] border p-5 transition-all duration-300"
      style={
        isHot
          ? {
              background: SLATE_HORIZON.heroGradient,
              borderColor: "rgba(255,255,255,0.14)",
              boxShadow: "0 16px 40px rgba(8,17,32,0.24)",
              color: "#fff",
            }
          : {
              background: WORKDESK_PANEL.background,
              borderColor: WORKDESK_PANEL.borderColor,
              boxShadow: WORKDESK_PANEL.boxShadow,
            }
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="text-[10px] font-bold tracking-widest"
            style={{ color: isHot ? "#FDE68A" : SLATE_HORIZON.brandDeep }}
          >
            BUYER READINESS INDEX™
          </p>
          <h2
            className="mt-1 text-4xl font-black"
            style={{ color: isHot ? "#fff" : SLATE_HORIZON.ink }}
          >
            {bri}%
          </h2>
        </div>

        {result.isShadowMatch && (
          <span
            className="rounded-full px-2 py-1 text-[9px] font-black"
            style={{ background: SLATE_HORIZON.warning, color: SLATE_HORIZON.inkDeep }}
          >
            SHADOW MATCH
          </span>
        )}
      </div>

      {result.insights.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-[11px] font-medium" style={{ color: isHot ? "rgba(255,255,255,0.72)" : SLATE_HORIZON.muted }}>
            Kľúčové faktory Asistenta AI:
          </p>
          {result.insights.map((insight, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg p-2 text-[10px]"
              style={{
                background: isHot ? "rgba(255,255,255,0.1)" : WORKDESK_INNER_ROW.background,
                border: isHot ? "1px solid rgba(255,255,255,0.12)" : `1px solid ${WORKDESK_INNER_ROW.borderColor}`,
                color: isHot ? "#fff" : SLATE_HORIZON.deep,
              }}
            >
              <span className="mt-0.5 shrink-0">⚡</span>
              <span>{insight}</span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[9px]" style={{ color: isHot ? "rgba(255,255,255,0.45)" : SLATE_HORIZON.muted }}>
        Revolis.AI využíva technológiu Asistent AI. Všetky predikcie majú informatívny charakter.
      </p>
    </div>
  );
}
