"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewContactPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen p-4 md:p-8" style={{ background: "#050914" }}>
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/leads" className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(34,211,238,0.08)", color: "#22D3EE" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#F0F9FF" }}>Nový kontakt</h1>
            <p className="text-xs" style={{ color: "#475569" }}>Kontakty sú spravované cez Príležitosti</p>
          </div>
        </div>
        <div
          className="rounded-2xl border p-6 text-center"
          style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
        >
          <p className="text-sm mb-4" style={{ color: "#94A3B8" }}>
            Kontakty v Revolis.AI sú prepojené s príležitosťami.<br />
            Pridaj nový kontakt ako príležitosť.
          </p>
          <button
            onClick={() => router.push("/leads/new")}
            className="rounded-xl px-6 py-3 text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #22D3EE, #0EA5E9)", color: "#050914" }}
          >
            Pridať príležitosť
          </button>
        </div>
      </div>
    </main>
  );
}
