"use client";

import { Activity, Lock } from "lucide-react";

type AccountTier = "market_vision" | "authority";

type KatasterMonitorCardProps = {
  parcelId: string;
  accountTier: AccountTier;
  currentWatchedCount: number;
  onActivate?: () => void;
  isSubmitting?: boolean;
};

const LIMIT = 100;

export default function KatasterMonitorCard({
  parcelId,
  accountTier,
  currentWatchedCount,
  onActivate,
  isSubmitting = false,
}: KatasterMonitorCardProps) {
  const isAuthority = accountTier === "authority";
  const hasReachedLimit = !isAuthority && currentWatchedCount >= LIMIT;

  return (
    <div
      className={`rounded-[2rem] border p-6 backdrop-blur-xl transition-all ${
        isAuthority
          ? "border-yellow-500/30 bg-yellow-500/5"
          : "border-white/5 bg-white/[0.02]"
      }`}
    >
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Activity className={isAuthority ? "text-yellow-500" : "text-blue-400"} size={20} />
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Kataster Pulse</h3>
        </div>
        {!isAuthority && (
          <span className="text-[10px] font-bold text-slate-500">
            {currentWatchedCount} / {LIMIT} slotov
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="text-xs leading-relaxed text-slate-400">
          Sledujeme zmeny na LV č. <span className="font-mono text-white">{parcelId}</span>. V prípade plomby,
          dedičstva alebo exekúcie dostanete okamžitý alert.
        </div>

        {hasReachedLimit ? (
          <div className="rounded-2xl border border-yellow-600/20 bg-yellow-600/10 p-4 text-center">
            <Lock className="mx-auto mb-2 text-yellow-600" size={16} />
            <p className="text-[10px] font-bold uppercase tracking-tighter text-yellow-600">
              Limit 100 parciel dosiahnutý
            </p>
            <button type="button" className="mt-2 text-[9px] font-black text-yellow-500 underline">
              UPGRADE NA PROTOCOL AUTHORITY
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onActivate}
            className="w-full rounded-xl border border-blue-500/20 bg-blue-600/10 py-3 text-[10px] font-black uppercase tracking-widest text-blue-400 transition-all hover:bg-blue-600/20 disabled:opacity-60"
          >
            {isSubmitting ? "Aktivujem..." : "Aktivovať sledovanie"}
          </button>
        )}
      </div>
    </div>
  );
}
