"use client";

import { useState } from "react";
import { fetchJsonWithRetry } from "@/lib/request-helpers";

export default function SupportRequestForm() {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [requestId, setRequestId] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSending(true);
    setError("");
    setSuccess("");
    setRequestId("");

    const form = new FormData(event.currentTarget);
    const payload = {
      fullName: String(form.get("fullName") || ""),
      email: String(form.get("email") || ""),
      company: String(form.get("company") || ""),
      priority: String(form.get("priority") || "P3"),
      subject: String(form.get("subject") || ""),
      message: String(form.get("message") || ""),
    };

    try {
      const data = (await fetchJsonWithRetry(
        "/api/support/request",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        { retries: 2, backoffMs: 500 },
      )) as { ok: boolean; error?: string; message?: string; requestId?: string };
      if (!data.ok) throw new Error(data.error || "Nepodarilo sa odoslať support ticket.");
      setSuccess(data.message || "Support ticket prijatý.");
      setRequestId(data.requestId || "");
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
          <span className="mb-1 block text-slate-300">Priorita *</span>
          <select
            name="priority"
            defaultValue="P3"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
          >
            <option value="P1">P1 — Kritické</option>
            <option value="P2">P2 — Vysoké</option>
            <option value="P3">P3 — Bežné</option>
            <option value="P4">P4 — Nízke</option>
          </select>
        </label>
      </div>

      <label className="text-sm block">
        <span className="mb-1 block text-slate-300">Predmet *</span>
        <input
          name="subject"
          required
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
        />
      </label>

      <label className="text-sm block">
        <span className="mb-1 block text-slate-300">Správa *</span>
        <textarea
          name="message"
          rows={5}
          required
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
        />
      </label>

      {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      {!error && !success && (
        <p className="text-xs text-slate-500">Pri dočasnej chybe siete prebehne automatický retry (2 pokusy).</p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {success} {requestId ? `(Ticket: ${requestId})` : ""}
        </p>
      )}

      <button
        type="submit"
        disabled={isSending}
        className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
      >
        {isSending ? "Odosielam..." : "Odoslať support ticket"}
      </button>
    </form>
  );
}
