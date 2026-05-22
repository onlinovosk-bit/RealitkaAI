"use client";

import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";

const ITEMS = [
  "Revolis.AI",
  "Predaj viac",
  "Pracuj menej",
  "Realitky ktoré víťazia, používajú Revolis.AI",
  "AI Asistent nikdy nespí. Ty môžeš.",
  "AI Chief of Sales pre realitky",
  "+34% konverzný pomer",
  "Odpoveď do 2 minút. 24/7.",
  "Revolis.AI",
  "Predaj viac",
  "Pracuj menej",
  "Realitky ktoré víťazia, používajú Revolis.AI",
  "AI Asistent nikdy nespí. Ty môžeš.",
  "AI Chief of Sales pre realitky",
  "+34% konverzný pomer",
  "Odpoveď do 2 minút. 24/7.",
];

export default function TickerBanner() {
  return (
    <div
      className="relative overflow-hidden py-3"
      style={{
        background: SLATE_HORIZON.soft,
        borderTop: `1px solid ${SLATE_HORIZON.softBorder}`,
        borderBottom: `1px solid ${SLATE_HORIZON.softBorder}`,
      }}
    >
      <div
        className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-20"
        style={{
          background: `linear-gradient(90deg, ${SLATE_HORIZON.bg} 0%, transparent 100%)`,
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-20"
        style={{
          background: `linear-gradient(270deg, ${SLATE_HORIZON.bg} 0%, transparent 100%)`,
        }}
      />

      <div
        className="flex whitespace-nowrap motion-reduce:animate-none"
        style={{ animation: "ticker 30s linear infinite" }}
      >
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="mx-6 text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: SLATE_HORIZON.brandDeep }}
          >
            {item}
          </span>
        ))}
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          div {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
