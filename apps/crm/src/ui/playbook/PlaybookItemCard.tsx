"use client";

import type { PlaybookItemProps, PlaybookItemType } from "./components.map";

const TYPE_CONFIG: Record<
  PlaybookItemType,
  { label: string; emoji: string; accent: string }
> = {
  CALL:        { label: "Hovor",       emoji: "📞", accent: "#22D3EE" },
  MESSAGE:     { label: "Správa",      emoji: "💬", accent: "#818CF8" },
  RISK:        { label: "Riziko",      emoji: "⚠️", accent: "#FCA5A5" },
  OPPORTUNITY: { label: "Príležitosť", emoji: "🔥", accent: "#FCD34D" },
};

export function PlaybookItemCard(props: PlaybookItemProps) {
  const {
    type,
    title,
    subtitle,
    badges,
    buyerScore,
    propertyTitle,
    reason,
    ctaLabel,
    onClick,
    ctaLoading,
  } = props;

  const cfg = TYPE_CONFIG[type];

  return (
    <article
      className="flex flex-col gap-3 rounded-xl border p-4 transition-all active:scale-[0.99] sm:flex-row sm:items-start sm:justify-between sm:gap-4"
      style={{
        background: "#0A1628",
        borderColor: "#112240",
      }}
    >
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        {/* Type + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.accent }}>
            {cfg.emoji} {cfg.label}
          </span>
          {badges?.map((b) => (
            <span
              key={b}
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                background: "rgba(34,211,238,0.08)",
                color: "#94A3B8",
                border: "1px solid rgba(34,211,238,0.12)",
              }}
            >
              {b}
            </span>
          ))}
        </div>

        {/* Titles */}
        <h3 className="text-sm font-semibold" style={{ color: "#F0F9FF" }}>
          {title}
        </h3>
        <p className="text-sm" style={{ color: "#64748B" }}>
          {subtitle}
        </p>

        {/* Property */}
        {propertyTitle && (
          <p className="text-xs" style={{ color: "#475569" }}>
            {propertyTitle}
          </p>
        )}

        {/* Reason */}
        <p className="text-xs" style={{ color: "#334155" }}>
          {reason}
        </p>
      </div>

      {/* Right side — full-width CTA on mobile, normal on sm+ */}
      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:flex-shrink-0">
        {buyerScore !== undefined && (
          <div
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
            style={{
              background: "rgba(34,211,238,0.08)",
              border: "1px solid rgba(34,211,238,0.20)",
              color: "#22D3EE",
            }}
          >
            {buyerScore}
            <span className="font-normal text-[10px]" style={{ color: "#475569" }}>
              /100
            </span>
          </div>
        )}
        <button
          type="button"
          disabled={ctaLoading}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className="flex-1 sm:flex-none rounded-full px-4 py-2.5 text-sm font-bold transition-all hover:opacity-90 active:scale-95 disabled:cursor-wait disabled:opacity-70 min-h-[44px] sm:min-h-0 sm:py-1.5 sm:text-xs"
          style={{
            background: "linear-gradient(135deg, #22D3EE, #818CF8)",
            color: "#050914",
          }}
        >
          {ctaLoading ? "…" : ctaLabel}
        </button>
      </div>
    </article>
  );
}
