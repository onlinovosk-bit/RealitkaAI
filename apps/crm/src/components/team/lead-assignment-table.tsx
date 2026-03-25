"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Lead = {
  id: string;
  name: string;
  location?: string | null;
  status?: string | null;
  assignedAgent: string;
  assignedProfileId: string | null;
};

type AssignableProfile = {
  id: string;
  fullName: string;
  role: string;
  teamId?: string | null;
};

export default function LeadAssignmentTable({
  leads,
  assignableProfiles,
  canAssign,
}: {
  leads: Lead[];
  assignableProfiles: AssignableProfile[];
  canAssign: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function handleAssign(leadId: string, profileId: string) {
    setBusy(leadId);
    setMessage("");
    try {
      const res = await fetch("/api/team/assign-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, profileId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Priradenie zlyhalo.");
      setMessage("Lead bol priradený.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Chyba pri priraďovaní.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Priraďovanie leadov</h2>
        {message && <p className="mt-1 text-sm text-gray-600">{message}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-5 py-3">Lead</th>
              <th className="px-5 py-3">Lokalita</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Priradený agent</th>
              {canAssign && <th className="px-5 py-3">Priradiť</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{lead.name}</td>
                <td className="px-5 py-3 text-gray-600">{lead.location ?? "—"}</td>
                <td className="px-5 py-3 text-gray-600">{lead.status ?? "—"}</td>
                <td className="px-5 py-3 text-gray-600">{lead.assignedAgent}</td>
                {canAssign && (
                  <td className="px-5 py-3">
                    <select
                      defaultValue={lead.assignedProfileId ?? ""}
                      disabled={busy === lead.id}
                      onChange={(e) => handleAssign(lead.id, e.target.value)}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="">— Vyber agenta —</option>
                      {assignableProfiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.role})
                        </option>
                      ))}
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {leads.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            Žiadne leady nie sú k dispozícii.
          </p>
        )}
      </div>
    </div>
  );
}
