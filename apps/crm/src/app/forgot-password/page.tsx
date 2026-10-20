"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase/client";
import { getPasswordRecoveryRedirectUrl } from "@/lib/supabase/recovery-redirect";
import { AUTH_INPUT_CLASS, AUTH_PAGE } from "@/lib/auth-page-theme";

const RECOVERY_REDIRECT = getPasswordRecoveryRedirectUrl();

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: RECOVERY_REDIRECT,
      });
      if (resetError) throw resetError;
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodarilo sa odoslať e-mail.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10" style={{ background: AUTH_PAGE.pageBackground }}>
      <section
        className="w-full max-w-md rounded-3xl border bg-white p-7"
        style={{ borderColor: AUTH_PAGE.cardBorder, boxShadow: AUTH_PAGE.cardShadow }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: AUTH_PAGE.brand }}>
          Revolis.AI
        </p>
        <h1 className="mt-2 text-2xl font-bold" style={{ color: AUTH_PAGE.ink }}>
          Zabudnuté heslo
        </h1>
        <p className="mt-2 text-sm" style={{ color: AUTH_PAGE.muted }}>
          Pošleme vám e-mail s odkazom na nastavenie nového hesla.
        </p>

        {done ? (
          <div
            role="status"
            className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            Ak účet s týmto e-mailom existuje, odkaz na obnovenie hesla už je na ceste. Skontrolujte aj
            priečinok so spamom. Odkaz platí obmedzený čas a dá sa použiť raz.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <label className="block text-sm font-medium" style={{ color: AUTH_PAGE.deep }}>
              E-mail
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-1 ${AUTH_INPUT_CLASS}`}
                style={{ borderColor: AUTH_PAGE.cardBorder }}
                placeholder="jan@realitka.sk"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl px-4 py-3 font-bold text-white disabled:opacity-50 ${AUTH_PAGE.focusRing}`}
              style={{ background: AUTH_PAGE.buttonBackground }}
            >
              {loading ? "Odosielam…" : "Poslať odkaz na obnovenie"}
            </button>
          </form>
        )}

        <Link
          href="/login"
          className={`mt-5 inline-block text-sm font-semibold underline ${AUTH_PAGE.focusRing}`}
          style={{ color: AUTH_PAGE.brandDeep }}
        >
          Späť na prihlásenie
        </Link>
      </section>
    </main>
  );
}
