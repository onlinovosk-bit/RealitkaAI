"use client";
import { useState } from "react";

export default function CallAnalyzerClient() {
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<{ sentiment: string; nextAction: string; summary: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function analyze() {
    if (!transcript.trim()) return;
    setLoading(true);
    const res = await fetch("/api/ai/call/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    const data = await res.json();
    if (data.ok) setResult(data);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <textarea
        className="w-full rounded-xl border border-white/10 bg-slate-900/60 p-3 text-sm text-white placeholder:text-slate-500 resize-none"
        rows={8}
        placeholder="Vlož prepis hovoru..."
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
      />
      <button
        onClick={analyze}
        disabled={loading}
        className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-50"
      >
        {loading ? "Analyzujem..." : "Analyzovať"}
      </button>
      {result && (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
          <p className="text-xs text-slate-400">Sentiment: <span className="text-white">{result.sentiment}</span></p>
          <p className="text-xs text-slate-400">Ďalší krok: <span className="text-cyan-300">{result.nextAction}</span></p>
          <p className="text-xs text-slate-300">{result.summary}</p>
        </div>
      )}
    </div>
  );
}
