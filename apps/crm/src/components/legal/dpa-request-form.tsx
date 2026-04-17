"use client";

import { useState } from "react";
import { fetchJsonWithRetry } from "@/lib/request-helpers";

export default function DpaRequestForm() {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSending(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      fullName: String(form.get("fullName") || ""),
      email: String(form.get("email") || ""),
      company: String(form.get("company") || ""),
      country: String(form.get("country") || ""),
      notes: String(form.get("notes") || ""),
    };

    try {
      const data = (await fetchJsonWithRetry(
        "/api/legal/dpa-request",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        { retries: 2, backoffMs: 500 },
      )) as { ok: boolean; error?: string; message?: string };
      if (!data.ok) throw new Error(data.error || "Nepodarilo sa odoslať formulár.");

      setSuccess(data.message || "Žiadosť bola úspešne odoslaná.");
      event.currentTarget.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Neočakávaná chyba.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">Meno a priezvisko *</span>
          <input
            name="fullName"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">Firemný e-mail *</span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">Firma *</span>
          <input
            name="company"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">Krajina</span>
          <input
            name="country"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
          />
        </label>
      </div>

      <label className="text-sm block">
        <span className="mb-1 block text-slate-300">Poznámka (voliteľné)</span>
        <textarea
          name="notes"
          rows={4}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
        />
      </label>

      {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      {!error && !success && (
        <p className="text-xs text-slate-500">Pri dočasnej chybe siete prebehne automatický retry (2 pokusy).</p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={isSending}
        className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
      >
        {isSending ? "Odosielam..." : "Požiadať o DPA balík"}
      </button>
    </form>
  );
}
