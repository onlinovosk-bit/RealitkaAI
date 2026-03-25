"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AiPanel from "@/components/leads/ai-panel";
import ClientSummary from "@/components/leads/client-summary";
import LeadEditForm from "@/components/leads/lead-edit-form";
import LeadMatchesPanel from "@/components/leads/lead-matches-panel";
import {
  getAiRecommendationAuditByLeadId,
  getActivitiesByLeadId,
  getRecommendationsByLeadId,
  type AiRecommendationAuditItem,
  type ActivityType,
  type LeadActivity,
  type Lead,
  type Recommendation,
} from "@/lib/leads-store";

function getActivityBadgeClasses(type: ActivityType) {
  if (type === "Email") return "bg-blue-100 text-blue-700";
  if (type === "Obhliadka") return "bg-emerald-100 text-emerald-700";
  return "bg-amber-100 text-amber-700";
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isEdit = searchParams.get("edit") === "true";

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [aiAudit, setAiAudit] = useState<AiRecommendationAuditItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [savedMatches, setSavedMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshActivities() {
    const activitiesData = await getActivitiesByLeadId(id);
    setActivities(activitiesData);
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [leadResponse, activitiesData, recommendationsData, matchesResponse] = await Promise.all([
          fetch(`/api/leads/${id}`).then((response) => response.json()),
          getActivitiesByLeadId(id),
          getRecommendationsByLeadId(id),
          fetch(`/api/leads/${id}/matches`).then((response) => response.json()),
        ]);
        const aiAuditData = await getAiRecommendationAuditByLeadId(id);
        const leadData = leadResponse?.lead as Lead | undefined;

        if (!leadData) {
          router.push("/leads");
          return;
        }

        setLead(leadData);
        setActivities(activitiesData);
        setAiAudit(aiAuditData);
        setRecommendations(recommendationsData);
        setSavedMatches(matchesResponse.matches ?? []);
      } catch (error) {
        console.error("Failed to load lead:", error);
        router.push("/leads");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id, router]);

  if (isLoading) {
    return (
      <main className="p-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">Načítavam lead...</div>
        </div>
      </main>
    );
  }

  if (!lead) {
    return null;
  }

  if (isEdit) {
    return (
      <main className="p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <Link
              href={`/leads/${id}`}
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              ← Späť na detail
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Upraviť lead</h1>
            <p className="mt-1 text-gray-500">Aktualizujte informácie o klientovi</p>
          </div>

          <LeadEditForm lead={lead} onUpdate={(updatedLead) => setLead(updatedLead)} />
        </div>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <Link
            href="/leads"
            className="text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            ← Späť na leady
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{lead.name}</h1>
          <p className="mt-1 text-gray-500">Detail leadu a AI odporúčania</p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <ClientSummary lead={lead} />

            <LeadMatchesPanel
              leadId={id}
              initialMatches={savedMatches}
              onStatusUpdated={refreshActivities}
            />

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Aktivity</h2>

              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-gray-400 mt-2"></div>
                    <div className="flex-1">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getActivityBadgeClasses(activity.type)}`}>
                        {activity.type}
                      </span>
                      <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.date}</p>
                    </div>
                  </div>
                ))}

                {activities.length === 0 && (
                  <p className="text-sm text-gray-500">Žiadne aktivity zatiaľ.</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <AiPanel title="AI odporúčania" recommendations={recommendations} />

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">AI timeline</h2>
                <p className="text-sm text-gray-500">
                  História vytvorenia a úprav AI odporúčaní pre tento lead.
                </p>
              </div>

              <div className="space-y-3">
                {aiAudit.map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-900">{item.text}</p>
                    <p className="mt-2 text-xs text-gray-500">{item.date}</p>
                  </div>
                ))}

                {aiAudit.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                    Zatiaľ nie sú zaznamenané žiadne AI udalosti pre tento lead.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
