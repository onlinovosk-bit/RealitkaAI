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
  const [dispatchStatus, setDispatchStatus] = useState<string>("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/onboarding/mvp/at-risk");
      const data = (await res.json()) as { clients?: AtRiskClient[] };
      setClients(data.clients ?? []);
      setLoading(false);
    }
    void load();
  }, []);

  async function runDispatchNow() {
    setDispatchStatus("Odosielam D1/D3/D7 správy...");
    const res = await fetch("/api/onboarding/mvp/messages/dispatch", { method: "POST" });
    const data = (await res.json()) as { processed?: number; sent?: number; failed?: number; error?: string };
    if (!res.ok) {
      setDispatchStatus(`Dispatch zlyhal: ${data.error ?? "unknown_error"}`);
      return;
    }
    setDispatchStatus(`Dispatch hotový. Processed: ${data.processed ?? 0}, sent: ${data.sent ?? 0}, failed: ${data.failed ?? 0}.`);
  }

  return (
    <main className="p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CSM Dashboard — At-risk klienti</h1>
            <p className="text-sm text-gray-500">MVP pre onboarding riziká + D1/D3/D7 message dispatch.</p>
          </div>
          <button
            type="button"
            onClick={runDispatchNow}
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-700"
          >
            Spustiť dispatch správ
          </button>
        </div>

        {dispatchStatus ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {dispatchStatus}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Načítavam at-risk klientov...</div>
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

