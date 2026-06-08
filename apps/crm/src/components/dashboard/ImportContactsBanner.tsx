"use client";

import Link from "next/link";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";

const LOW_LEADS_THRESHOLD = 10;

type Props = {
  leadsCount: number;
};

export function ImportContactsBanner({ leadsCount }: Props) {
  if (leadsCount >= LOW_LEADS_THRESHOLD) return null;

  return (
    <section
      className="mb-6 rounded-2xl border p-4 md:p-5"
      style={{
        borderColor: "#BFDBFE",
        background: "linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)",
        boxShadow: SLATE_HORIZON.cardShadow,
      }}
      aria-label="Import kontaktov"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: SLATE_HORIZON.deep }}>
            📥 Máte {leadsCount} kontaktov. Importujte ich z vášho CRM za menej ako 10 minút.
          </p>
          <p className="mt-1 text-xs" style={{ color: SLATE_HORIZON.muted }}>
            Realvia, RealSoft, Google Kontakty alebo všeobecný CSV — auto-mapovanie stĺpcov.
          </p>
        </div>
        <Link
          href="/import/universal"
          className="inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
          style={{ background: SLATE_HORIZON.brand }}
        >
          Importovať teraz →
        </Link>
      </div>
    </section>
  );
}
