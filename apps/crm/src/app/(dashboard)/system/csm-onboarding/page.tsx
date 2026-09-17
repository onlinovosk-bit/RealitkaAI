"use client";

import { useEffect, useState } from "react";

type AtRiskClient = {
  id: string;
  company: string;
  contact_name: string | null;
  contact_email: string;
  readiness_score: number;
  risk: "high" | "medium" | "low";
  missingSteps: string[];
  last_activity_at: string | null;
};

const STEP_LABELS: Record<string, string> = {
  connectedCrm: "CRM pripojené",
  importedLeads: "Leady importované",
  configuredTeam: "Tím nastavený",
  firstAutomationLive: "Prvá automatizácia live",
  firstAiBriefViewed: "AI briefing pozretý",
  firstMeetingBooked: "Prvý meeting booked",
};

export default function CsmOnboardingPage() {
  const [clients, setClients] = useState<AtRiskClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      const res = await fetch("/api/onboarding/mvp/at-risk", { credentials: "include" });
      if (res.status === 401) {
        setClients([]);
        setLoadError("Nepodarilo sa načítať onboarding dáta (401).");
        setLoading(false);
        return;
      }
      if (res.status === 403) {
        setClients([]);
        setLoadError("Tento prehľad je dostupný len správcovi platformy.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setClients([]);
        setLoadError("Onboarding dáta ešte nie sú k dispozícii.");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { clients?: AtRiskClient[]; data?: { clients?: AtRiskClient[] } };
      const clientsPayload = data.data?.clients ?? data.clients ?? [];
      setClients(clientsPayload);
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <main className="p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">CSM Dashboard — At-risk klienti</h1>
          <p className="text-sm text-gray-500">
            MVP pre onboarding riziká. Email dispatch beží cez cron
            {" "}
            <code className="text-xs">/api/cron/onboarding-dispatch</code>
            {" "}
            (Bearer CRON_SECRET) — bez manuálneho send z UI.
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Načítavam at-risk klientov...</div>
        ) : loadError ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">{loadError}</div>
        ) : clients.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700">
            Žiadni at-risk klienti. Všetko je zelené.
          </div>
        ) : (
          <div className="grid gap-4">
            {clients.map((client) => (
              <article key={client.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{client.company}</h2>
                    <p className="text-sm text-slate-500">
                      {client.contact_name ?? "Kontakt"} · {client.contact_email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Readiness: {client.readiness_score}%
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        client.risk === "high"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {client.risk.toUpperCase()} RISK
                    </span>
                  </div>
                </div>

                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Chýbajúce kroky</p>
                <ul className="flex flex-wrap gap-2">
                  {client.missingSteps.map((step) => (
                    <li key={step} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                      {STEP_LABELS[step] ?? step}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
