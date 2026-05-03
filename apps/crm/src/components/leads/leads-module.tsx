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
          { label: "Príležitosti", value: filtered.length, color: "#22D3EE" },
          { label: "Horúce", value: filtered.filter((i) => i.status === "Horúci").length, color: "#EF4444" },
          { label: "Obhliadky", value: filtered.filter((i) => i.status === "Obhliadka").length, color: "#0EA5E9" },
          { label: "Avg BRI", value: avgScore, color: "#A855F7" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-2xl border p-3 md:p-5"
            style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
          >
            <p className="text-xs" style={{ color: "#64748B" }}>{label}</p>
            <h2 className="mt-1 text-2xl md:text-3xl font-bold tabular-nums" style={{ color }}>{value}</h2>
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
