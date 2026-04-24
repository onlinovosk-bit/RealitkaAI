"use client";
import Link from "next/link";
import { motion } from "framer-motion";

interface PaywallLockProps {
  lockedCount: number;
  feature?: string;
}

export default function PaywallLock({
  lockedCount,
  feature = "AI odporúčania",
}: PaywallLockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl border p-5 text-center"
      style={{
        background: "rgba(34,211,238,0.03)",
        borderColor: "rgba(34,211,238,0.15)",
      }}
    >
      {/* Blur overlay naznačujúci skrytý obsah */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(5,9,20,0.85) 100%)",
        }}
      />

      <div className="relative z-10">
        <div className="mb-3 text-2xl">🔒</div>
        <p className="text-sm font-semibold text-slate-200 mb-1">
          +{lockedCount} ďalších {feature}
        </p>
        <p className="text-xs text-slate-500 mb-4">
          Odomkni Smart Start a získaj viac klientov každý deň.
        </p>
        <Link
          href="/billing"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #1B4FD8 0%, #22D3EE 100%)",
            color: "#fff",
            boxShadow: "0 0 20px rgba(34,211,238,0.3)",
          }}
        >
          ✦ Odomknúť Smart Start – od €49/mes
        </Link>
      </div>
    </motion.div>
  );
}
