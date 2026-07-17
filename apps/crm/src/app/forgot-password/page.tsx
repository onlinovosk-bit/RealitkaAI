"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase/client";
import { LANDING_FOCUS_RING, LANDING_INPUT_FOCUS } from "@/lib/landing-a11y";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.revolis.ai").replace(/\/$/, "");

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
        redirectTo: `${APP_URL}/reset-password`,
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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 via-teal-50 to-white px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-teal-200 bg-white p-7 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Revolis.AI</p>
        <h1 className="mt-2 text-2xl font-bold text-teal-950">Zabudnuté heslo</h1>
        <p className="mt-2 text-sm text-teal-700">
          Pošleme ti e-mail s odkazom na nastavenie nového hesla.
        </p>

        {done ? (
          <div
            role="status"
            className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            Ak účet s týmto e-mailom existuje, odkaz na obnovenie hesla už je na ceste. Skontroluj aj
            spam. Odkaz platí obmedzený čas a dá sa použiť raz.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <label className="block text-sm font-medium text-teal-900">
              E-mail
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-1 w-full rounded-xl border border-teal-200 px-4 py-3 outline-none focus:border-teal-500 ${LANDING_INPUT_FOCUS}`}
                placeholder="jan@realitka.sk"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl bg-teal-700 px-4 py-3 font-bold text-white disabled:opacity-50 ${LANDING_FOCUS_RING}`}
            >
              {loading ? "Odosielam…" : "Poslať odkaz na obnovenie"}
            </button>
          </form>
        )}

        <Link href="/login" className={`mt-5 inline-block text-sm font-semibold text-teal-800 underline ${LANDING_FOCUS_RING}`}>
          Späť na prihlásenie
        </Link>
      </section>
    </main>
  );
}
