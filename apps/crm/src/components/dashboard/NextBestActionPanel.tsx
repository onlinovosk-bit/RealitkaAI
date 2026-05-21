"use client";

import Link from "next/link";
import { Phone, ArrowRight } from "lucide-react";
import {
  formatMoneyEur,
  getTopExecutiveSignal,
} from "@/lib/workdesk/executive-signals";
import { trackWorkdeskEvent } from "@/lib/workdesk/ai-telemetry";
import type { Lead } from "@/lib/leads-store";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

type Props = {
  leads: Lead[];
  loading?: boolean;
};

export function NextBestActionPanel({ leads, loading }: Props) {
  const top = getTopExecutiveSignal(leads);
  const placeholders = !top;

  const signal = top ?? {
    leadId: "demo-1",
    name: "Lucia Šimko",
    action: "🔥 Kontaktuj dnes – vysoká priorita",
    timing: "volať do 15 min",
    confidence: 91,
    moneyEur: 7200,
    urgency: "critical" as const,
    status: "Horúci" as const,
  };

  const leadHref = placeholders ? "/leads" : `/leads/${signal.leadId}`;
  const phone = !placeholders ? leads.find((l) => l.id === signal.leadId)?.phone : undefined;

  if (loading) {
    return (
      <div
        className="mb-6 animate-pulse rounded-3xl border p-6"
        style={{ background: WORKDESK_CARD.background, borderColor: WORKDESK_CARD.borderColor, minHeight: 140 }}
      />
    );
  }

  return (
    <section
      className="mb-6 overflow-hidden rounded-3xl border"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <div
        className="border-b px-5 py-3"
        style={{ borderColor: SLATE_HORIZON.line, background: SLATE_HORIZON.soft }}
      >
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: SLATE_HORIZON.brandDeep }}>
          Next Best Action
        </span>
      </div>

      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>
            Najvyšší dopad teraz
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight md:text-2xl" style={{ color: SLATE_HORIZON.ink }}>
            {signal.name}
            {signal.moneyEur ? (
              <span className="ml-2 text-lg font-bold" style={{ color: SLATE_HORIZON.money }}>
                {formatMoneyEur(signal.moneyEur)}
              </span>
            ) : null}
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: SLATE_HORIZON.navText }}>
            {signal.action}
          </p>
          <p className="mt-1 text-xs" style={{ color: SLATE_HORIZON.muted }}>
            {signal.confidence}% istota · {signal.timing}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Link
            href={leadHref}
            onClick={() =>
              trackWorkdeskEvent("next_best_action_click", {
                leadId: signal.leadId,
                placeholders,
              })
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: SLATE_HORIZON.brandDeep }}
          >
            Otvoriť lead
            <ArrowRight size={16} />
          </Link>
          {phone ? (
            <a
              href={`tel:${phone}`}
              onClick={() => trackWorkdeskEvent("call_now_click", { leadId: signal.leadId, surface: "dashboard_nba" })}
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-opacity hover:opacity-90"
              style={{
                borderColor: SLATE_HORIZON.line,
                color: SLATE_HORIZON.brandDeep,
                background: "#FFFFFF",
              }}
            >
              <Phone size={16} />
              Zavolať
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
