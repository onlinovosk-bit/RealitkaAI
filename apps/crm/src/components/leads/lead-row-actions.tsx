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
    if (!confirm("Naozaj chcete vymazať túto príležitosť?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa vymazať príležitosť.");
      }

      onDelete(lead.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Nepodarilo sa vymazať príležitosť.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={() => router.push(`/leads/${lead.id}`)}
        className="min-h-[36px] rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-3 sm:text-sm"
      >
        Detail
      </button>

      <button
        type="button"
        onClick={() => router.push(`/leads/${lead.id}?edit=true`)}
        className="min-h-[36px] rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-3 sm:text-sm"
      >
        Upraviť
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="min-h-[36px] rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-60 sm:px-3 sm:text-sm"
      >
        {isDeleting ? "Mažem..." : "Vymazať"}
      </button>
    </div>
  );
}