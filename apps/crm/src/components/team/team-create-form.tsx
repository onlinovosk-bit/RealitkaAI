"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TeamCreateForm({ agencyId, canCreate = true }: { agencyId: string; canCreate?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/team/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agencyId,
          name,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa vytvoriť tím.");
      }

      setMessage("Tím bol úspešne vytvorený.");
      setName("");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nepodarilo sa vytvoriť tím."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Pridať tím</h2>
      <p className="mt-1 text-sm text-gray-500">
        Vytvor novú organizačnú jednotku.
      </p>

      {message && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Názov tímu
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="napr. Predaj Košice"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {isSaving ? "Ukladám..." : "Vytvoriť tím"}
        </button>
      </form>
    </div>
  );
}
