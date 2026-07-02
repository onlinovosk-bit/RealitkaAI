"use client";

import {
  buildExecutiveSignals,
  formatMoneyEur,
} from "@/lib/workdesk/executive-signals";
import { countStaleLeads } from "@/lib/agents/deal-trigger";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";
import type { Lead } from "@/lib/leads-store";
import Link from "next/link";

type Props = {
  leads: Lead[];
};

export function WorkdeskCommandHero({ leads }: Props) {
  const signals = buildExecutiveSignals(leads, 3);
  const placeholders = signals.length === 0;
  const staleCount = countStaleLeads(leads);

  return (
    <section
      className="workdesk-command-hero relative mb-5 overflow-hidden rounded-[22px] p-7 text-white md:p-8"
      style={{
        background: SLATE_HORIZON.heroGradient,
        boxShadow: "0 24px 56px rgba(8,17,32,0.32)",
      }}
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
          AI REVENUE OPERATING SYSTEM
        </span>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-[44px] md:leading-[1.05]">
            Kde mám peniaze dnes?
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
          Revolis neukazuje dáta — vedie ťa ku krokom, ktoré najrýchliejšie posunú obchod k provízii.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["AI Priority Strip", "Lost Revenue Radar", "Call Order AI", "Owner Pressure View"].map((chip) => (
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
          {(placeholders
            ? [
                { leadId: "demo-1", name: "Lucia Šimko", moneyEur: 7200, confidence: 91, timing: "volať do 15 min" },
                { leadId: "demo-2", name: "Lukáš Nagy", moneyEur: null, confidence: 87, timing: "posunúť pipeline" },
                { leadId: "demo-3", name: "Jana Horváth", moneyEur: 5400, confidence: 78, timing: "poslať SMS dnes" },
              ]
            : signals.map((s) => ({
                leadId: s.leadId,
                name: s.name,
                moneyEur: s.moneyEur,
                confidence: s.confidence,
                timing: s.timing,
              }))
          ).map((item) => (
            <Link
              key={item.leadId}
              href={item.leadId.startsWith("demo-") ? "/leads" : `/leads/${item.leadId}`}
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
                {item.confidence}% istota · {item.timing}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
