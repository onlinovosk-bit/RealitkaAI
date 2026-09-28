"use client";

import { useState } from "react";

type Draft = {
  leadId: string;
  activityId: string;
  to: string;
  subject: string;
  body: string;
};

type LeadOption = {
  id: string;
  name: string;
  email: string;
  status: string;
  score: number;
};

export default function OutreachSendPanel({
  leads,
}: {
  leads: LeadOption[];
}) {
  const [selectedLeadId, setSelectedLeadId] = useState(leads[0]?.id ?? "");
  const [busy, setBusy] = useState<"idle" | "drafting" | "sending">("idle");
  const [message, setMessage] = useState("");
  // The exact text the broker approves is the exact text that gets sent.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sent, setSent] = useState(false);

  function selectLead(id: string) {
    setSelectedLeadId(id);
    setDraft(null);
    setSent(false);
    setMessage("");
  }

  async function post(url: string, payload: Record<string, string>) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "Požiadavka zlyhala.");
    return data;
  }

  async function handleDraft() {
    if (!selectedLeadId) {
      setMessage("Najprv vyber lead.");
      return;
    }
    setBusy("drafting");
    setMessage("");
    setDraft(null);
    setSent(false);
    try {
      const data = await post("/api/outreach/preview", { leadId: selectedLeadId });
      setDraft({ ...data.draft, leadId: selectedLeadId });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Návrh sa nepodarilo vygenerovať.");
    } finally {
      setBusy("idle");
    }
  }

  async function handleApprove() {
    if (!draft) return;
    if (!window.confirm(`Odoslať tento email na ${draft.to}?`)) return;
    setBusy("sending");
    setMessage("");
    try {
      await post("/api/outreach/send", { leadId: draft.leadId, activityId: draft.activityId });
      setSent(true);
      setMessage(`Email bol odoslaný na ${draft.to}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Email sa nepodarilo odoslať.");
    } finally {
      setBusy("idle");
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">AI Outreach</h2>
        <p className="text-sm text-gray-500">
          AI pripraví návrh emailu. Odíde až po tom, čo text skontrolujete a schválite.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Vyber lead</label>
          <select
            value={selectedLeadId}
            onChange={(e) => selectLead(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.name} — {lead.email || "bez emailu"} — {lead.status} — score {lead.score}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleDraft}
            disabled={busy !== "idle" || !selectedLeadId}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {busy === "drafting" ? "Pripravujem návrh..." : draft ? "Nový návrh" : "Vygenerovať návrh"}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Obmedzenia odosielania: Zobrazujú sa iba leady, ktoré majú email a povolený stav. Odosielanie správ je limitované denným limitom.
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          {message}
        </div>
      )}

      {draft && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {sent ? "Odoslaný email" : "Návrh — skontrolujte pred odoslaním"}
          </p>
          <p className="mt-2 text-xs text-gray-500">Komu: {draft.to}</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{draft.subject}</p>
          <pre className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{draft.body}</pre>
          {!sent && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={busy !== "idle"}
              className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {busy === "sending" ? "Odosielam..." : "Schváliť a odoslať"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
