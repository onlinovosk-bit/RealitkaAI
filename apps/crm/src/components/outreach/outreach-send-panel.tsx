"use client";

import { useState } from "react";

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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [lastSubject, setLastSubject] = useState("");
  const [lastBody, setLastBody] = useState("");

  async function handleSend() {
    if (!selectedLeadId) {
      setMessage("Najprv vyber lead.");
      return;
    }

    setLoading(true);
    setMessage("");
    setLastSubject("");
    setLastBody("");

    try {
      const response = await fetch("/api/outreach/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: selectedLeadId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa odoslať AI email.");
      }

      setMessage(`Email bol odoslaný na ${data.result.to}.`);
      setLastSubject(data.result.subject);
      setLastBody(data.result.body);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nepodarilo sa odoslať AI email."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">AI Outreach</h2>
        <p className="text-sm text-gray-500">
          AI automaticky napíše a odošle email klientovi.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Vyber lead</label>
          <select
            value={selectedLeadId}
            onChange={(e) => setSelectedLeadId(e.target.value)}
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
            onClick={handleSend}
            disabled={loading || !selectedLeadId}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? "Generujem a odosielam..." : "Vygenerovať a odoslať"}
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

      {(lastSubject || lastBody) && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Posledný odoslaný email</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">{lastSubject}</p>
          <pre className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{lastBody}</pre>
        </div>
      )}
    </div>
  );
}
