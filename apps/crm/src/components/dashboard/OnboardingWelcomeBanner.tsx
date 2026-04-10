"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type OnboardingData = {
  name?: string;
  agencyName?: string;
  city?: string;
  aiName?: string;
  primaryGoal?: string;
  kpiLeads?: number;
  importSource?: string;
};

const GOAL_LABELS: Record<string, string> = {
  more_leads: "Získať viac leadov",
  faster_close: "Rýchlejšie zatváranie",
  automate: "Automatizovať prácu",
  analytics: "Lepšia analytika",
};

export default function OnboardingWelcomeBanner() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("welcome_dismissed")) { setDismissed(true); return; }
    const raw = localStorage.getItem("onboarding_data");
    if (raw) {
      try { setData(JSON.parse(raw)); } catch { /* ignore */ }
    }
  }, []);

  if (dismissed || !data?.agencyName) return null;

  const goalLabel = data.primaryGoal ? GOAL_LABELS[data.primaryGoal] : null;

  return (
    <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🎉</span>
            <h3 className="font-bold text-gray-900 text-base">
              Vitaj, {data.name || data.agencyName}!
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            <strong>{data.agencyName}</strong>
            {data.city ? ` · ${data.city}` : ""}
            {data.aiName ? ` · AI asistent: ${data.aiName}` : ""}
            {goalLabel ? ` · Cieľ: ${goalLabel}` : ""}
            {data.kpiLeads ? ` · ${data.kpiLeads} leadov/mesiac` : ""}
          </p>
          <div className="flex gap-2 flex-wrap">
            <Link href="/leads" className="text-xs font-semibold bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition">
              ➕ Pridaj prvý lead
            </Link>
            <Link href="/onboarding" className="text-xs font-semibold border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-white transition">
              ⚙️ Upraviť nastavenia
            </Link>
          </div>
        </div>
        <button
          onClick={() => { localStorage.setItem("welcome_dismissed", "1"); setDismissed(true); }}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0"
          aria-label="Zavrieť"
        >
          ×
        </button>
      </div>
    </div>
  );
}
