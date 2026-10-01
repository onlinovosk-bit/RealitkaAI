"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Lead } from "@/lib/leads-store";
import { OUTCOME } from "@/lib/copy/outcome-copy";
import { SLATE_HORIZON, WORKDESK_PANEL } from "@/lib/slate-horizon-theme";
import {
  buildFirstAudit,
  formatAuditMoney,
  type FirstAuditResult,
} from "@/lib/workdesk/first-audit";

type Props = {
  leads?: Lead[];
  audit?: FirstAuditResult | null;
  loading?: boolean;
  compact?: boolean;
  onContinue?: () => void;
  continueHref?: string;
  continueLabel?: string;
};

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      className="rounded-2xl border px-4 py-3"
      style={{
        background: "rgba(255,255,255,0.72)",
        borderColor: SLATE_HORIZON.line,
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: SLATE_HORIZON.muted }}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums" style={{ color: SLATE_HORIZON.deep }}>
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[11px]" style={{ color: SLATE_HORIZON.muted }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FirstAuditPanel({
  leads,
  audit: auditProp,
  loading = false,
  compact = false,
  onContinue,
  continueHref = "/dashboard#today-focus",
  continueLabel = OUTCOME.startTodayCta,
}: Props) {
  const audit = useMemo(() => {
    if (auditProp) return auditProp;
    if (leads) return buildFirstAudit(leads);
    return null;
  }, [auditProp, leads]);

  if (loading || !audit) {
    return (
      <section
        className="mb-6 rounded-[22px] border p-6"
        style={{
          background: WORKDESK_PANEL.background,
          borderColor: WORKDESK_PANEL.borderColor,
          boxShadow: WORKDESK_PANEL.boxShadow,
        }}
      >
        <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
          {OUTCOME.firstAuditSubtitle}
        </p>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full w-2/3 animate-pulse rounded-full"
            style={{ background: SLATE_HORIZON.brand }}
          />
        </div>
      </section>
    );
  }

  const qualityNote =
    audit.dataQuality === "empty"
      ? OUTCOME.emptyNoLeads
      : audit.dataQuality === "sparse"
        ? OUTCOME.emptySparse
        : null;

  return (
    <section
      className={`rounded-[22px] border ${compact ? "mb-4 p-5" : "mb-6 p-6 md:p-7"}`}
      style={{
        background: "linear-gradient(145deg, #EFF6FF 0%, #FFFFFF 55%, #ECFDF5 100%)",
        borderColor: "#BFDBFE",
        boxShadow: WORKDESK_PANEL.boxShadow,
      }}
      data-testid="first-audit-panel"
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.2em]"
        style={{ color: SLATE_HORIZON.brandDeep }}
      >
        60 sekúnd · z vašich dát
      </p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight" style={{ color: SLATE_HORIZON.deep }}>
        {OUTCOME.firstAuditTitle}
      </h2>
      <p className="mt-1 max-w-2xl text-sm" style={{ color: SLATE_HORIZON.muted }}>
        {OUTCOME.firstAuditSubtitle}
      </p>

      {qualityNote ? (
        <p
          className="mt-4 rounded-xl border px-3 py-2 text-sm"
          style={{
            background: "#FFFBEB",
            borderColor: "#FDE68A",
            color: "#92400E",
          }}
        >
          {qualityNote}
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Zabudnutí / stagnujúci" value={String(audit.forgottenLeads)} />
        <Metric label="Ohrozené obchody" value={String(audit.atRiskDeals)} />
        <Metric
          label="Odhad ohrozených provízií"
          value={formatAuditMoney(audit.atRiskCommissionEur)}
          hint={audit.atRiskCommissionEur == null ? "Po doplnení rozpočtov" : "3 % z rozpočtu"}
        />
        <Metric
          label="Odhad pipeline (provízie)"
          value={formatAuditMoney(audit.commissionEstimateEur)}
          hint={audit.commissionEstimateEur == null ? "Bez rozpočtov — bez odhadu" : "3 % z rozpočtu"}
        />
      </div>

      {audit.topCallTargets.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>
            Komu volať ako prvému
          </p>
          <ul className="mt-2 space-y-2">
            {audit.topCallTargets.map((t, i) => (
              <li key={t.id}>
                <Link
                  href={`/leads/${t.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-opacity hover:opacity-90"
                  style={{
                    background: "#fff",
                    borderColor: SLATE_HORIZON.line,
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold" style={{ color: SLATE_HORIZON.deep }}>
                      {i + 1}. {t.name}
                    </span>
                    <span className="block truncate text-xs" style={{ color: SLATE_HORIZON.muted }}>
                      {t.reason}
                    </span>
                  </span>
                  {t.moneyEur != null ? (
                    <span className="shrink-0 text-sm font-bold tabular-nums" style={{ color: SLATE_HORIZON.money }}>
                      {formatAuditMoney(t.moneyEur)}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>
          Tri kroky dnes
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm" style={{ color: SLATE_HORIZON.deep }}>
          {audit.todaySteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {onContinue ? (
          <button
            type="button"
            onClick={onContinue}
            className="cursor-pointer rounded-full px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-95"
            style={{ background: SLATE_HORIZON.ctaGradient }}
          >
            {continueLabel}
          </button>
        ) : (
          <Link
            href={continueHref}
            className="inline-flex rounded-full px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-95"
            style={{ background: SLATE_HORIZON.ctaGradient }}
          >
            {continueLabel}
          </Link>
        )}
        {audit.dataQuality === "empty" ? (
          <Link
            href="/import/universal"
            className="text-sm font-semibold underline-offset-2 hover:underline"
            style={{ color: SLATE_HORIZON.brandDeep }}
          >
            Importovať kontakty
          </Link>
        ) : null}
      </div>
    </section>
  );
}
