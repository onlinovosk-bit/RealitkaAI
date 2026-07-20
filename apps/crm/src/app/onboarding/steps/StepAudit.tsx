"use client";

import { useEffect, useState } from "react";
import { FirstAuditPanel } from "@/components/dashboard/FirstAuditPanel";
import { OUTCOME } from "@/lib/copy/outcome-copy";
import type { FirstAuditResult } from "@/lib/workdesk/first-audit";
import { useOnboarding } from "../useOnboarding";
import { getPathProgress } from "../config";
import { PrimaryBtn, SecondaryBtn } from "./shared";

type AuditApiResponse = {
  ok?: boolean;
  audit?: FirstAuditResult;
  error?: string;
};

export default function StepAudit({ slug }: { slug: string }) {
  const { next, back, loaded, pathMode } = useOnboarding(slug);
  const progress = getPathProgress(slug, pathMode);
  const [audit, setAudit] = useState<FirstAuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/workdesk/first-audit", { cache: "no-store" });
        const data = (await res.json()) as AuditApiResponse;
        if (cancelled) return;
        if (!res.ok || !data.audit) {
          setError(data.error ?? "Prehľad sa nepodarilo načítať.");
          setAudit(null);
        } else {
          setAudit(data.audit);
        }
      } catch {
        if (!cancelled) setError("Prehľad sa nepodarilo načítať.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) return <div className="animate-pulse text-gray-400">Načítavam...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
        — KROK {progress.current} ZO {progress.total} —
      </p>
      <h1 className="mb-2 text-3xl font-bold text-gray-900">{OUTCOME.firstAuditTitle}</h1>
      <p className="mb-6 text-gray-500">{OUTCOME.firstAuditSubtitle}</p>

      {error ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error} Môžete pokračovať — prehľad uvidíte aj na dashboarde.
        </div>
      ) : null}

      <FirstAuditPanel
        audit={audit}
        loading={loading}
        onContinue={next}
        continueLabel="Pokračovať k dokončeniu →"
      />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
        <PrimaryBtn onClick={next}>Preskočiť na Hotovo →</PrimaryBtn>
      </div>
    </div>
  );
}
