"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import type { CompetitionSector } from "@/types/intelligence-hub";

type Sector = { name: string; count: number; heat: number };

const DEFAULT_SECTORS: Sector[] = [
  { name: "Sekčov", count: 4, heat: 80 },
  { name: "Sídlisko III", count: 1, heat: 25 },
  { name: "Terasa", count: 6, heat: 95 },
  { name: "Solivar", count: 2, heat: 45 },
  { name: "Záborské", count: 0, heat: 8 },
];

type CompetitionMapProps = {
  isProtocolActive: boolean;
  onUpgrade?: () => void;
  sectors?: CompetitionSector[];
};

function normalizeSectors(sectors?: CompetitionSector[]): Sector[] {
  if (!sectors || sectors.length === 0) return DEFAULT_SECTORS;
  return sectors.map((s) => ({
    name: s.name,
    count: s.competitorCount,
    heat: s.heatScore,
  }));
}

export const CompetitionMap = ({ isProtocolActive, onUpgrade, sectors }: CompetitionMapProps) => {
  const rows = normalizeSectors(sectors);

  if (!isProtocolActive) {
    return (
      <div className="bg-[#0A0A12] border border-white/5 p-8 rounded-[3rem] relative overflow-hidden">
        <div
          className="absolute inset-0 rounded-[3rem] flex flex-col items-center justify-center z-10"
          style={{ background: "rgba(2,2,5,0.88)", backdropFilter: "blur(8px)" }}
        >
          <p className="text-sm font-bold text-white mb-1">Protocol Authority Required</p>
          <p className="text-xs mb-4 text-center max-w-xs text-slate-500">
            Competition Heatmap je dostupná len pre Protocol Authority plán.
          </p>
          {onUpgrade ? (
            <button
              onClick={onUpgrade}
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all hover:scale-105 bg-blue-600 text-white"
            >
              Upgradovať na Protocol Authority
            </button>
          ) : (
            <Link
              href="/billing"
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all hover:scale-105 inline-block bg-blue-600 text-white"
            >
              Zobraziť plány
            </Link>
          )}
        </div>
        <div className="blur-sm opacity-10 pointer-events-none" aria-hidden>
          {DEFAULT_SECTORS.map((s) => (
            <div key={s.name} className="mb-4 space-y-1">
              <div className="h-2 rounded bg-white/10" />
              <div
                className="h-1.5 rounded"
                style={{ width: `${s.heat}%`, background: s.heat > 70 ? "#EF4444" : "#3B82F6" }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A12] border border-white/5 p-8 rounded-[3rem] relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex justify-between items-center mb-8">
        <h3 className="text-white font-black italic uppercase text-xs tracking-[0.2em]">
          Live Radar Konkurencie
        </h3>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-[9px] text-red-500 font-bold uppercase">Protocol Link Active</span>
        </div>
      </div>

      <div className="space-y-5">
        {rows.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="space-y-2"
          >
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className="text-slate-400">{s.name}</span>
              <span className={s.heat > 70 ? "text-red-400" : s.heat > 40 ? "text-yellow-400" : "text-blue-400"}>
                {s.count} {s.count === 1 ? "Maklér" : "Makléri"} v zóne
              </span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${s.heat}%` }}
                transition={{ duration: 0.8, delay: i * 0.08 }}
                className={`h-full rounded-full ${
                  s.heat > 70 ? "bg-red-600" : s.heat > 40 ? "bg-yellow-500" : "bg-blue-600"
                }`}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <p className="mt-8 text-[8px] text-slate-600 italic uppercase text-center tracking-widest">
        Vaša prítomnosť je vďaka Ghost Mode Shield neviditeľná
      </p>
    </div>
  );
};
