"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  Brain,
  ChevronDown,
  Mail,
  Radar,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import type { AiActivityFeedItem, AiActivityType } from "@/lib/app-mode-types";
import { RadiantSpriteIcon } from "@/components/shared/radiant-sprite-icon";

function iconForType(t: AiActivityType) {
  switch (t) {
    case "matching":
      return Sparkles;
    case "ghosting_recovery":
      return Mail;
    case "bri_regional":
    case "bri_delta":
      return TrendingUp;
    case "scoring":
      return Brain;
    case "market_scan":
      return Radar;
    case "insights":
    default:
      return Activity;
  }
}

function labelForType(t: AiActivityType): string {
  switch (t) {
    case "matching":
      return "Párovanie";
    case "ghosting_recovery":
      return "Obnovenie kontaktu";
    case "bri_regional":
      return "BRI · región";
    case "bri_delta":
      return "BRI · live";
    case "scoring":
      return "Scoring";
    case "market_scan":
      return "Sken trhu";
    case "insights":
    default:
      return "Insight";
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("sk-SK", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatMetaLabel(key: string) {
  const labels: Record<string, string> = {
    leadId: "Lead ID",
    propertyId: "Nehnuteľnosť",
    region: "Región",
    briEstimate: "Odhad BRI",
    matchScore: "Match skóre",
    propertyLabel: "Nehnuteľnosť",
    leadName: "Meno klienta",
    daysSilent: "Dní bez odpovede",
    leadCount: "Počet leadov",
    zones: "Počet zón",
  };
  return labels[key] ?? key;
}

function nextStepForType(t: AiActivityType): string {
  switch (t) {
    case "matching":
      return "Kontaktuj klienta do 2 hodín, potvrď záujem a navrhni konkrétny termín obhliadky.";
    case "ghosting_recovery":
      return "Pošli krátky follow-up s jednou novou relevantnou ponukou a naplánuj pripomienku o 24 hodín.";
    case "bri_regional":
    case "bri_delta":
      return "Prioritizuj klientov s najvyšším rastom BRI a zavolaj top 3 ešte dnes.";
    case "scoring":
      return "Skontroluj dôvod skóre a posuň príležitosť do ďalšej fázy stavu klientov, ak sú splnené podmienky.";
    case "market_scan":
      return "Porovnaj nové zóny dopytu s aktuálnymi ponukami a priprav 1-2 cielené oslovovacie kampane.";
    case "insights":
    default:
      return "Vyber jednu akciu s najvyšším dopadom a priraď ju konkrétnemu maklérovi s termínom dokončenia.";
  }
}

export function AIActivityFeed({ items }: { items: AiActivityFeedItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-slate-950/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="pt-0.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400/90">
            AI Aktivita
          </p>
          <h3 className="text-lg font-semibold text-slate-100">
            Prečo AI urobila krok
          </h3>
        </div>
        <RadiantSpriteIcon icon="pipeline" sizeClassName="h-12 w-12" className="mt-0.5" />
      </div>

      <ol className="relative space-y-0 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-gradient-to-b before:from-indigo-500/50 before:via-indigo-500/15 before:to-transparent">
        {items.map((item) => {
          const Icon = iconForType(item.activityType);
          const isExpanded = expandedId === item.id;
          const hasMeta = Boolean(item.meta && Object.keys(item.meta).length > 0);

          return (
            <li key={item.id} className="relative flex gap-4 pl-1">
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-500/30 bg-slate-900/90 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.25)]">
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
                    {labelForType(item.activityType)}
                  </span>
                  <time
                    className="text-[11px] text-slate-500"
                    dateTime={item.createdAt}
                  >
                    {formatTime(item.createdAt)}
                  </time>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="mt-1 w-full rounded-md p-1 text-left transition-colors hover:bg-indigo-500/5"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-100">{item.title}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-indigo-300 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                    {item.body}
                  </span>
                  <span className="mt-1 block text-[11px] text-indigo-300/80">
                    Klikni pre konkrétny návrh ďalšieho kroku
                  </span>
                </button>
                {isExpanded && (
                  <div className="mt-3 rounded-lg border border-indigo-500/20 bg-slate-900/60 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-300">
                      Detail pre makléra
                    </p>
                    <p className="mt-2 text-xs text-cyan-300">
                      Odporúčaný ďalší krok: {nextStepForType(item.activityType)}
                    </p>
                    {hasMeta ? (
                      <div className="mt-2 space-y-1">
                        {Object.entries(item.meta ?? {}).map(([key, value]) => (
                          <p key={key} className="text-xs text-slate-300">
                            <span className="text-slate-400">{formatMetaLabel(key)}:</span>{" "}
                            {String(value)}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">
                        K tomuto kroku zatiaľ nie sú dostupné doplnkové metadáta.
                      </p>
                    )}
                    {(item.meta?.leadId || item.meta?.propertyId) && (
                      <div className="mt-3 flex gap-2">
                        {item.meta?.leadId && (
                          <Link
                            href={`/leads/${String(item.meta.leadId)}`}
                            className="rounded-md border border-cyan-400/40 px-2 py-1 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-400/10"
                          >
                            Otvoriť príležitosť
                          </Link>
                        )}
                        {item.meta?.propertyId && (
                          <Link
                            href={`/properties/${String(item.meta.propertyId)}`}
                            className="rounded-md border border-indigo-400/40 px-2 py-1 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-400/10"
                          >
                            Otvoriť nehnuteľnosť
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
