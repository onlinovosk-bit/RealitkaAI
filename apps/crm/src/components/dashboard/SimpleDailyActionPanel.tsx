"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateAIInsights, Lead } from "@/lib/ai-engine";
import { SLATE_HORIZON, WORKDESK_INNER_ROW, WORKDESK_PANEL } from "@/lib/slate-horizon-theme";

export default function SimpleDailyActionPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchLeads() {
      setLoading(true);
      const res = await fetch("/api/leads");
      const leads: Lead[] = await res.json();
      if (!leads || leads.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }
      const ai = generateAIInsights(leads);
      setItems(ai);
      setLoading(false);
    }
    fetchLeads();
  }, []);

  const handleAction = (type: string, lead: Lead) => {
    if (type === "call") {
      window.location.href = `tel:${lead.phone}`;
    }
    if (type === "sms") {
      window.location.href = `sms:${lead.phone}`;
    }
    if (type === "detail") {
      router.push(`/leads/${lead.id}`);
    }
  };

  return (
    <div
      className="rounded-[20px] border p-4 md:p-5"
      style={{
        background: WORKDESK_PANEL.background,
        borderColor: WORKDESK_PANEL.borderColor,
        boxShadow: WORKDESK_PANEL.boxShadow,
      }}
    >
      <h2 className="mb-3 text-base font-semibold" style={{ color: SLATE_HORIZON.deep }}>
        🤖 AI odporúčania na dnes
      </h2>

      {loading && (
        <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
          Analyzujeme tvoje leady...
        </p>
      )}
      {!loading && items.length === 0 && (
        <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
          Zatiaľ nemáš leady – pridaj prvý a AI ti začne odporúčať ďalšie kroky
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item, index) => (
          <li
            key={index}
            className="rounded-2xl border p-3"
            style={{
              background: WORKDESK_INNER_ROW.background,
              borderColor: WORKDESK_INNER_ROW.borderColor,
            }}
          >
            <div className="text-sm font-semibold" style={{ color: SLATE_HORIZON.deep }}>
              {item.temperature} {item.lead.name}
            </div>

            <div className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
              👉 {item.action}
            </div>

            <div className="mt-1 text-xs" style={{ color: SLATE_HORIZON.muted }}>
              Na základe dát:
              {item.explanation.map((e: string, i: number) => (
                <span key={i}> • {e}</span>
              ))}
            </div>

            <div className="mt-1 text-xs font-medium" style={{ color: SLATE_HORIZON.greenDark }}>
              {Math.round(item.confidence ?? 80)}% istota
            </div>

            <div className="mt-2 flex gap-2">
              <button
                onClick={() => handleAction("call", item.lead)}
                className="cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-opacity duration-200 hover:opacity-90"
                style={{ background: SLATE_HORIZON.brand }}
              >
                Zavolať
              </button>

              <button
                onClick={() => handleAction("sms", item.lead)}
                className="cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors duration-200 hover:border-blue-200"
                style={{
                  borderColor: SLATE_HORIZON.line,
                  color: SLATE_HORIZON.brandDeep,
                  background: SLATE_HORIZON.cardBg,
                }}
              >
                SMS
              </button>

              <button
                onClick={() => handleAction("detail", item.lead)}
                className="cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors duration-200 hover:border-blue-200"
                style={{
                  borderColor: SLATE_HORIZON.line,
                  color: SLATE_HORIZON.navText,
                  background: SLATE_HORIZON.bg,
                }}
              >
                Detail
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
