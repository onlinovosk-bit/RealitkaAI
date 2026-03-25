"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Profile = {
  id: string;
  fullName: string;
  email: string | null;
  role: string;
  phone: string | null;
  teamId: string | null;
  isActive: boolean;
};

type Team = {
  id: string;
  name: string;
};

function getRoleBadge(role: string) {
  switch (role) {
    case "owner":
      return "bg-purple-100 text-purple-700";
    case "manager":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-green-100 text-green-700";
  }
}

export default function TeamUsersTable({
  profiles,
  teams,
}: {
  profiles: Profile[];
  teams: Team[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "agent",
    teamId: "",
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  function openEdit(profile: Profile) {
    setEditingId(profile.id);
    setForm({
      fullName: profile.fullName,
      email: profile.email ?? "",
      phone: profile.phone ?? "",
      role: profile.role,
      teamId: profile.teamId ?? "",
      isActive: profile.isActive,
    });
  }

  async function submitPatch(profileId: string, payload: Record<string, unknown>) {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa upraviť používateľa.");
      }

      setEditingId(null);
      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Nepodarilo sa upraviť používateľa."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Používatelia</h2>
        <p className="text-sm text-gray-500">Zoznam agentov, manažérov a ownerov.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Meno</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Telefón</th>
              <th className="px-5 py-3 font-medium">Rola</th>
              <th className="px-5 py-3 font-medium">Tím</th>
              <th className="px-5 py-3 font-medium">Stav</th>
              <th className="px-5 py-3 font-medium text-right">Akcie</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {profiles.map((profile) => {
              const team = teams.find((item) => item.id === profile.teamId);

              return (
                <tr key={profile.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-medium text-gray-900">
                    {editingId === profile.id ? (
                      <input
                        value={form.fullName}
                        onChange={(e) => setForm((current) => ({ ...current, fullName: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                      />
                    ) : (
                      profile.fullName
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {editingId === profile.id ? (
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                      />
                    ) : (
                      profile.email
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {editingId === profile.id ? (
                      <input
                        value={form.phone}
                        onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                      />
                    ) : (
                      profile.phone
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {editingId === profile.id ? (
                      <select
                        value={form.role}
                        onChange={(e) => setForm((current) => ({ ...current, role: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                      >
                        <option value="agent">agent</option>
                        <option value="manager">manager</option>
                        <option value="owner">owner</option>
                      </select>
                    ) : (
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadge(profile.role)}`}>
                        {profile.role}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {editingId === profile.id ? (
                      <select
                        value={form.teamId}
                        onChange={(e) => setForm((current) => ({ ...current, teamId: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                      >
                        <option value="">Bez tímu</option>
                        {teams.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      team?.name ?? "Bez tímu"
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {editingId === profile.id ? (
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={form.isActive}
                          onChange={(e) => setForm((current) => ({ ...current, isActive: e.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        Aktívny
                      </label>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        {profile.isActive ? "Aktívny" : "Neaktívny"}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {editingId === profile.id ? (
                        <>
                          <button
                            type="button"
                            disabled={isSaving || !form.fullName.trim() || !form.email.trim()}
                            onClick={() =>
                              void submitPatch(profile.id, {
                                fullName: form.fullName.trim(),
                                email: form.email.trim(),
                                phone: form.phone.trim(),
                                role: form.role,
                                teamId: form.teamId || null,
                                isActive: form.isActive,
                              })
                            }
                            className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                          >
                            Uložiť
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Zrušiť
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(profile)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Upraviť
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() =>
                              void submitPatch(profile.id, { isActive: !profile.isActive })
                            }
                            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                          >
                            {profile.isActive ? "Deaktivovať" : "Aktivovať"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
