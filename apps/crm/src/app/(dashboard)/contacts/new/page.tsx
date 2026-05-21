"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { SLATE_HORIZON, WORKDESK_PANEL } from "@/lib/slate-horizon-theme";

export default function NewContactPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen p-4 md:p-8" style={{ background: SLATE_HORIZON.bg }}>
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/leads" className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: SLATE_HORIZON.soft, color: SLATE_HORIZON.brandDeep }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ color: SLATE_HORIZON.ink }}>Nový kontakt</h1>
            <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>Kontakty sú spravované cez Príležitosti</p>
          </div>
        </div>
        <div
          className="rounded-2xl border p-6 text-center"
          style={{
            background: WORKDESK_PANEL.background,
            borderColor: WORKDESK_PANEL.borderColor,
            boxShadow: WORKDESK_PANEL.boxShadow,
          }}
        >
          <p className="text-sm mb-4" style={{ color: SLATE_HORIZON.muted }}>
            Kontakty v Revolis.AI sú prepojené s príležitosťami.<br />
            Pridaj nový kontakt ako príležitosť.
          </p>
          <button
            onClick={() => router.push("/leads/new")}
            className="rounded-xl px-6 py-3 text-sm font-bold"
            style={{ background: SLATE_HORIZON.ctaGradient, color: "#FFFFFF" }}
          >
            Pridať príležitosť
          </button>
        </div>
      </div>
    </main>
  );
}
