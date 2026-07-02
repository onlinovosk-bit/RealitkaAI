"use client";

import Link from "next/link";
import type { Lead } from "@/lib/leads-store";
import { isCriticalFollowUp, scoreFollowUp } from "@/lib/cron/follow-up-scoring";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

type Props = {
  leads: Lead[];
};

export function FollowUpTodayCard({ leads }: Props) {
  const critical = leads
    .filter((l) =>
      isCriticalFollowUp({
        id: l.id,
        name: l.name,
        last_contact: l.lastContact,
        ai_priority: l.aiPriority,
      }),
    )
    .slice(0, 5)
    .map((l) =>
      scoreFollowUp({
        id: l.id,
        name: l.name,
        last_contact: l.lastContact,
        ai_priority: l.aiPriority,
      }),
    );

  if (!critical.length) return null;

  return (
    <section
      className="rounded-2xl border p-5"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: SLATE_HORIZON.muted }}
          >
            Dnešné follow-upy
          </p>
          <h3 className="text-lg font-bold" style={{ color: SLATE_HORIZON.ink }}>
            {critical.length} urgentných kontaktov
          </h3>
        </div>
        <Link
          href="/leads"
          className="text-xs font-semibold"
          style={{ color: SLATE_HORIZON.brandDeep }}
        >
          Všetky leady →
        </Link>
      </div>
      <ul className="space-y-2">
        {critical.map((item) => (
          <li key={item.leadId}>
            <Link
              href={`/leads/${item.leadId}`}
              className="block rounded-xl border px-3 py-2.5 transition hover:bg-slate-50"
              style={{ borderColor: SLATE_HORIZON.line }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900">{item.leadName}</span>
                <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
                  {item.urgency}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">{item.suggestedAction}</p>
              <p className="text-[11px] text-slate-400">{item.reason}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
