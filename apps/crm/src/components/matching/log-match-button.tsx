"use client";

import { useState } from "react";

type LogMatchButtonProps = {
  leadId: string;
  propertyId: string;
};

export default function LogMatchButton({ leadId, propertyId }: LogMatchButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleClick() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/matching/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadId, propertyId }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa uložiť matching akciu.");
      }

      setMessage(`Matching bol uložený. Score ${data.score ?? "-"}.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nepodarilo sa uložiť matching akciu."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isSaving}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-60"
      >
        {isSaving ? "Ukladám..." : "Zapísať matching aktivitu"}
      </button>
      {message && <p className="text-xs text-gray-500">{message}</p>}
    </div>
  );
}