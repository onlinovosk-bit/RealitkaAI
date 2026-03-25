"use client";

import { useState } from "react";

export default function EmailSyncPanel() {
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSync() {
    setStatus("syncing");
    setMessage("");
    try {
      const res = await fetch("/api/integrations/email/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Sync zlyhal.");
      setStatus("done");
      setMessage("Email inbox bol úspešne synchronizovaný.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Email sync zlyhal.");
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Email Inbox (IMAP)</h2>
      <p className="mt-1 text-sm text-gray-500">
        Synchronizuj správy z email inboxu.
      </p>

      {message && (
        <div
          className={`mt-3 rounded-lg border p-3 text-sm ${
            status === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      <button
        onClick={handleSync}
        disabled={status === "syncing"}
        className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {status === "syncing" ? "Synchronizujem..." : "Synchronizovať inbox"}
      </button>
    </div>
  );
}
