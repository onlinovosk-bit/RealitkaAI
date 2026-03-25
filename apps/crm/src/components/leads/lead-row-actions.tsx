"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lead } from "@/lib/leads-store";

interface LeadRowActionsProps {
  lead: Lead;
  onDelete: (id: string) => void;
}

export default function LeadRowActions({ lead, onDelete }: LeadRowActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Naozaj chcete vymazať tento lead?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa vymazať lead.");
      }

      onDelete(lead.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Nepodarilo sa vymazať lead.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => router.push(`/leads/${lead.id}`)}
        className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Detail
      </button>

      <button
        onClick={() => router.push(`/leads/${lead.id}?edit=true`)}
        className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Upraviť
      </button>

      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded-lg border border-red-300 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        {isDeleting ? "Mažem..." : "Vymazať"}
      </button>
    </div>
  );
}