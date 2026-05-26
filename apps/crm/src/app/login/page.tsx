"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase/client";
import BlogPromoTicker from "@/components/marketing/BlogPromoTicker";
import { AI_ASSISTANT_NAME, AI_ASSISTANT_STATUS_ACTIVE } from "@/lib/ai-brand";
import { LANDING_FOCUS_RING, LANDING_INPUT_FOCUS } from "@/lib/landing-a11y";

export default function LoginPage() {
  const router = useRouter();
  const [sessionExpired, setSessionExpired] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const previewToasts = [
    `${AI_ASSISTANT_NAME}: Pripravený follow-up pre lead Petra N.`,
    `${AI_ASSISTANT_NAME}: Lead Mária K. presunutý do fázy Obhliadka.`,
    `${AI_ASSISTANT_NAME}: Odporúčanie: zavolať 3 horúcim príležitostiam.`,
  ];
  const [toastIdx, setToastIdx] = useState(0);
  const secondaryToastIdx = (toastIdx + previewToasts.length - 1) % previewToasts.length;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "session_expired") {
      setSessionExpired(true);
    }
  }, []);

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
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodarilo sa prihlásiť.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-sky-50 via-teal-50/40 to-white">
      <header
        className="border-b border-teal-200/60 px-4 py-3 sm:px-6"
        style={{ background: "linear-gradient(90deg, #0F766E 0%, #14B8A6 55%, #0EA5E9 100%)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-100/90">Revolis Workdesk</p>
            <h1 className="text-lg font-bold text-white sm:text-xl">Revolis.AI</h1>
          </div>
          <Link
            href="/landing"
            className={`rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20 ${LANDING_FOCUS_RING}`}
          >
            Späť na landing
          </Link>
        </div>
      </header>

      <div role="main" className="flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-teal-200/70 bg-white p-8 shadow-[0_20px_60px_rgba(15,118,110,0.08)]">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-teal-950">Prihlásenie</h2>
              <p className="mt-2 text-sm text-teal-700/80">Prihlás sa do svojho účtu.</p>
            </div>

            {sessionExpired && (
              <div
                className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                role="status"
              >
                Platnosť prihlásenia vypršala (neplatný refresh token). Prihlás sa znova — najčastejšie po
                zmene preview deployu alebo Supabase projektu.
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-teal-900">
                  Email
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm text-teal-950 outline-none transition-colors focus:border-teal-500 ${LANDING_INPUT_FOCUS}`}
                  placeholder="jan@realitka.sk"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-teal-900">
                  Heslo
                </label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm text-teal-950 outline-none transition-colors focus:border-teal-500 ${LANDING_INPUT_FOCUS}`}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-95 disabled:opacity-60 ${LANDING_FOCUS_RING}`}
                style={{ background: "linear-gradient(90deg, #0F766E 0%, #14B8A6 100%)" }}
              >
                {isLoading ? "Prihlásenie…" : "Prihlásiť sa"}
              </button>
            </form>

            <p className="mt-6 text-sm text-teal-700/80">
              Nemáš účet?{" "}
              <Link href="/register" className={`font-semibold text-teal-900 underline ${LANDING_FOCUS_RING}`}>
                Registrácia
              </Link>
            </p>
            <p className="mt-4 text-xs text-teal-700/70">
              Právne informácie:{" "}
              <Link href="/privacy-policy" className="underline text-teal-800">
                Privacy Policy
              </Link>{" "}
              ·{" "}
              <Link href="/terms" className="underline text-teal-800">
                VOP / Terms
              </Link>{" "}
              ·{" "}
              <Link href="/security" className="underline text-teal-800">
                Security & Compliance
              </Link>
              {" · "}
              <Link href="/cookie-policy" className="underline text-teal-800">
                Cookie Policy
              </Link>
            </p>
          </div>

          <section className="rounded-3xl border border-teal-200/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(14,165,233,0.08)] backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-teal-600">Workdesk Preview</p>
            <h2 className="mt-2 text-xl font-semibold text-teal-950">Takto vyzerá dashboard po prihlásení</h2>
            <p className="mt-2 text-sm text-teal-800/80">
              Svetlé Ocean Trust rozhranie — prehľad príležitostí, AI pulse notifikácie a KPI karty bez vizuálneho
              šumu.
            </p>

            <div className="mt-5 rounded-2xl border border-teal-200/80 bg-gradient-to-br from-sky-50 to-teal-50 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 motion-reduce:animate-none animate-pulse" />
                  <span className="text-xs font-medium text-teal-800">{AI_ASSISTANT_STATUS_ACTIVE}</span>
                </div>
                <span className="text-xs text-teal-600">Dnes · live sync</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-teal-200/70 bg-white p-3 shadow-sm">
                  <p className="text-[11px] text-teal-700/80">Všetky príležitosti</p>
                  <p className="mt-1 text-lg font-semibold text-teal-950">128</p>
                </div>
                <div className="rounded-xl border border-teal-200/70 bg-white p-3 shadow-sm">
                  <p className="text-[11px] text-teal-700/80">Horúce príležitosti</p>
                  <p className="mt-1 text-lg font-semibold text-teal-950">17</p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-sky-200/80 bg-white p-3">
              <p className="text-[11px] uppercase tracking-[0.15em] text-sky-700">Live AI Pulse</p>
              <div className="mt-2 space-y-2">
                <div className="flex items-start gap-2 rounded-xl border border-teal-100 bg-teal-50/60 p-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                  <p key={toastIdx} className="text-xs text-teal-900">
                    {previewToasts[toastIdx]}
                  </p>
                </div>
                <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/60 p-2 opacity-90">
                  <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" />
                  <p key={secondaryToastIdx} className="text-xs text-teal-800">
                    {previewToasts[secondaryToastIdx]}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <BlogPromoTicker />
    </div>
  );
}
