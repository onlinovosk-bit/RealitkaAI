"use client";

import { useState } from "react";

export default function PortalImportPanel() {
  const [csv, setCsv] = useState("");
  const [status, setStatus] = useState<"idle" | "importing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleImport() {
    if (!csv.trim()) {
      setMessage("Vlož CSV obsah pred importom.");
      return;
    }
    setStatus("importing");
    setMessage("");
    try {
      const res = await fetch("/api/integrations/portal/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Import zlyhal.");
      setStatus("done");
      setMessage("Portálové leady boli úspešne importované.");
      setCsv("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Import zlyhal.");
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Import portálových leadov (CSV)</h2>
      <p className="mt-1 text-sm text-gray-500">
        Vlož CSV zo Slovenská nehnuteľnosť / Nehnuteľnosti.sk a importuj leady.
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

      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={6}
        placeholder="Vlož CSV obsah sem..."
        className="mt-4 w-full rounded-lg border border-gray-300 p-3 text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
      />

      <button
        onClick={handleImport}
        disabled={status === "importing"}
        className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {status === "importing" ? "Importujem..." : "Importovať leady"}
      </button>
    </div>
  );
}
