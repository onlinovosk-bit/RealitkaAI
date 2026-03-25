"use client";

import { useMemo, useState } from "react";
import LeadFilters from "@/components/leads/lead-filters";
import LeadCreateForm from "@/components/leads/lead-create-form";
import LeadsWorkspace from "@/components/leads/leads-workspace";
import AiPanel from "@/components/leads/ai-panel";
import EmptyState from "@/components/shared/empty-state";
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
        <LeadFilters
          leads={leads}
          teams={teams}
          profiles={profiles}
          onFilter={setFiltered}
        />

        <LeadCreateForm />
      </div>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Zobrazené leady</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{filtered.length}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Horúce leady</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {filtered.filter((item) => item.status === "Horúci").length}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Obhliadky</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {filtered.filter((item) => item.status === "Obhliadka").length}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Priemerné skóre</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{avgScore}</h2>
        </div>
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          title="Zatiaľ nemáš žiadne leady"
          description="Vytvor prvý lead cez formulár vyššie alebo uprav filtre."
        />
      ) : (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <LeadsWorkspace leads={filtered} />
          </div>

          <div>
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
