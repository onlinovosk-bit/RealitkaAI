"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type TeamOption = {
  id: string;
  name: string;
};

export default function UserCreateForm({
  agencyId,
  teams,
  canCreate = true,
}: {
  agencyId: string;
  teams: TeamOption[];
  canCreate?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    role: "agent",
    phone: "",
    teamId: teams[0]?.id ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  function updateField(name: string, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/team/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agencyId,
          teamId: form.teamId || null,
          fullName: form.fullName,
          email: form.email,
          role: form.role,
          phone: form.phone,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa vytvoriť používateľa.");
      }

      setMessage("Používateľ bol úspešne vytvorený.");
      setForm({
        fullName: "",
        email: "",
        role: "agent",
        phone: "",
        teamId: teams[0]?.id ?? "",
      });
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Nepodarilo sa vytvoriť používateľa."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-blue-950/5">
      <h2 className="text-lg font-semibold text-slate-950">Pridať používateľa</h2>
      <p className="mt-1 text-sm text-slate-500">
        Vytvor nového agenta, manažéra alebo ownera.
      </p>

      {message && (
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Meno</label>
          <input
            required
            value={form.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Telefón</label>
          <input
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Rola</label>
          <select
            value={form.role}
            onChange={(e) => updateField("role", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="agent">Agent</option>
            <option value="manager">Manager</option>
            <option value="owner">Owner</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tím</label>
          <select
            value={form.teamId}
            onChange={(e) => updateField("teamId", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="min-h-11 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {isSaving ? "Ukladám..." : "Vytvoriť používateľa"}
        </button>
      </form>
    </div>
  );
}
