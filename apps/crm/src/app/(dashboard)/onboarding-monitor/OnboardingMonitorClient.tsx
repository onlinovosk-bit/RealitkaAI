"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

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
  if (risk === "high") return { label: "Vysoké riziko", bg: "#FEE2E2", color: SLATE_HORIZON.danger, border: "#FECACA" };
  if (risk === "medium") return { label: "Stredné riziko", bg: "#FEF3C7", color: SLATE_HORIZON.warning, border: "#FDE68A" };
  return { label: "V poriadku", bg: "#D1FAE5", color: SLATE_HORIZON.greenDark, border: "#A7F3D0" };
}

function scoreColor(score: number) {
  if (score >= 75) return SLATE_HORIZON.green;
  if (score >= 50) return SLATE_HORIZON.warning;
  return SLATE_HORIZON.red;
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

type LoadState = "loading" | "ready" | "empty" | "error";

export default function OnboardingMonitorClient() {
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<AtRiskResponse>({ total: 0, atRisk: 0, clients: [] });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/onboarding/mvp/at-risk", { credentials: "include" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setState("error");
          return;
        }
        if (!res.ok) {
          setState("empty");
          return;
        }
        const json = (await res.json()) as AtRiskResponse & { data?: AtRiskResponse };
        const payload = json.data ?? json;
        setData({
          total: payload.total ?? 0,
          atRisk: payload.atRisk ?? 0,
          clients: payload.clients ?? [],
        });
        setState(payload.total === 0 && payload.clients.length === 0 ? "empty" : "ready");
      })
      .catch(() => {
        if (!cancelled) setState("empty");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const avgScore =
    data.clients.length > 0
      ? Math.round(data.clients.reduce((s, c) => s + c.readiness_score, 0) / data.clients.length)
      : 0;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: SLATE_HORIZON.bg }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold" style={{ color: SLATE_HORIZON.ink }}>Onboarding Automat</h1>
          <p className="text-sm mt-1" style={{ color: SLATE_HORIZON.muted }}>Sledovanie adopcie klientov</p>
        </div>

        {state === "loading" ? (
          <div className="text-center py-12 text-sm" style={{ color: SLATE_HORIZON.muted }}>
            Načítavam onboarding dáta…
          </div>
        ) : null}

        {state === "error" ? (
          <div className="text-center py-12 text-sm" style={{ color: SLATE_HORIZON.muted }}>
            Nepodarilo sa načítať onboarding dáta (401).
            <br />
            <Link href="/login" className="text-xs underline mt-2 inline-block" style={{ color: SLATE_HORIZON.brand }}>
              Prihlásiť sa znova
            </Link>
          </div>
        ) : null}

        {state === "empty" ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Onboarding dáta ešte nie sú k dispozícii.
            <br />
            <span className="text-xs">Modul bude dostupný čoskoro.</span>
          </div>
        ) : null}

        {state === "ready" ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Celkovo klientov", value: data.total },
                { label: "At-risk klientov", value: data.atRisk, highlight: data.atRisk > 0 },
                { label: "Priemerné skóre", value: `${avgScore}%` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border p-4 text-center"
                  style={{
                    background: WORKDESK_CARD.background,
                    borderColor: WORKDESK_CARD.borderColor,
                    boxShadow: WORKDESK_CARD.boxShadow,
                  }}
                >
                  <div
                    className="text-2xl font-bold"
                    style={{ color: stat.highlight ? SLATE_HORIZON.red : SLATE_HORIZON.ink }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-xs mt-1" style={{ color: SLATE_HORIZON.muted }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {data.clients.length === 0 ? (
              <div
                className="rounded-2xl border p-8 text-center"
                style={{
                  background: WORKDESK_CARD.background,
                  borderColor: WORKDESK_CARD.borderColor,
                  boxShadow: WORKDESK_CARD.boxShadow,
                }}
              >
                <p style={{ color: SLATE_HORIZON.muted }}>Žiadni at-risk klienti.</p>
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
                      style={{
                        background: WORKDESK_CARD.background,
                        borderColor: WORKDESK_CARD.borderColor,
                        boxShadow: WORKDESK_CARD.boxShadow,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm" style={{ color: SLATE_HORIZON.ink }}>{client.company}</div>
                          <div className="text-xs mt-0.5" style={{ color: SLATE_HORIZON.muted }}>
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
                          <span className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
                            {timeAgo(client.last_activity_at)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs" style={{ color: SLATE_HORIZON.muted }}>Readiness</span>
                          <span className="text-xs font-semibold" style={{ color }}>{client.readiness_score}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: SLATE_HORIZON.line }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${client.readiness_score}%`, background: color }}
                          />
                        </div>
                      </div>

                      {client.missingSteps.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {client.missingSteps.map((step) => (
                            <span
                              key={step}
                              className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                              style={{
                                background: SLATE_HORIZON.bg,
                                color: SLATE_HORIZON.muted,
                                border: `1px solid ${SLATE_HORIZON.line}`,
                              }}
                            >
                              {STEP_LABELS[step] ?? step}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : null}

        <div className="mt-6">
          <Link href="/dashboard" className="text-xs" style={{ color: SLATE_HORIZON.brand }}>← Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
