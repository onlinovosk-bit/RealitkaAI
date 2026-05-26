"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { listLeads } from "@/lib/leads-store";
import LeadFilters from "@/components/leads/lead-filters";
import LeadCreateForm from "@/components/leads/lead-create-form";
import LeadsWorkspace from "@/components/leads/leads-workspace";
import AiPanel from "@/components/leads/ai-panel";
import EmptyState from "@/components/shared/empty-state";
import SemanticSearchBar from "@/components/search/SemanticSearchBar";
import { LeadsHotStrip } from "@/components/leads/LeadsHotStrip";
import type { Lead } from "@/lib/leads-store";
import type { Recommendation } from "@/lib/mock-data";
import { SLATE_HORIZON, WORKDESK_KPI } from "@/lib/slate-horizon-theme";

type TeamOption = {
  id: string;
  name: string;
};

type ProfileOption = {
  id: string;
  teamId: string | null;
  fullName: string;
  isActive: boolean;
};

export default function LeadsModule({
  leads,
  teams,
  profiles,
  recommendations,
}: {
  leads: Lead[];
  teams: TeamOption[];
  profiles: ProfileOption[];
  recommendations: Recommendation[];
}) {
  const [leadItems, setLeadItems] = useState(leads);
  const [filtered, setFiltered] = useState(leads);
  const [leadsLoading, setLeadsLoading] = useState(false);

  useEffect(() => {
    if (leads.length > 0) return;

    let cancelled = false;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setLeadsLoading(true);
    void listLeads(undefined, supabase)
      .then((rows) => {
        if (cancelled || rows.length === 0) return;
        setLeadItems(rows);
        setFiltered(rows);
      })
      .finally(() => {
        if (!cancelled) setLeadsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [leads.length]);

  useEffect(() => {
    setFiltered(leadItems);
  }, [leadItems]);

  const avgScore =
    filtered.length > 0
      ? Math.round(
          filtered.reduce((sum, lead) => sum + lead.score, 0) / filtered.length
        )
      : 0;

  const pageRecommendations = useMemo(
    () =>
      recommendations.filter((item) =>
        filtered.some((lead) => lead.id === item.leadId)
      ),
    [filtered, recommendations]
  );

  return (
    <>
      <LeadsHotStrip leads={filtered} />

      <div className="mb-6 flex flex-col gap-4">
        <SemanticSearchBar type="leads" className="w-full" />

        <LeadFilters
          leads={leadItems}
          teams={teams}
          profiles={profiles}
          onFilter={setFiltered}
        />

        <LeadCreateForm />
      </div>

      {leadsLoading ? (
        <p className="mb-4 text-center text-sm text-gray-500">Načítavam príležitosti…</p>
      ) : null}

      <section className="mb-4 grid grid-cols-2 gap-2 md:gap-4 xl:grid-cols-4">
        {[
          { label: "Príležitosti", value: filtered.length, color: SLATE_HORIZON.brand },
          { label: "Horúce", value: filtered.filter((i) => i.status === "Horúci").length, color: SLATE_HORIZON.red },
          { label: "Obhliadky", value: filtered.filter((i) => i.status === "Obhliadka").length, color: SLATE_HORIZON.brandDeep },
          { label: "Avg BRI", value: avgScore, color: SLATE_HORIZON.brandNavy },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-2xl border p-3 md:p-5"
            style={{
              background: WORKDESK_KPI.background,
              borderColor: WORKDESK_KPI.borderColor,
              boxShadow: WORKDESK_KPI.boxShadow,
            }}
          >
            <p className="text-xs text-slate-700" style={{ color: SLATE_HORIZON.navText }}>{label}</p>
            <h2 className="mt-1 text-2xl md:text-3xl font-bold tabular-nums text-slate-900" style={{ color }}>{value}</h2>
          </div>
        ))}
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          title="Zatiaľ nemáš žiadne príležitosti"
          description="Vytvor prvú príležitosť cez formulár vyššie alebo uprav filtre."
        />
      ) : (
        <section className="flex flex-col gap-8">
          <div className="min-w-0 w-full">
            <LeadsWorkspace leads={filtered} />
          </div>
          <div className="w-full max-w-2xl">
            <AiPanel
              title="AI odporúčania pre tím"
              recommendations={pageRecommendations.slice(0, 5)}
            />
          </div>
        </section>
      )}
    </>
  );
}
