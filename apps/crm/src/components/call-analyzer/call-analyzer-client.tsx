"use client";

import { useState } from "react";

type AnalysisPayload = {
  transcriptPreview?: string;
  analysis: { score: number; strengths: string[]; weaknesses: string[] };
  coaching: { tip: string; nextStep: string };
};

export default function CallAnalyzerClient() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisPayload | null>(null);

  async function runTranscribeThenAnalyze() {
    setError(null);
    setResult(null);
    if (!file) {
      setError("Vyber audio súbor alebo použite textové pole.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const tr = await fetch("/api/ai/call/transcribe", { method: "POST", body: fd });
      const trData = (await tr.json()) as { ok?: boolean; text?: string; error?: string };
      if (!tr.ok || !trData.ok || !trData.text) {
        setError(trData.error ?? "Transkripcia zlyhala.");
        return;
      }
      setText(trData.text);
      await runAnalyze(trData.text);
    } catch {
      setError("Chyba siete pri transkripcii.");
    } finally {
      setLoading(false);
    }
  }

  async function runAnalyze(transcript?: string) {
    const t = (transcript ?? text).trim();
    setError(null);
    if (t.length < 10) {
      setError("Zadaj aspoň krátky prepis (10+ znakov).");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/call/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        analysis?: AnalysisPayload["analysis"];
        coaching?: AnalysisPayload["coaching"];
        transcriptPreview?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.analysis || !data.coaching) {
        setError(data.error ?? "Analýza zlyhala.");
        return;
      }
      setResult({
        analysis: data.analysis,
        coaching: data.coaching,
        transcriptPreview: data.transcriptPreview,
      });
    } catch {
      setError("Chyba siete.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-6 text-slate-100">
        <h2 className="text-lg font-semibold text-white">Vstup</h2>
        <p className="mt-1 text-sm text-slate-400">
          Vlož prepis hovoru, alebo nahraj audio (Whisper vyžaduje OPENAI_API_KEY na serveri).
        </p>
        <textarea
          data-testid="call-analyzer-transcript"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Dobrý deň, volám ohľadom bytu v Ružinove…"
          className="mt-4 w-full rounded-xl border border-slate-600 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder:text-slate-600"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-950/50">
            Nahrať audio
            <input
              data-testid="call-analyzer-audio-file"
              type="file"
              accept="audio/*,.webm,.mp3,.m4a,.wav"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {file && <span className="text-xs text-slate-400">{file.name}</span>}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            data-testid="call-analyzer-analyze"
            type="button"
            disabled={loading}
            onClick={() => void runAnalyze()}
            className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            {loading ? "…" : "Analyzovať prepis"}
          </button>
          <button
            data-testid="call-analyzer-transcribe-analyze"
            type="button"
            disabled={loading || !file}
            onClick={() => void runTranscribeThenAnalyze()}
            className="rounded-xl border border-cyan-500/50 px-5 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-950/40 disabled:opacity-50"
          >
            Transkribovať + analyzovať
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-amber-300">{error}</p>}
      </div>

      {result && (
        <div className="space-y-4 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-slate-900 to-emerald-950/30 p-6 text-white">
          <div data-testid="call-analyzer-result">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/90">Call Score</p>
            <p className="mt-1 text-4xl font-bold text-emerald-300">{result.analysis.score}/100</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-slate-400">Silné stránky</p>
              <ul className="mt-2 list-inside list-disc text-sm text-emerald-100/90">
                {result.analysis.strengths.length ? (
                  result.analysis.strengths.map((s) => <li key={s}>{s}</li>)
                ) : (
                  <li className="text-slate-500">—</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Slabiny</p>
              <ul className="mt-2 list-inside list-disc text-sm text-rose-200/90">
                {result.analysis.weaknesses.length ? (
                  result.analysis.weaknesses.map((s) => <li key={s}>{s}</li>)
                ) : (
                  <li className="text-slate-500">—</li>
                )}
              </ul>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold text-slate-400">Odporúčanie (AI coach)</p>
            <p className="mt-2 text-sm text-white">{result.coaching.tip}</p>
            <p className="mt-3 text-xs text-slate-400">Ďalší krok</p>
            <p className="text-sm text-cyan-200">{result.coaching.nextStep}</p>
          </div>
        </div>
      )}
    </div>
  );
}
