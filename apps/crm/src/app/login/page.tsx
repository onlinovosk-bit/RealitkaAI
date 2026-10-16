"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase/client";
import BlogPromoTicker from "@/components/marketing/BlogPromoTicker";
import AuthFeaturePreview from "@/components/auth/AuthFeaturePreview";
import { AUTH_INPUT_CLASS, AUTH_PAGE } from "@/lib/auth-page-theme";

export default function LoginPage() {
  const router = useRouter();
  const [sessionExpired, setSessionExpired] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "session_expired") {
      setSessionExpired(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      // Server link profilu (Smolko gmail ↔ agency_id) — rovnaké ako dashboard layout.
      await fetch("/api/crm/tenant-health", { credentials: "include" }).catch(() => null);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodarilo sa prihlásiť.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: AUTH_PAGE.pageBackground }}>
      <header
        className="border-b px-4 py-3 sm:px-6"
        style={{
          background: AUTH_PAGE.headerBackground,
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/80">Revolis Workdesk</p>
            <h1 className="text-lg font-bold text-white sm:text-xl">Revolis.AI</h1>
          </div>
          <Link
            href="/landing"
            className={`rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20 ${AUTH_PAGE.focusRing}`}
          >
            Späť na landing
          </Link>
        </div>
      </header>

      <div role="main" className="flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-2">
          <div
            className="rounded-3xl border bg-white p-8"
            style={{ borderColor: AUTH_PAGE.cardBorder, boxShadow: AUTH_PAGE.cardShadow }}
          >
            <div className="mb-6">
              <h2 className="text-3xl font-bold" style={{ color: AUTH_PAGE.ink }}>
                Prihlásenie
              </h2>
              <p className="mt-2 text-sm" style={{ color: AUTH_PAGE.muted }}>
                Prihláste sa do svojho účtu.
              </p>
            </div>

            {sessionExpired && (
              <div
                className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                role="status"
              >
                Platnosť prihlásenia vypršala (neplatný refresh token). Prihláste sa znova — najčastejšie po
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
                <label htmlFor="login-email" className="mb-1 block text-sm font-medium" style={{ color: AUTH_PAGE.deep }}>
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
                  className={AUTH_INPUT_CLASS}
                  style={{ borderColor: AUTH_PAGE.cardBorder, color: AUTH_PAGE.ink }}
                  placeholder="jan@realitka.sk"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1 block text-sm font-medium" style={{ color: AUTH_PAGE.deep }}>
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
                  className={AUTH_INPUT_CLASS}
                  style={{ borderColor: AUTH_PAGE.cardBorder, color: AUTH_PAGE.ink }}
                />
              </div>

              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className={`text-sm font-semibold underline ${AUTH_PAGE.focusRing}`}
                  style={{ color: AUTH_PAGE.brandDeep }}
                >
                  Zabudnuté heslo?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-95 disabled:opacity-60 ${AUTH_PAGE.focusRing}`}
                style={{ background: AUTH_PAGE.buttonBackground }}
              >
                {isLoading ? "Prihlásenie…" : "Prihlásiť sa"}
              </button>
            </form>

            <p className="mt-6 text-sm" style={{ color: AUTH_PAGE.muted }}>
              Nemáte účet?{" "}
              <Link href="/register" className={`font-semibold underline ${AUTH_PAGE.focusRing}`} style={{ color: AUTH_PAGE.brandDeep }}>
                Registrácia
              </Link>
            </p>
            <p className="mt-4 text-xs" style={{ color: AUTH_PAGE.muted }}>
              Právne informácie:{" "}
              <Link href="/privacy-policy" className="underline" style={{ color: AUTH_PAGE.brand }}>
                Privacy Policy
              </Link>{" "}
              ·{" "}
              <Link href="/terms" className="underline" style={{ color: AUTH_PAGE.brand }}>
                VOP / Terms
              </Link>{" "}
              ·{" "}
              <Link href="/security" className="underline" style={{ color: AUTH_PAGE.brand }}>
                Security & Compliance
              </Link>
              {" · "}
              <Link href="/cookie-policy" className="underline" style={{ color: AUTH_PAGE.brand }}>
                Cookie Policy
              </Link>
            </p>
          </div>

          <AuthFeaturePreview />
        </div>
      </div>

      <BlogPromoTicker tone="workdesk" />
    </div>
  );
}
