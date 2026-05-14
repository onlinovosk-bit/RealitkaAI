"use client";
import { useEffect, useState } from "react";
import { getLeads } from "@/lib/leads-store";

type CoachFeedback = {
  score:            number;
  strengths:        string[];
  improvements:     string[];
  tip:              string;
  next_suggestions: string[];
};

export default function CallAnalyzerClient() {
  const [transcript, setTranscript]       = useState("");
  const [result, setResult]               = useState<{
    sentiment: string;
    nextAction: string;
    summary: string;
    persisted?: { activity_id?: string; task_id?: string };
  } | null>(null);
  const [leadOptions, setLeadOptions]     = useState<{ id: string; name: string }[]>([]);
  const [persistLeadId, setPersistLeadId] = useState("");
  const [persistCRM, setPersistCRM]       = useState(false);
  const [transcribing, setTranscribing]   = useState(false);
  const [loading, setLoading]             = useState(false);
  const [coachLoading, setCoachLoading]   = useState(false);
  const [coachRaw, setCoachRaw]           = useState("");
  const [coachParsed, setCoachParsed]     = useState<CoachFeedback | null>(null);
  const [coachError, setCoachError]       = useState<string | null>(null);

  useEffect(() => {
    void getLeads()
      .then((ls) => setLeadOptions(ls.map((l) => ({ id: l.id, name: l.name }))))
      .catch(() => {});
  }, []);

  async function analyze() {
    if (!transcript.trim()) return;
    setLoading(true);
    const res = await fetch("/api/ai/call/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        lead_id: persistLeadId.trim() || undefined,
        persist_to_crm: persistCRM && persistLeadId.trim().length > 0,
      }),
    });
    const data = await res.json();
    if (data.ok)
      setResult({
        sentiment: data.sentiment,
        nextAction: data.nextAction,
        summary: data.summary,
        persisted: data.persisted,
      });
    setLoading(false);
  }

  async function transcribeFile(file: File) {
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/ai/call/transcribe", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok && data.transcript) setTranscript(String(data.transcript));
    } finally {
      setTranscribing(false);
    }
  }

  async function runCoaching() {
    if (!transcript.trim()) return;
    setCoachLoading(true);
    setCoachRaw("");
    setCoachParsed(null);
    setCoachError(null);

    const res = await fetch("/api/ai/call-coach/stream", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ transcript }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Neznáma chyba" }));
      setCoachError(err.error === "transcript_too_short"
        ? "Prepis je príliš krátky (min. 80 znakov)."
        : err.error ?? "Neznáma chyba");
      setCoachLoading(false);
      return;
    }

    const reader  = res.body!.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") {
          try {
            const clean = accumulated
              .replace(/^```json\s*/m, "")
              .replace(/^```\s*/m, "")
              .replace(/```\s*$/m, "")
              .trim();
            setCoachParsed(JSON.parse(clean) as CoachFeedback);
          } catch {
            // JSON parse failed — raw text is already shown
          }
          break;
        }
        try {
          const parsed = JSON.parse(payload) as { text?: string; error?: string };
          if (parsed.error) {
            setCoachError(parsed.error);
            break;
          }
          if (parsed.text) {
            accumulated += parsed.text;
            setCoachRaw(accumulated);
          }
        } catch {
          // partial chunk — ignore
        }
      }
    }

    setCoachLoading(false);
  }

  function scoreColor(score: number): string {
    if (score >= 70) return "text-green-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3 space-y-2">
        <p className="text-xs text-slate-400">
          Nahraj krátku nahrávku — Whisper vyžaduje nastavený{" "}
          <code className="text-cyan-300">OPENAI_API_KEY</code> na serveri.
        </p>
        <input
          type="file"
          accept="audio/*"
          disabled={transcribing}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void transcribeFile(f);
          }}
          className="text-xs text-slate-300"
        />
        {transcribing ? <p className="text-xs text-slate-500">Transkriptujem…</p> : null}
      </div>

      <textarea
        className="w-full rounded-xl border border-white/10 bg-slate-900/60 p-3 text-sm text-white placeholder:text-slate-500 resize-none"
        rows={8}
        placeholder="Vlož prepis hovoru..."
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
      />

      <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={persistCRM}
            onChange={(e) => setPersistCRM(e.target.checked)}
          />
          Uložiť súhrn + úlohu do CRM
        </label>
        <select
          className="rounded-lg border border-white/15 bg-slate-900 px-2 py-1 text-xs text-white min-w-[200px]"
          value={persistLeadId}
          onChange={(e) => setPersistLeadId(e.target.value)}
        >
          <option value="">— vyber leada —</option>
          {leadOptions.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {/* ── Existing analyze section ── */}
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
          {result.persisted?.task_id ? (
            <p className="text-[11px] text-emerald-400">
              Uložené do CRM (úloha {result.persisted.task_id.slice(0, 8)}…)
            </p>
          ) : null}
        </div>
      )}

      {/* ── Call coaching section ── */}
      <div className="pt-2 border-t border-white/10">
        <button
          onClick={runCoaching}
          disabled={coachLoading}
          className="rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-50 transition-colors"
        >
          {coachLoading ? "Analyzujem koučing..." : "Koučing hovoru"}
        </button>

        {coachError && (
          <p className="mt-3 text-sm text-red-400">{coachError}</p>
        )}

        {/* Streaming raw text — shown while loading, hidden once parsed */}
        {coachLoading && coachRaw && !coachParsed && (
          <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-400 font-mono whitespace-pre-wrap break-words">{coachRaw}</p>
          </div>
        )}

        {/* Structured result */}
        {coachParsed && (
          <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-4">
            {/* Score */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Skóre hovoru</span>
              <span className={`text-2xl font-bold ${scoreColor(coachParsed.score)}`}>
                {coachParsed.score}
                <span className="text-base font-normal text-slate-500">/100</span>
              </span>
            </div>

            {/* Strengths */}
            {coachParsed.strengths.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Silné stránky</p>
                <ul className="space-y-1">
                  {coachParsed.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-200">
                      <span className="text-green-400 shrink-0">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {coachParsed.improvements.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Zlepšenia</p>
                <ul className="space-y-1">
                  {coachParsed.improvements.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-200">
                      <span className="text-yellow-400 shrink-0">→</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tip */}
            {coachParsed.tip && (
              <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-3 py-2">
                <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-0.5">Kľúčový tip</p>
                <p className="text-sm text-cyan-200">{coachParsed.tip}</p>
              </div>
            )}

            {/* Next suggestions */}
            {coachParsed.next_suggestions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Ďalšie návrhy</p>
                <ul className="space-y-1">
                  {coachParsed.next_suggestions.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-300">
                      <span className="text-slate-500 shrink-0">{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Fallback: raw text if JSON parse failed but stream completed */}
        {!coachLoading && !coachParsed && !coachError && coachRaw && (
          <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-400 font-mono whitespace-pre-wrap break-words">{coachRaw}</p>
          </div>
        )}
      </div>
    </div>
  );
}
