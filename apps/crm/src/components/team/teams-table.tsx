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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-blue-950/5">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-950">Tímy</h2>
        <p className="text-sm text-slate-500">Prehľad organizačných jednotiek.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Názov tímu</th>
              <th className="px-5 py-3 font-medium">Stav</th>
              <th className="px-5 py-3 font-medium text-right">Akcie</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {teams.map((team) => (
              <tr key={team.id} className="transition-colors hover:bg-blue-50/50">
                <td className="px-5 py-4 font-medium text-slate-950">
                  {editingId === team.id ? (
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  ) : (
                    team.name
                  )}
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${team.isActive ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}>
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
                          className="min-h-11 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-60 sm:min-h-0"
                        >
                          Uložiť
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setName("");
                          }}
                          className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:min-h-0"
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
                          className="min-h-11 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:min-h-0"
                        >
                          Upraviť
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => void submitPatch(team.id, { isActive: !team.isActive })}
                          className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 sm:min-h-0"
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
