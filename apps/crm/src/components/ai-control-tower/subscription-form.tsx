"use client";

import { useState } from "react";

const WINDOWS = ["weekly", "session", "monthly", "custom"] as const;

export default function SubscriptionSnapshotForm() {
  const [provider, setProvider] = useState("claude");
  const [accountRef, setAccountRef] = useState("shared");
  const [quotaWindow, setQuotaWindow] = useState<(typeof WINDOWS)[number]>("weekly");
  const [usedPercent, setUsedPercent] = useState("");
  const [remainingPercent, setRemainingPercent] = useState("");
  const [resetAt, setResetAt] = useState("");
  const [resetTimezone, setResetTimezone] = useState("Europe/Bratislava");
  const [capturedAt, setCapturedAt] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const used = usedPercent.trim() === "" ? null : Number(usedPercent);
    const remaining = remainingPercent.trim() === "" ? null : Number(remainingPercent);
    const body = {
      provider,
      accountRef,
      quotaWindow,
      usedPercent: used,
      remainingPercent: remaining,
      resetAt: resetAt.trim() === "" ? "" : new Date(resetAt).toISOString(),
      resetTimezone,
      capturedAt: capturedAt.trim() === "" ? "" : new Date(capturedAt).toISOString(),
      note: note.trim() === "" ? null : note,
    };
    try {
      const response = await fetch("/api/ai-control-tower/snapshots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || json.ok === false) {
        setError(json.error ?? "Zápis zlyhal.");
        return;
      }
      setMessage("Snímok uložený. Obnovte stránku pre karty.");
    } catch {
      setError("Zápis zlyhal.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 grid gap-3 rounded-lg border border-slate-700 bg-slate-950/60 p-4 sm:grid-cols-2"
      data-testid="subscription-snapshot-form"
    >
      <label className="text-xs text-slate-400">
        Provider
        <input
          value={provider}
          onChange={(event) => setProvider(event.target.value)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
          required
        />
      </label>
      <label className="text-xs text-slate-400">
        Account alias
        <input
          value={accountRef}
          onChange={(event) => setAccountRef(event.target.value)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
          required
        />
      </label>
      <label className="text-xs text-slate-400">
        Quota window
        <select
          value={quotaWindow}
          onChange={(event) => setQuotaWindow(event.target.value as (typeof WINDOWS)[number])}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
        >
          {WINDOWS.map((window) => (
            <option key={window} value={window}>
              {window}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-400">
        Used percent
        <input
          type="number"
          min={0}
          max={100}
          step="0.01"
          value={usedPercent}
          onChange={(event) => setUsedPercent(event.target.value)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
        />
      </label>
      <label className="text-xs text-slate-400">
        Remaining percent
        <input
          type="number"
          min={0}
          max={100}
          step="0.01"
          value={remainingPercent}
          onChange={(event) => setRemainingPercent(event.target.value)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
        />
      </label>
      <label className="text-xs text-slate-400">
        Reset at
        <input
          type="datetime-local"
          value={resetAt}
          onChange={(event) => setResetAt(event.target.value)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
          required
        />
      </label>
      <label className="text-xs text-slate-400">
        Reset timezone
        <input
          value={resetTimezone}
          onChange={(event) => setResetTimezone(event.target.value)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
          required
        />
      </label>
      <label className="text-xs text-slate-400">
        Captured at
        <input
          type="datetime-local"
          value={capturedAt}
          onChange={(event) => setCapturedAt(event.target.value)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
          required
        />
      </label>
      <label className="text-xs text-slate-400 sm:col-span-2">
        Note
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
        />
      </label>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-sky-500/50 bg-sky-500/10 px-3 py-1.5 text-sm text-sky-100 disabled:opacity-50"
        >
          {pending ? "Ukladám…" : "Uložiť snímok"}
        </button>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      </div>
    </form>
  );
}
