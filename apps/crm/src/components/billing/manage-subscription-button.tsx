"use client";

import { useState } from "react";
import { fetchJson } from "@/lib/request-helpers";

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);

    try {
      const data = await fetchJson("/api/billing/portal", {
        method: "POST",
      });

      if (data?.result?.url) {
        window.location.href = data.result.url;
        return;
      }

      throw new Error("Stripe portal URL nebola vrátená.");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Nepodarilo sa otvoriť billing portal."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={openPortal}
      disabled={loading}
      className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
    >
      {loading ? "Otváram..." : "Spravovať predplatné"}
    </button>
  );
}
