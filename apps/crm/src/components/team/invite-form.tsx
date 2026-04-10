"use client";

import { useState } from "react";

const ROLES = [
  { value: "agent",   label: "Maklér" },
  { value: "manager", label: "Manažér" },
  { value: "admin",   label: "Admin" },
];

type State = "idle" | "saving" | "done" | "error";

export default function InviteForm() {
  const [form, setForm] = useState({ fullName: "", email: "", role: "agent" });
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [invited, setInvited] = useState<{ name: string; email: string }[]>([]);

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setErrorMsg("");
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setInvited((prev) => [...prev, { name: form.fullName, email: form.email }]);
      setForm({ fullName: "", email: "", role: "agent" });
      setState("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Pozvánka zlyhala.");
      setState("error");
    }
  }

  return (
    <div className="space-y-6">
      {/* Invited list */}
      {invited.length > 0 && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-green-800">Odoslané pozvánky:</p>
          {invited.map((i) => (
            <div key={i.email} className="flex items-center gap-2 text-sm text-green-700">
              <span className="text-green-500">✓</span>
              <span className="font-medium">{i.name}</span>
              <span className="text-green-500">·</span>
              <span>{i.email}</span>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={submit}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Celé meno <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            placeholder="Ján Novák"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="jan@realitka.sk"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Rola</label>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <label key={r.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value={r.value}
                  checked={form.role === r.value}
                  onChange={() => update("role", r.value)}
                  className="peer sr-only"
                />
                <span className="block rounded-xl border border-gray-200 px-3 py-2.5 text-center text-sm font-medium
                  peer-checked:border-gray-900 peer-checked:bg-gray-900 peer-checked:text-white
                  hover:border-gray-400 transition-colors">
                  {r.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {state === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={state === "saving"}
          className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {state === "saving" ? "Odosielam..." : "Odoslať pozvánku →"}
        </button>

        <p className="text-xs text-center text-gray-400">
          Kolega dostane email s odkazom. Po kliknutí si nastaví heslo a bude mať prístup k CRM.
        </p>
      </form>
    </div>
  );
}
