"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GhostSessionData } from "@/types/intelligence-hub";

interface Props {
  data: GhostSessionData;
  onDismiss: () => void;
  onUnlock: () => void;
}

export function GhostBanner({ data, onDismiss, onUnlock }: Props) {
  const [visible, setVisible] = useState(true);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onDismiss, 400);
  }, [onDismiss]);

  // Auto-dismiss po 8 sekundách
  useEffect(() => {
    const t = setTimeout(dismiss, 8000);
    return () => clearTimeout(t);
  }, [dismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0,    opacity: 1 }}
          exit={{   y: -100,  opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100]"
          style={{ width: "min(480px, calc(100vw - 32px))" }}
        >
          <div
            className="backdrop-blur-3xl p-5 rounded-[2rem]"
            style={{
              background: "rgba(10,10,21,0.95)",
              border:     "1px solid rgba(59,130,246,0.35)",
              boxShadow:  "0 20px 50px rgba(0,0,0,0.50)",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.30)" }}
              >
                <div className="w-2.5 h-2.5 rounded-full animate-ping" style={{ background: "#60A5FA" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black uppercase tracking-tight" style={{ color: "#F0F9FF" }}>
                  Vitajte späť, {data.city}
                </p>
                <p className="text-[10px] uppercase leading-tight mt-0.5" style={{ color: "#475569" }}>
                  {data.leadCount} príležitostí v oblasti {data.district}
                  {" · "}
                  <span style={{ color: "#334155" }}>Demo</span>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={onUnlock}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all hover:scale-105"
                  style={{ background: "#2563EB", color: "#fff" }}
                >
                  Aktivovať
                </button>
                <button
                  onClick={dismiss}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-lg leading-none"
                  style={{ color: "#334155" }}
                  aria-label="Zavrieť"
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
}
