"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import type { GhostSessionData } from "@/types/intelligence-hub";

type LegacyGhostData = {
  mesto: string;
  stvrt: string;
  pocet: number;
};

type GhostBannerProps = {
  data: GhostSessionData | LegacyGhostData;
  onDismiss?: () => void;
  onUnlock?: () => void;
};

function normalizeGhostData(data: GhostSessionData | LegacyGhostData) {
  if ("city" in data) {
    return {
      city: data.city,
      district: data.district,
      leadCount: data.leadCount,
    };
  }
  return {
    city: data.mesto,
    district: data.stvrt,
    leadCount: data.pocet,
  };
}

export const GhostBanner = ({ data, onDismiss, onUnlock }: GhostBannerProps) => {
  const [visible, setVisible] = useState(true);
  const normalized = normalizeGhostData(data);

  const dismiss = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => onDismiss?.(), 400);
  }, [onDismiss]);

  useEffect(() => {
    const t = window.setTimeout(dismiss, 8000);
    return () => window.clearTimeout(t);
  }, [dismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-[480px]"
        >
          <div className="bg-[#0A0A15]/95 backdrop-blur-3xl border border-blue-500/40 p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-11 h-11 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/30">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-black text-[12px] uppercase tracking-tighter truncate">
                  Vitajte späť, lovec z {normalized.city}
                </h4>
                <p className="text-slate-400 text-[10px] uppercase leading-tight">
                  Vaše {normalized.leadCount} dedičstvá na {normalized.district} sú stále na radare.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={onUnlock}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase italic hover:bg-blue-500 transition-colors"
                >
                  Odomknúť
                </button>
                <button
                  onClick={dismiss}
                  className="text-slate-600 hover:text-slate-400 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
