"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase/client";

type Phase = "loading" | "ready" | "error" | "done";

function errorFromQuery(): string | null {
  const err = new URLSearchParams(window.location.search).get("error");
  if (err === "invalid_or_expired" || err === "missing_token") {
    return "Odkaz je neplatný alebo vypršal. Vyžiadaj si nový reset hesla.";
  }
  return null;
}

/**
 * Establish recovery session from:
 * - cookies already set by /auth/confirm (token_hash) or /auth/callback (code)
 * - ?code= on this page (legacy)
 * - hash fragment type=recovery (implicit)
 */
async function establishRecoverySession(): Promise<{ ok: boolean; detail?: string }> {
  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (tokenHash && type) {
    const next = encodeURIComponent("/reset-password");
    window.location.replace(
      `/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}&next=${next}`,
    );
    return { ok: false, detail: "redirect" };
  }

  const code = params.get("code");
  if (code) {
    const { error } = await supabaseClient.auth.exchangeCodeForSession(code);
    if (error) return { ok: false, detail: error.message };
  }

  // Give SSR client a moment to ingest hash tokens / cookies.
  for (let i = 0; i < 8; i++) {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session) return { ok: true };
    await new Promise((r) => setTimeout(r, 150));
  }

  return { ok: false };
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phase, setPhase] = useState<Phase>("loading");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const queryErr = errorFromQuery();
    if (queryErr) {
      setError(queryErr);
      setPhase("error");
    }

    const { data: listener } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setPhase("ready");
        setError("");
      }
    });

    (async () => {
      const result = await establishRecoverySession();
      if (!active || result.detail === "redirect") return;
      if (result.ok) {
        setPhase("ready");
        setError("");
        return;
      }
      if (!queryErr) {
        setError("Odkaz je neplatný alebo vypršal. Vyžiadaj si nový reset hesla.");
      }
      setPhase("error");
    })();

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Heslo musí mať aspoň 8 znakov.");
    if (password !== confirmPassword) return setError("Heslá sa nezhodujú.");
    setLoading(true);
    const { error: updateError } = await supabaseClient.auth.updateUser({ password });
    setLoading(false);
    if (updateError) return setError(updateError.message);
    setMessage("Heslo bolo úspešne zmenené. Teraz sa môžeš prihlásiť.");
    setPhase("done");
    setPassword("");
    setConfirmPassword("");
    await supabaseClient.auth.signOut();
  }

  const ready = phase === "ready";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 via-teal-50 to-white px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-teal-200 bg-white p-7 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Revolis.AI</p>
        <h1 className="mt-2 text-2xl font-bold text-teal-950">Nastavenie nového hesla</h1>
        <p className="mt-2 text-sm text-teal-700">Zadaj nové heslo pre svoj účet.</p>

        {phase === "loading" && (
          <p className="mt-4 text-sm text-teal-700" role="status">
            Overujem odkaz z e-mailu…
          </p>
        )}

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
            <p className="mt-2">
              <Link href="/forgot-password" className="font-semibold underline">
                Požiadať o nový odkaz
              </Link>
            </p>
          </div>
        )}

        {message && (
          <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {message}
          </div>
        )}

        {!message && phase !== "error" && (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-teal-900">
              Nové heslo
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                disabled={!ready || loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-teal-200 px-4 py-3 outline-none focus:border-teal-500 disabled:opacity-50"
              />
            </label>
            <label className="block text-sm font-medium text-teal-900">
              Zopakovať nové heslo
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                disabled={!ready || loading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-teal-200 px-4 py-3 outline-none focus:border-teal-500 disabled:opacity-50"
              />
            </label>
            <button
              type="submit"
              disabled={!ready || loading}
              className="w-full rounded-xl bg-teal-700 px-4 py-3 font-bold text-white disabled:opacity-50"
            >
              {loading ? "Mením heslo..." : "Zmeniť heslo"}
            </button>
          </form>
        )}

        <Link href="/login" className="mt-5 inline-block text-sm font-semibold text-teal-800 underline">
          Prejsť na prihlásenie
        </Link>
      </section>
    </main>
  );
}
