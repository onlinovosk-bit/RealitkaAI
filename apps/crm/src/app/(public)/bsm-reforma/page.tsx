"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";

export default function BSMReformaPage() {
  const [location, setLocation] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; message: string }>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!location.trim()) {
      setResult({ ok: false, message: "Doplňte lokalitu nehnuteľnosti." });
      return;
    }

    try {
      setSubmitting(true);
      setResult(null);
      const res = await fetch("/api/bsm-reforma/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: location.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setResult({ ok: false, message: data.error ?? "Nepodarilo sa uložiť žiadosť." });
        return;
      }
      setResult({
        ok: true,
        message: "Analýza je prijatá. Ozveme sa vám s dopadom reformy BSM 2026.",
      });
      setLocation("");
      setFullName("");
      setEmail("");
    } catch {
      setResult({ ok: false, message: "Chyba siete, skúste to prosím znova." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#010103] font-sans text-white">
      <main className="mx-auto max-w-4xl px-6 pt-20 text-center">
        <div className="mb-8 inline-flex animate-pulse items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-yellow-500">
          <AlertTriangle size={14} /> Legislatívna zmena 2026
        </div>

        <h1 className="mb-6 bg-gradient-to-b from-white to-white/40 bg-clip-text text-5xl font-black italic tracking-tighter text-transparent md:text-7xl">
          OVPLYVNÍ REFORMA BSM <br />
          AJ VAŠU NEHNUTEĽNOSŤ?
        </h1>

        <p className="mx-auto mb-12 max-w-2xl text-lg text-slate-400">
          Nové pravidlá platné od 1.1.2026 menia spôsob, akým manželia predávajú a dedia reality.
          Zistite, či je výhodnejšie predať teraz, alebo počkať.
        </p>

        <div className="rounded-[3rem] border border-white/5 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl">
          <h3 className="mb-6 text-xl font-bold">Overiť dopad na moju nehnuteľnosť</h3>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Meno (voliteľné)"
              className="rounded-2xl border border-white/10 bg-black/40 px-6 py-4 outline-none transition-all focus:border-yellow-500/50"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (voliteľné)"
              className="rounded-2xl border border-white/10 bg-black/40 px-6 py-4 outline-none transition-all focus:border-yellow-500/50"
            />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Lokalita nehnuteľnosti"
              className="rounded-2xl border border-white/10 bg-black/40 px-6 py-4 outline-none transition-all focus:border-yellow-500/50"
            />
            <button
              disabled={submitting}
              className="group flex items-center justify-center gap-2 rounded-2xl bg-yellow-500 px-8 py-4 font-black text-black transition-all hover:bg-yellow-400 disabled:opacity-60"
            >
              {submitting ? "ODOSIELAM..." : "ANALÝZA ZDARMA"}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          {result && (
            <p className={`mt-4 text-sm ${result.ok ? "text-emerald-400" : "text-rose-400"}`}>
              {result.message}
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} /> Dáta sú šifrované
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} /> Certifikát Revolis.AI
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
