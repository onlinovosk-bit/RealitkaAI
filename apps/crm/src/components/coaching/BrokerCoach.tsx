"use client";

import { Lightbulb, TrendingDown, Trophy, Zap } from "lucide-react";

type BrokerCoachProps = {
  brokerStats: {
    followUpRankLabel: string;
    dealVelocityLabel: string;
    dealVelocityDeltaLabel: string;
  };
  insight: string;
  streakDays: number;
};

export default function BrokerCoach({ brokerStats, insight, streakDays }: BrokerCoachProps) {
  return (
    <div className="relative overflow-hidden rounded-[3rem] border border-white/5 bg-gradient-to-br from-[#050505] to-[#0a0a0b] p-8 shadow-2xl">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" />

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/20 p-2">
            <Zap className="text-blue-500" size={20} />
          </div>
          <h2 className="text-sm font-black italic uppercase tracking-widest text-white">Revolis AI Coaching</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
          <Trophy className="text-yellow-500" size={12} />
          <span className="text-[9px] font-black uppercase text-slate-400">{streakDays} Day Streak</span>
        </div>
      </div>

      <div className="space-y-6">
        <div className="relative rounded-2xl border border-blue-500/20 bg-blue-600/5 p-6">
          <Lightbulb className="absolute right-4 top-4 text-blue-500/30" size={32} />
          <p className="mb-2 text-[10px] font-bold uppercase text-blue-500">Insight týždňa</p>
          <p className="text-sm font-medium italic leading-relaxed text-slate-200">"{insight}"</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <p className="mb-1 text-[8px] font-black uppercase tracking-tighter text-slate-500">Follow-up Rank</p>
            <div className="flex items-end gap-2">
              <span className="text-lg font-black text-white">{brokerStats.followUpRankLabel}</span>
              <TrendingDown size={14} className="mb-1 text-red-500" />
            </div>
            <p className="mt-1 text-[7px] uppercase text-slate-600">V regióne Prešov</p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <p className="mb-1 text-[8px] font-black uppercase tracking-tighter text-slate-500">Deal Velocity</p>
            <span className="text-lg font-black text-white">{brokerStats.dealVelocityLabel}</span>
            <p className="mt-1 text-[7px] uppercase text-emerald-500">{brokerStats.dealVelocityDeltaLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
