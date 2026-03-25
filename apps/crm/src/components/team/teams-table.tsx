"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Team = {
  id: string;
  name: string;
  isActive: boolean;
};

export default function TeamsTable({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submitPatch(teamId: string, payload: { name?: string; isActive?: boolean }) {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/team/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa upraviť tím.");
      }

      setEditingId(null);
      setName("");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Nepodarilo sa upraviť tím.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Tímy</h2>
        <p className="text-sm text-gray-500">Prehľad organizačných jednotiek.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Názov tímu</th>
              <th className="px-5 py-3 font-medium">Stav</th>
              <th className="px-5 py-3 font-medium text-right">Akcie</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {teams.map((team) => (
              <tr key={team.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-900">
                  {editingId === team.id ? (
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                    />
                  ) : (
                    team.name
                  )}
                </td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    {team.isActive ? "Aktívny" : "Neaktívny"}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {editingId === team.id ? (
                      <>
                        <button
                          type="button"
                          disabled={isSaving || !name.trim()}
                          onClick={() => void submitPatch(team.id, { name: name.trim() })}
                          className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                        >
                          Uložiť
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setName("");
                          }}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Zrušiť
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(team.id);
                            setName(team.name);
                          }}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Upraviť
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => void submitPatch(team.id, { isActive: !team.isActive })}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                          {team.isActive ? "Deaktivovať" : "Aktivovať"}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
