"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const { data: listener } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (active && (event === "PASSWORD_RECOVERY" || session)) {
        setReady(true);
        setError("");
      }
    });

    (async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (active) setError("Odkaz je neplatný alebo vypršal. Vyžiadaj si nový reset hesla.");
          return;
        }
      }
      const { data } = await supabaseClient.auth.getSession();
      if (!active) return;
      setReady(Boolean(data.session));
      if (!data.session) setError("Odkaz je neplatný alebo vypršal. Vyžiadaj si nový reset hesla.");
    })();

    return () => { active = false; listener.subscription.unsubscribe(); };
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
    setPassword("");
    setConfirmPassword("");
    await supabaseClient.auth.signOut();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 via-teal-50 to-white px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-teal-200 bg-white p-7 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Revolis.AI</p>
        <h1 className="mt-2 text-2xl font-bold text-teal-950">Nastavenie nového hesla</h1>
        <p className="mt-2 text-sm text-teal-700">Zadaj nové heslo pre svoj účet.</p>
        {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {message && <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
        {!message && (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-teal-900">Nové heslo<input type="password" autoComplete="new-password" required minLength={8} disabled={!ready || loading} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-teal-200 px-4 py-3 outline-none focus:border-teal-500" /></label>
            <label className="block text-sm font-medium text-teal-900">Zopakovať nové heslo<input type="password" autoComplete="new-password" required minLength={8} disabled={!ready || loading} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-teal-200 px-4 py-3 outline-none focus:border-teal-500" /></label>
            <button type="submit" disabled={!ready || loading} className="w-full rounded-xl bg-teal-700 px-4 py-3 font-bold text-white disabled:opacity-50">{loading ? "Mením heslo..." : "Zmeniť heslo"}</button>
          </form>
        )}
        <Link href="/login" className="mt-5 inline-block text-sm font-semibold text-teal-800 underline">Prejsť na prihlásenie</Link>
      </section>
    </main>
  );
}
