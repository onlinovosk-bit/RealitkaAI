"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const previewToasts = [
    "NEXUS AI: Pripravený follow-up pre lead Petra N.",
    "NEXUS AI: Lead Mária K. presunutý do fázy Obhliadka.",
    "NEXUS AI: Odporúčanie: zavolať 3 horúcim príležitostiam.",
  ];
  const [toastIdx, setToastIdx] = useState(0);
  const secondaryToastIdx = (toastIdx + previewToasts.length - 1) % previewToasts.length;

  useEffect(() => {
    const id = window.setInterval(() => {
      setToastIdx((prev) => (prev + 1) % previewToasts.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, [previewToasts.length]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodarilo sa prihlásiť.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Revolis.AI</h1>
            <p className="mt-2 text-sm text-gray-500">Prihlás sa do svojho účtu.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500"
                placeholder="jan@realitka.sk"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Heslo</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {isLoading ? "Prihlásenie…" : "Prihlásiť sa"}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-500">
            Nemáš účet?{" "}
            <Link href="/register" className="font-medium text-gray-900 underline">
              Registrácia
            </Link>
          </p>
        </div>

        <section className="rounded-3xl border border-indigo-200/40 bg-[#080c1c] p-6 text-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-indigo-300">Space UI Preview</p>
          <h2 className="mt-2 text-xl font-semibold">Takto vyzerá nový dashboard po prihlásení</h2>
          <p className="mt-2 text-sm text-slate-300">
            Po úspešnom login uvidíš tmavý Space layout, živý status header, AI pulse notifikácie a glassmorphism KPI karty.
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-200">NEXUS AI aktívna</span>
              </div>
              <span className="text-xs text-indigo-200">MON 14 APR 2026 13:20:11</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                <p className="text-[11px] text-slate-300">Všetky príležitosti</p>
                <p className="mt-1 text-lg font-semibold">128</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                <p className="text-[11px] text-slate-300">Horúce príležitosti</p>
                <p className="mt-1 text-lg font-semibold">17</p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-cyan-300/25 bg-slate-900/70 p-3 backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.15em] text-cyan-200">Live AI Pulse</p>
            <div className="mt-2 space-y-2">
              <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <p key={toastIdx} className="text-xs text-slate-200 animate-pulse">
                  {previewToasts[toastIdx]}
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-2 opacity-80">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-300" />
                <p key={secondaryToastIdx} className="text-xs text-slate-300">
                  {previewToasts[secondaryToastIdx]}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
