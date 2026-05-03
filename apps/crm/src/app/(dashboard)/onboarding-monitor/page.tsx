import Link from "next/link";

const STEP_LABELS: Record<string, string> = {
  connectedCrm: "CRM prepojenie",
  importedLeads: "Import leadov",
  configuredTeam: "Tím nastavený",
  firstAutomationLive: "Automatizácia aktívna",
  firstAiBriefViewed: "AI brief",
  firstMeetingBooked: "1. stretnutie",
};

function timeAgo(iso?: string | null): string {
  if (!iso) return "nikdy";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "práve teraz";
  if (diff < 3600) return `pred ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `pred ${Math.floor(diff / 3600)} hod`;
  return `pred ${Math.floor(diff / 86400)} dňami`;
}

function riskBadge(risk: string) {
  if (risk === "high") return { label: "Vysoké riziko", bg: "rgba(239,68,68,0.15)", color: "#F87171", border: "rgba(239,68,68,0.3)" };
  if (risk === "medium") return { label: "Stredné riziko", bg: "rgba(245,158,11,0.15)", color: "#FCD34D", border: "rgba(245,158,11,0.3)" };
  return { label: "V poriadku", bg: "rgba(34,197,94,0.15)", color: "#4ADE80", border: "rgba(34,197,94,0.3)" };
}

function scoreColor(score: number) {
  if (score >= 75) return "#4ADE80";
  if (score >= 50) return "#FCD34D";
  return "#F87171";
}

type Client = {
  id: string;
  company: string;
  contact_name: string | null;
  contact_email: string;
  readiness_score: number;
  risk: "high" | "medium" | "low";
  missingSteps: string[];
  last_activity_at: string | null;
};

type AtRiskResponse = {
  total: number;
  atRisk: number;
  clients: Client[];
};

async function fetchAtRisk(): Promise<AtRiskResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/onboarding/mvp/at-risk`, { cache: "no-store" });
    if (!res.ok) return { total: 0, atRisk: 0, clients: [] };
    return (await res.json()) as AtRiskResponse;
  } catch {
    return { total: 0, atRisk: 0, clients: [] };
  }
}

export default async function OnboardingMonitorPage() {
  const data = await fetchAtRisk();
  const avgScore = data.clients.length > 0
    ? Math.round(data.clients.reduce((s, c) => s + c.readiness_score, 0) / data.clients.length)
    : 0;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "#050914" }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold" style={{ color: "#F0F9FF" }}>Onboarding Automat</h1>
          <p className="text-sm mt-1" style={{ color: "#64748B" }}>Sledovanie adopcie klientov</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Celkovo klientov", value: data.total },
            { label: "At-risk klientov", value: data.atRisk, highlight: data.atRisk > 0 },
            { label: "Priemerné skóre", value: `${avgScore}%` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border p-4 text-center"
              style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
            >
              <div
                className="text-2xl font-bold"
                style={{ color: stat.highlight ? "#F87171" : "#F0F9FF" }}
              >
                {stat.value}
              </div>
              <div className="text-xs mt-1" style={{ color: "#64748B" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Client list */}
        {data.clients.length === 0 ? (
          <div
            className="rounded-2xl border p-8 text-center"
            style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
          >
            <p style={{ color: "#475569" }}>Žiadni at-risk klienti.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.clients.map((client) => {
              const badge = riskBadge(client.risk);
              const color = scoreColor(client.readiness_score);
              return (
                <div
                  key={client.id}
                  className="rounded-2xl border p-4"
                  style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm" style={{ color: "#F0F9FF" }}>{client.company}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                        {client.contact_name ? `${client.contact_name} · ` : ""}{client.contact_email}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs" style={{ color: "#64748B" }}>
                        {timeAgo(client.last_activity_at)}
                      </span>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: "#64748B" }}>Readiness</span>
                      <span className="text-xs font-semibold" style={{ color }}>{client.readiness_score}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#0F1F3D" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${client.readiness_score}%`, background: color }}
                      />
                    </div>
                  </div>

                  {/* Missing steps */}
                  {client.missingSteps.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {client.missingSteps.map((step) => (
                        <span
                          key={step}
                          className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                          style={{ background: "rgba(100,116,139,0.12)", color: "#94A3B8", border: "1px solid rgba(100,116,139,0.2)" }}
                        >
                          {STEP_LABELS[step] ?? step}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <Link href="/dashboard" className="text-xs" style={{ color: "#22D3EE" }}>← Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
