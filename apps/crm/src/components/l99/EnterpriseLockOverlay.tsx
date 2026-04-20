import Link from "next/link";
import type { AccountTier } from "@/lib/l99/types";

interface Props {
  currentTier: AccountTier;
  featureName: string;
  isLocked?: boolean;
}

export default function EnterpriseLockOverlay({ currentTier, featureName, isLocked = false }: Props) {
  return (
    <div className="enterprise-locked-overlay">
      <div className="px-6 text-center">
        <p className="mb-2 text-2xl">{isLocked ? "🔒" : "⭐"}</p>
        <p className="mb-1 text-sm font-bold" style={{ color: "#F0F9FF" }}>
          {isLocked ? `${featureName} – zamknuté po downgrade` : `${featureName} – len Enterprise`}
        </p>
        <p className="mb-4 text-xs" style={{ color: "#64748B" }}>
          {isLocked
            ? "Obnoviť Enterprise plán pre obnovenie prístupu a histórie."
            : `Aktuálny plán: ${currentTier}. Prejdi na Enterprise pre prístup.`}
        </p>
        <Link
          href="/billing"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #6366F1, #F59E0B)", color: "#fff" }}
        >
          ✦ Prejsť na Enterprise
        </Link>
      </div>
    </div>
  );
}
