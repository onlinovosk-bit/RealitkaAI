import Link from "next/link";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";

export default function CallToAction() {
  return (
    <div
      className="mt-8 rounded-2xl border p-6 text-center"
      style={{ borderColor: SLATE_HORIZON.line, background: SLATE_HORIZON.bg }}
    >
      <p className="text-sm font-semibold" style={{ color: SLATE_HORIZON.ink }}>
        Chcem vidieť analýzu na vlastných dátach
      </p>
      <Link
        href="/demo/rezervacia?source=proof"
        className={`mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full px-6 py-3 text-sm font-bold text-white ${SLATE_HORIZON.focusRing}`}
        style={{ background: SLATE_HORIZON.ctaGradient }}
      >
        Rezervovať demo →
      </Link>
    </div>
  );
}
