"use client";

import { useMemo, useState } from "react";
import LeadFilters from "@/components/leads/lead-filters";
import LeadCreateForm from "@/components/leads/lead-create-form";
import LeadsWorkspace from "@/components/leads/leads-workspace";
import AiPanel from "@/components/leads/ai-panel";
import EmptyState from "@/components/shared/empty-state";
import SemanticSearchBar from "@/components/search/SemanticSearchBar";
import type { Lead } from "@/lib/leads-store";
import type { Recommendation } from "@/lib/mock-data";

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
  const [filtered, setFiltered] = useState(leads);

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

  const hotLeads = filtered.filter((lead) => lead.status === "Horúci").length;
  const inspectionLeads = filtered.filter((lead) => lead.status === "Obhliadka").length;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4">
        <SemanticSearchBar type="leads" className="w-full" />

        <LeadFilters
          leads={leads}
          teams={teams}
          profiles={profiles}
          onFilter={setFiltered}
        />

        <LeadCreateForm />
      </div>

      <section className="mb-4 grid grid-cols-2 gap-2 md:gap-4 xl:grid-cols-4">
        {[
          {
            label: "Príležitosti",
            helper: "Kde mám peniaze dnes?",
            value: filtered.length,
            valueClass: "text-blue-700",
          },
          {
            label: "Horúce",
            helper: "Komu volať ako prvému?",
            value: hotLeads,
            valueClass: "text-red-600",
          },
          {
            label: "Obhliadky",
            helper: "Najbližší krok k provízii",
            value: inspectionLeads,
            valueClass: "text-emerald-700",
          },
          {
            label: "Avg BRI",
            helper: "Priemerná kvalita fronty",
            value: avgScore,
            valueClass: avgScore >= 85 ? "text-emerald-700" : avgScore >= 70 ? "text-amber-600" : "text-red-600",
          },
        ].map(({ label, helper, value, valueClass }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-5"
          >
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <h2 className={`mt-1 text-2xl font-bold tabular-nums md:text-3xl ${valueClass}`}>{value}</h2>
            <p className="mt-1 text-[11px] text-slate-500">{helper}</p>
          </div>
        ))}
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          title="Zatiaľ nemáš žiadne príležitosti"
          description="Vytvor prvú príležitosť cez formulár vyššie alebo uprav filtre."
        />
      ) : (
        <section className="flex flex-col gap-6">
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
