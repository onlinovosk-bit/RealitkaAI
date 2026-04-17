"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AI_ASSISTANT_NAME } from "@/lib/ai-brand";
import { useOnboarding } from "../useOnboarding";

type SummaryResponse = {
  ok?: boolean;
  leadCount?: number;
  activePhases?: number;
  averageScore?: number | null;
  authenticated?: boolean;
};

function leadsSk(n: number): string {
  if (n <= 0) return "0 leadov";
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${n} leadov`;
  if (mod10 === 1) return `${n} lead`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} leady`;
  return `${n} leadov`;
}

export default function Step9({ slug }: { slug: string }) {
  const router = useRouter();
  const { formData, loaded: formLoaded } = useOnboarding(slug);

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/onboarding/summary", { cache: "no-store" });
        const data = (await res.json()) as SummaryResponse & { error?: string };
        if (!cancelled) {
          if (!res.ok) {
            setSummary({ leadCount: 0, activePhases: 0, averageScore: null });
          } else {
            setSummary(data);
          }
        }
      } catch {
        if (!cancelled) setSummary({ leadCount: 0, activePhases: 0, averageScore: null });
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const automationOn = useMemo(() => {
    const a = formData.automation;
    return [a.welcome, a.followUp, a.reminder, a.score, a.birthday].filter(Boolean).length;
  }, [formData.automation]);

  const leadCount = summary?.leadCount ?? 0;
  const activePhases = summary?.activePhases ?? 0;
  const avgScore = summary?.averageScore;

  const stats = useMemo(
    () => [
      { value: "24/7", label: "AI asistent aktívny" },
      {
        value: summaryLoading ? "…" : String(leadCount),
        label: "Leadov v CRM",
      },
      {
        value: summaryLoading ? "…" : String(activePhases),
        label: "Rôznych fáz (stavy leadov)",
      },
      {
        value: formLoaded ? String(automationOn) : "…",
        label: "Automatizácií zapnutých",
      },
      { value: "<2min", label: "Cieľový čas AI odpovede" },
      {
        value:
          summaryLoading
            ? "…"
            : avgScore == null || leadCount === 0
              ? "—"
              : String(avgScore),
        label: "Priemerné skóre leadov (0–100)",
      },
    ],
    [
      summaryLoading,
      leadCount,
      activePhases,
      avgScore,
      automationOn,
      formLoaded,
    ]
  );

  if (!formLoaded) {
    return (
      <div className="animate-pulse text-center text-gray-400 py-16">
        Načítavam súhrn…
      </div>
    );
  }

  return (
    <div className="animate-in zoom-in-95 fade-in duration-700">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-4xl font-extrabold mb-3 tracking-tight">Revolis.AI je živý!</h1>
        <p className="text-gray-500 text-base">
          Tvoj AI asistent {AI_ASSISTANT_NAME} je aktívny
          {leadCount === 0
            ? " — čaká na prvý lead."
            : ` — v CRM už máš ${leadsSk(leadCount)}.`}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="border border-gray-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight">{stat.value}</div>
            <div className="text-[11px] text-gray-400 mt-1 leading-tight">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3 max-w-lg mx-auto mb-8">
        {[
          { emoji: "📊", label: "Pozri si dashboard", desc: "Prehľad leadov, stavu klientov a štatistiky", href: "/dashboard" },
          { emoji: "🤖", label: "Otestuj AI asistenta", desc: "Pošli testovaciu otázku a pozri ako odpovedá", href: "/dashboard" },
          { emoji: "➕", label: "Pridaj prvý lead", desc: "Manuálne alebo cez import z portálu", href: "/leads" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between hover:border-gray-300 transition-all block"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{item.emoji}</span>
              <div>
                <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-400">{item.desc}</div>
              </div>
            </div>
            <span className="text-sm text-blue-600 font-medium whitespace-nowrap">Otvoriť →</span>
          </Link>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="bg-gray-900 text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-700 transition-all flex items-center gap-2"
        >
          ✨ Prejsť do Revolis.AI Dashboard
        </button>
      </div>
    </div>
  );
}
