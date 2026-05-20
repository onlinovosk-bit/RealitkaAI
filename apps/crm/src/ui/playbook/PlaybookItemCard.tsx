"use client";

import { AlertTriangle, Flame, MessageSquare, Phone } from "lucide-react";
import type { PlaybookItemProps, PlaybookItemType } from "./components.map";

const TYPE_CONFIG: Record<
  PlaybookItemType,
  {
    label: string;
    Icon: typeof Phone;
    accentClass: string;
    badgeClass: string;
    scoreClass: string;
  }
> = {
  CALL: {
    label: "Hovor",
    Icon: Phone,
    accentClass: "text-blue-700",
    badgeClass: "border-blue-100 bg-blue-50 text-blue-700",
    scoreClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
  MESSAGE: {
    label: "Správa",
    Icon: MessageSquare,
    accentClass: "text-slate-700",
    badgeClass: "border-slate-200 bg-slate-100 text-slate-700",
    scoreClass: "border-slate-200 bg-slate-50 text-slate-700",
  },
  RISK: {
    label: "Riziko",
    Icon: AlertTriangle,
    accentClass: "text-red-600",
    badgeClass: "border-red-100 bg-red-50 text-red-700",
    scoreClass: "border-red-200 bg-red-50 text-red-700",
  },
  OPPORTUNITY: {
    label: "Príležitosť",
    Icon: Flame,
    accentClass: "text-emerald-700",
    badgeClass: "border-emerald-100 bg-emerald-50 text-emerald-700",
    scoreClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
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
  const Icon = cfg.Icon;

  return (
    <article
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md active:scale-[0.99] sm:flex-row sm:items-start sm:justify-between sm:gap-4"
    >
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        {/* Type + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${cfg.accentClass}`}>
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {cfg.label}
          </span>
          {badges?.map((b) => (
            <span
              key={b}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.badgeClass}`}
            >
              {b}
            </span>
          ))}
        </div>

        {/* Titles */}
        <h3 className="text-sm font-semibold text-slate-950">
          {title}
        </h3>
        <p className="text-sm text-slate-600">
          {subtitle}
        </p>

        {/* Property */}
        {propertyTitle && (
          <p className="text-xs text-slate-500">
            {propertyTitle}
          </p>
        )}

        {/* Reason */}
        <p className="text-xs text-slate-500">
          {reason}
        </p>
      </div>

      {/* Right side — full-width CTA on mobile, normal on sm+ */}
      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:flex-shrink-0">
        {buyerScore !== undefined && (
          <div
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${cfg.scoreClass}`}
          >
            {buyerScore}
            <span className="text-[10px] font-normal text-slate-500">
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
          className="min-h-11 flex-1 cursor-pointer rounded-full bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 active:scale-95 disabled:cursor-wait disabled:opacity-70 sm:min-h-0 sm:flex-none sm:py-1.5 sm:text-xs"
        >
          {ctaLoading ? "..." : ctaLabel}
        </button>
      </div>
    </article>
  );
}
