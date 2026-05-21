"use client";

import Link from "next/link";
import { GitBranch } from "lucide-react";
import { buildExecutiveSignals } from "@/lib/workdesk/executive-signals";
import { trackWorkdeskEvent } from "@/lib/workdesk/ai-telemetry";
import type { Lead } from "@/lib/leads-store";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

type Props = {
  leads: Lead[];
};

const PIPELINE_STATUSES = new Set(["Obhliadka", "Ponuka", "Horúci"]);

/** Pipeline screen NBA — „Ktorý deal treba posunúť dnes?" */
export function PipelineActionStrip({ leads }: Props) {
  const pipelineLeads = leads.filter((l) => PIPELINE_STATUSES.has(l.status));
  const signals = buildExecutiveSignals(pipelineLeads.length > 0 ? pipelineLeads : leads, 3);

  const items =
    signals.length > 0
      ? signals
      : [
          {
            leadId: "demo-p1",
            name: "Peter Urban",
            action: "Posunúť do ponuky — obhliadka prebehla",
            timing: "dnes",
            confidence: 84,
            moneyEur: 9600,
            urgency: "high" as const,
            status: "Obhliadka" as const,
          },
          {
            leadId: "demo-p2",
            name: "Zuzana Kráľová",
            action: "Zavolať — ponuka čaká na odpoveď",
            timing: "volať do 15 min",
            confidence: 79,
            moneyEur: 7200,
            urgency: "critical" as const,
            status: "Ponuka" as const,
          },
        ];

  return (
    <section
      className="mb-6 overflow-hidden rounded-2xl border"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <div
        className="flex items-center gap-2 border-b px-4 py-3"
        style={{ borderColor: SLATE_HORIZON.line, background: SLATE_HORIZON.soft }}
      >
        <GitBranch size={16} style={{ color: SLATE_HORIZON.brandDeep }} />
        <h2 className="text-sm font-black uppercase tracking-wide" style={{ color: SLATE_HORIZON.brandDeep }}>
          Ktorý deal treba posunúť dnes?
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((signal) => (
          <Link
            key={signal.leadId}
            href={signal.leadId.startsWith("demo-") ? "/pipeline" : `/leads/${signal.leadId}`}
            onClick={() =>
              trackWorkdeskEvent("dashboard_module_open", {
                surface: "pipeline_action",
                leadId: signal.leadId,
              })
            }
            className="rounded-xl border p-3 transition-all hover:shadow-sm"
            style={{ borderColor: SLATE_HORIZON.line }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold" style={{ color: SLATE_HORIZON.ink }}>
                {signal.name}
              </p>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                style={{
                  background: SLATE_HORIZON.soft,
                  color: SLATE_HORIZON.brandDeep,
                }}
              >
                {signal.status}
              </span>
            </div>
            <p className="mt-1 text-xs" style={{ color: SLATE_HORIZON.muted }}>
              {signal.action}
            </p>
            <p className="mt-2 text-[11px]" style={{ color: SLATE_HORIZON.navText }}>
              {signal.confidence}% · {signal.timing}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
