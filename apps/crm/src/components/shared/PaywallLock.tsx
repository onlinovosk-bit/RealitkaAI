"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { SLATE_HORIZON, WORKDESK_LOCKED } from "@/lib/slate-horizon-theme";

interface PaywallLockProps {
  lockedCount: number;
  feature?: string;
  titleOverride?: string;
  ctaLabel?: string;
}

export default function PaywallLock({
  lockedCount,
  feature = "AI odporúčania",
  titleOverride,
  ctaLabel,
}: PaywallLockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl border p-5 text-center"
      style={{
        background: WORKDESK_LOCKED.background,
        borderColor: WORKDESK_LOCKED.borderColor,
        boxShadow: WORKDESK_LOCKED.glow,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ background: WORKDESK_LOCKED.overlay }}
      />

      <div className="relative z-10">
        <div className="mb-3 text-2xl">🔒</div>
        <p
          className="mb-1 text-sm font-semibold"
          style={{ color: WORKDESK_LOCKED.titleColor }}
        >
          {titleOverride ?? `+${lockedCount} ďalších ${feature}`}
        </p>
        <p
          className="mb-4 text-xs"
          style={{ color: WORKDESK_LOCKED.subtitleColor }}
        >
          Dostupné vo vyššom programe — rozšír limit a získaj viac klientov každý deň.
        </p>
        <Link
          href="/billing"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:opacity-95"
          style={{
            background: SLATE_HORIZON.ctaGradient,
            boxShadow: "0 4px 14px rgba(249,115,22,0.25)",
          }}
        >
          {ctaLabel ?? "✦ Odomknúť Smart Start – od €49/mes"}
        </Link>
      </div>
    </motion.div>
  );
}
