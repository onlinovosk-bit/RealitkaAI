"use client";

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
        background: "rgba(34,211,238,0.06)",
        borderTop: "1px solid rgba(34,211,238,0.12)",
        borderBottom: "1px solid rgba(34,211,238,0.12)",
      }}
    >
      {/* Fade left */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-20"
        style={{
          background: "linear-gradient(90deg, #050914 0%, transparent 100%)",
        }}
      />
      {/* Fade right */}
      <div
        className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-20"
        style={{
          background: "linear-gradient(270deg, #050914 0%, transparent 100%)",
        }}
      />

      {/* Ticker track */}
      <div
        className="flex whitespace-nowrap"
        style={{ animation: "ticker 30s linear infinite" }}
      >
        {ITEMS.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-3 px-2">
            <span
              className="text-sm font-semibold tracking-wide"
              style={{ color: i % 4 === 0 ? "#22D3EE" : "#94A3B8" }}
            >
              {item}
            </span>
            <span style={{ color: "rgba(34,211,238,0.4)" }}>·</span>
          </span>
        ))}
      </div>

      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
