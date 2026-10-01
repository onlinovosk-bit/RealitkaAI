"use client";

import Link from "next/link";
import {
  buildExecutiveSignals,
  formatMoneyEur,
} from "@/lib/workdesk/executive-signals";
import { countStaleLeads } from "@/lib/agents/deal-trigger";
import { OUTCOME } from "@/lib/copy/outcome-copy";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";
import type { Lead } from "@/lib/leads-store";

type Props = {
  leads: Lead[];
};

/**
 * Single dominant CTA for the workdesk — outcome language, no demo/fake leads.
 */
export function WorkdeskCommandHero({ leads }: Props) {
  const signals = buildExecutiveSignals(leads, 3);
  const staleCount = countStaleLeads(leads);
  const hasLeads = leads.length > 0;

  return (
    <section
      className="workdesk-command-hero relative mb-5 overflow-hidden rounded-[22px] p-7 text-white md:p-8"
      style={{
        background: SLATE_HORIZON.heroGradient,
        boxShadow: "0 24px 56px rgba(8,17,32,0.32)",
      }}
      data-testid="start-today-hero"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: SLATE_HORIZON.heroAmbient }}
        aria-hidden
      />
      <div
        className="workdesk-hero-glow pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-40 blur-3xl"
        style={{ background: "rgba(96,165,250,0.22)" }}
        aria-hidden
      />

      <div className="relative z-[1]">
        <span
          className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide"
          style={{
            background: "rgba(239,246,255,0.18)",
            color: "#EFF6FF",
            border: "1px solid rgba(255,255,255,0.16)",
          }}
        >
          Dnešný fokus
        </span>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-[44px] md:leading-[1.05]">
            {OUTCOME.dashboardHeadline}
          </h1>
          {staleCount > 0 ? (
            <Link
              href="/leads"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
              style={{
                background: "rgba(248,113,113,0.22)",
                border: "1px solid rgba(252,165,165,0.45)",
                color: "#FECACA",
              }}
            >
              {staleCount} stagnujúcich
            </Link>
          ) : null}
        </div>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/82">
          {OUTCOME.dashboardSubhead}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href="#today-focus"
            className="inline-flex rounded-full px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-95"
            style={{ background: SLATE_HORIZON.ctaGradient }}
            data-testid="start-today-cta"
          >
            {OUTCOME.startTodayCta}
          </a>
          {!hasLeads ? (
            <Link
              href="/import/universal"
              className="inline-flex rounded-full border px-5 py-3 text-sm font-semibold text-white/90 transition-opacity hover:opacity-90"
              style={{ borderColor: "rgba(255,255,255,0.28)" }}
            >
              Importovať kontakty
            </Link>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {OUTCOME.timePromises.map((chip) => (
            <span
              key={chip}
              className="rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2.5 md:grid-cols-3">
          {hasLeads && signals.length > 0 ? (
            signals.map((item) => (
              <Link
                key={item.leadId}
                href={`/leads/${item.leadId}`}
                className="rounded-2xl p-3.5 backdrop-blur-[2px] transition-transform duration-200 hover:scale-[1.01]"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                <b className="block text-sm font-bold">
                  {item.name}
                  {item.moneyEur ? (
                    <>
                      {" · "}
                      <span style={{ color: "#86efac" }}>{formatMoneyEur(item.moneyEur)}</span>
                    </>
                  ) : null}
                </b>
                <span className="text-xs text-white/75">
                  {item.confidence > 0 ? `${item.confidence}% istota · ` : null}
                  {item.timing}
                </span>
              </Link>
            ))
          ) : (
            <div
              className="col-span-full rounded-2xl p-4 text-sm text-white/85"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              {OUTCOME.emptyNoLeads}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
