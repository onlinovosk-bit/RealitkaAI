"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Lead = {
  id: string;
  name: string;
  location: string;
  status: string;
  assignedAgent: string;
  assignedProfileId?: string | null;
};

type Profile = {
  id: string;
  fullName: string;
  role: string;
};

export default function AgentAssignmentTable({
  leads,
  profiles,
}: {
  leads: Lead[];
  profiles: Profile[];
}) {
  const router = useRouter();
  const [loadingLeadId, setLoadingLeadId] = useState<string | null>(null);

  async function handleAssign(leadId: string, profileId: string) {
    setLoadingLeadId(leadId);

    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignedProfileId: profileId,
          lastContact: "Lead bol priradený agentovi",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa priradiť lead.");
      }

      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Nepodarilo sa priradiť lead."
      );
    } finally {
      setLoadingLeadId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Priradenie leadov agentom</h2>
        <p className="text-sm text-gray-500">
          Rýchle rozdelenie leadov medzi maklérov.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Lead</th>
              <th className="px-5 py-3 font-medium">Lokalita</th>
              <th className="px-5 py-3 font-medium">Stav</th>
              <th className="px-5 py-3 font-medium">Aktuálny agent</th>
              <th className="px-5 py-3 font-medium">Priradiť novému</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-900">{lead.name}</td>
                <td className="px-5 py-4 text-gray-700">{lead.location}</td>
                <td className="px-5 py-4 text-gray-700">{lead.status}</td>
                <td className="px-5 py-4 text-gray-700">{lead.assignedAgent}</td>
                <td className="px-5 py-4">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        void handleAssign(lead.id, e.target.value);
                      }
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  >
                    <option value="">
                      {loadingLeadId === lead.id ? "Priraďujem..." : "Vyber agenta"}
                    </option>
                    {profiles
                      .filter((profile) => profile.role === "agent" || profile.role === "manager")
                      .map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.fullName}
                        </option>
                      ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
