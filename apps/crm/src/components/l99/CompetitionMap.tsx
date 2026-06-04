"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { CompetitionSector } from "@/types/intelligence-hub";
import type { CompetitionRadarPayload } from "@/lib/hub/competition-radar";

type CompetitionMapProps = {
  isProtocolActive: boolean;
  onUpgrade?: () => void;
};

export const CompetitionMap = ({ isProtocolActive, onUpgrade }: CompetitionMapProps) => {
  const [payload, setPayload] = useState<CompetitionRadarPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!isProtocolActive) return;
    setLoading(true);
    setFetchError(null);
    fetch("/api/hub/competition-radar")
      .then(async (r) => {
        if (!r.ok) {
          const body = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${r.status}`);
        }
        return r.json() as Promise<CompetitionRadarPayload>;
      })
      .then(setPayload)
      .catch((e: unknown) => {
        setPayload(null);
        setFetchError(e instanceof Error ? e.message : "Nepodarilo sa načítať radar.");
      })
      .finally(() => setLoading(false));
  }, [isProtocolActive]);

  const sectors: CompetitionSector[] = payload?.sectors ?? [];
  const isEmpty = !loading && sectors.length === 0;

  if (!isProtocolActive) {
    return (
      <div className="relative overflow-hidden rounded-[3rem] border border-white/5 bg-[#0A0A12] p-8">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="mb-1 text-sm font-bold text-white">Protocol Authority Required</p>
          <p className="mb-4 max-w-xs text-xs text-slate-500">
            Radar konkurencie je dostupný len v pláne Protocol Authority.
          </p>
          {onUpgrade ? (
            <button
              type="button"
              onClick={onUpgrade}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black uppercase text-white transition-all hover:scale-105"
            >
              Upgradovať na Protocol Authority
            </button>
          ) : (
            <Link
              href="/billing"
              className="inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black uppercase text-white transition-all hover:scale-105"
            >
              Zobraziť plány
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[3rem] border border-white/5 bg-[#0A0A12] p-8">
      <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full bg-red-600/5 blur-3xl" />

      <div className="mb-8 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase italic tracking-[0.2em] text-white">
          Radar konkurencie (portálové inzeráty)
        </h3>
        {!isEmpty ? (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-[9px] font-bold uppercase text-red-500">Live</span>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span className="text-xs">Načítavam z portal_listings…</span>
        </div>
      ) : fetchError ? (
        <p className="py-8 text-center text-xs text-red-400">{fetchError}</p>
      ) : isEmpty ? (
        <div className="py-8 text-center">
          <p className="text-sm font-semibold text-slate-300">Zatiaľ žiadne dáta v radare</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
            {payload?.diagnosis ??
              "Zdroj portal_listings je prázdny. Spustite arbitrážny scan alebo portálový ingest — zobrazí sa hustota inzerátov podľa lokality (nie simulované sektory)."}
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-wider text-slate-600">
            Zdroj: portal_listings · {payload?.totalListings ?? 0} aktívnych záznamov
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {sectors.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="space-y-2"
            >
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span className="text-slate-400">{s.name}</span>
                <span
                  className={
                    s.heatScore > 70 ? "text-red-400" : s.heatScore > 40 ? "text-yellow-400" : "text-blue-400"
                  }
                >
                  {s.competitorCount}{" "}
                  {s.competitorCount === 1 ? "inzerát" : "inzerátov"} v zóne
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${s.heatScore}%` }}
                  transition={{ duration: 0.8, delay: i * 0.08 }}
                  className={`h-full rounded-full ${
                    s.heatScore > 70 ? "bg-red-600" : s.heatScore > 40 ? "bg-yellow-500" : "bg-blue-600"
                  }`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && !fetchError && payload && sectors.length > 0 ? (
        <p className="mt-8 text-center text-[8px] uppercase italic tracking-widest text-slate-600">
          {payload.diagnosis}
        </p>
      ) : null}
    </div>
  );
};
