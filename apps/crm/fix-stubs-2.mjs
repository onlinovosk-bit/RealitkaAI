import fs from "fs";
import path from "path";

const files = {
  // API routes
  "src/app/api/ai/autopilot/run/route.ts": `import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_AUTOPILOT_RULES } from "@/lib/ai/autopilot-rules";
import { runAutopilotRules } from "@/lib/ai/autopilot-runner";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { leadId: string; score?: number; daysSinceContact?: number; emailClicked?: boolean };
  const results = await runAutopilotRules(
    { leadId: body.leadId, score: body.score ?? 50, daysSinceContact: body.daysSinceContact ?? 0, emailClicked: body.emailClicked ?? false },
    DEFAULT_AUTOPILOT_RULES
  );
  return NextResponse.json({ ok: true, results });
}
`,
  "src/app/api/ai/call/analyze/route.ts": `import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeCall } from "@/lib/ai/call-analysis";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { transcript } = (await req.json()) as { transcript: string };
  if (!transcript) return NextResponse.json({ ok: false, error: "transcript required" }, { status: 400 });

  const result = await analyzeCall(transcript);
  return NextResponse.json({ ok: true, ...result });
}
`,
  "src/app/api/ai/call/transcribe/route.ts": `import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFileSizeAllowed, isMimeTypeAllowed } from "@/lib/call-transcribe-limits";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
  if (!isMimeTypeAllowed(file.type)) return NextResponse.json({ ok: false, error: "Unsupported format" }, { status: 400 });
  if (!isFileSizeAllowed(file.size)) return NextResponse.json({ ok: false, error: "File too large" }, { status: 400 });

  // Stub — v produkcii použiť OpenAI Whisper
  return NextResponse.json({ ok: true, transcript: "Transkript nie je k dispozícii — nakonfiguruj OpenAI API kľúč." });
}
`,
  "src/app/api/ai/monthly-forecast/route.ts": `import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildForecastSnapshot } from "@/lib/ai/forecast-snapshot";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: leads } = await supabase.from("leads").select("score, budget").eq("is_active", true);
  const snapshot = buildForecastSnapshot(
    new Date().toISOString().slice(0, 7),
    (leads ?? []).map((l) => ({ score: l.score ?? 50, budget: l.budget ?? 0 }))
  );
  return NextResponse.json({ ok: true, forecast: snapshot });
}
`,
  "src/app/api/founder/ai-plan/route.ts": `import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    ok: true,
    plan: {
      today: ["Skontrolovať top 3 leady", "Odpovedať na otvorené emaily", "Aktualizovať pipeline"],
      thisWeek: ["Follow-up s leadmi bez kontaktu 7+ dní", "Revízia cenových ponúk", "Tímový briefing"],
    },
  });
}
`,
  "src/app/api/leads/[id]/deal-strategy/route.ts": `import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDealStrategy } from "@/lib/ai/deal-strategy";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).single();
  if (!lead) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const strategy = await generateDealStrategy(lead as Record<string, unknown>);
  return NextResponse.json({ ok: true, strategy });
}
`,
  "src/app/api/leads/[id]/sales-brain/route.ts": `import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeSalesBrain } from "@/lib/ai/sales-brain";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).single();
  if (!lead) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const insight = await analyzeSalesBrain(id, lead as Record<string, unknown>);
  return NextResponse.json({ ok: true, insight });
}
`,
  // Components
  "src/components/leads/sales-brain-panel.tsx": `"use client";
import { useEffect, useState } from "react";
import type { SalesBrainInsight } from "@/lib/ai/sales-brain";

export default function SalesBrainPanel({ leadId }: { leadId: string }) {
  const [insight, setInsight] = useState<SalesBrainInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(\`/api/leads/\${leadId}/sales-brain\`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setInsight(d.insight); })
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) return <div className="animate-pulse h-20 rounded-xl bg-white/5" />;
  if (!insight) return null;

  const colors = { high: "text-red-400", medium: "text-amber-400", low: "text-slate-400" };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-white mb-2">AI Sales Brain</h3>
      <p className={\`text-sm font-bold \${colors[insight.priority]}\`}>{insight.headline}</p>
      <p className="mt-1 text-xs text-slate-400">{insight.reasoning}</p>
      <p className="mt-2 text-xs text-cyan-300">→ {insight.suggestedAction}</p>
    </div>
  );
}
`,
  "src/components/leads/deal-strategy-card.tsx": `"use client";
import { useEffect, useState } from "react";
import type { DealStrategy } from "@/lib/ai/deal-strategy";

export default function DealStrategyCard({ leadId }: { leadId: string }) {
  const [strategy, setStrategy] = useState<DealStrategy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(\`/api/leads/\${leadId}/deal-strategy\`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setStrategy(d.strategy); })
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) return <div className="animate-pulse h-24 rounded-xl bg-white/5" />;
  if (!strategy) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-white mb-2">Deal stratégia</h3>
      <p className="text-xs text-slate-300 mb-2">{strategy.summary}</p>
      <p className="text-xs font-medium text-slate-400 mb-1">Ďalšie kroky:</p>
      <ul className="space-y-1">
        {strategy.nextSteps.map((s) => (
          <li key={s} className="text-xs text-slate-300">• {s}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-cyan-300">Technika: {strategy.closingTechnique}</p>
    </div>
  );
}
`,
  "src/components/call-analyzer/call-analyzer-client.tsx": `"use client";
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
`,
  "src/components/founder/AiDailyPlanPanel.tsx": `"use client";
import { useEffect, useState } from "react";

type Plan = { today: string[]; thisWeek: string[] };

export function AiDailyPlanPanel() {
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    fetch("/api/founder/ai-plan").then((r) => r.json()).then((d) => { if (d.ok) setPlan(d.plan); });
  }, []);

  if (!plan) return <div className="animate-pulse h-32 rounded-xl bg-white/5" />;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">AI Denný plán</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-400 mb-2">Dnes</p>
          <ul className="space-y-1">{plan.today.map((t) => <li key={t} className="text-xs text-slate-300">• {t}</li>)}</ul>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 mb-2">Tento týždeň</p>
          <ul className="space-y-1">{plan.thisWeek.map((t) => <li key={t} className="text-xs text-slate-400">• {t}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}
`,
  "src/components/founder/GrowthChart.tsx": `"use client";
import type { GrowthDataPoint } from "@/lib/founder/types";

export function GrowthChart({ data }: { data: GrowthDataPoint[] }) {
  if (!data.length) return <div className="h-32 rounded-xl bg-white/5 flex items-center justify-center text-xs text-slate-500">Žiadne dáta</div>;

  const maxRev = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Rast tržieb</h3>
      <div className="flex items-end gap-2 h-24">
        {data.map((d) => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-cyan-500/70"
              style={{ height: \`\${(d.revenue / maxRev) * 80}px\` }}
            />
            <span className="text-[10px] text-slate-500">{d.month.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
`,
  "src/components/founder/WhyLostPanel.tsx": `"use client";
import type { WhyLostReason } from "@/lib/founder/types";

export function WhyLostPanel({ reasons }: { reasons: WhyLostReason[] }) {
  if (!reasons.length) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Prečo sme prišli o obchod</h3>
      <ul className="space-y-2">
        {reasons.map((r) => (
          <li key={r.reason} className="flex items-center gap-2">
            <div className="h-1.5 rounded-full bg-red-500/40" style={{ width: \`\${r.percentage}%\`, minWidth: "8px" }} />
            <span className="text-xs text-slate-400">{r.reason}</span>
            <span className="ml-auto text-xs text-slate-500">{r.count}×</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
`,
  "src/components/founder/FounderDashboard.tsx": `"use client";
import { AiDailyPlanPanel } from "@/components/founder/AiDailyPlanPanel";
import { GrowthChart } from "@/components/founder/GrowthChart";
import { WhyLostPanel } from "@/components/founder/WhyLostPanel";
import type { GrowthDataPoint, WhyLostReason } from "@/lib/founder/types";

const MOCK_GROWTH: GrowthDataPoint[] = [
  { month: "2025-10", revenue: 12000, leads: 34 },
  { month: "2025-11", revenue: 15500, leads: 41 },
  { month: "2025-12", revenue: 18200, leads: 52 },
  { month: "2026-01", revenue: 21000, leads: 58 },
  { month: "2026-02", revenue: 19800, leads: 49 },
  { month: "2026-03", revenue: 24500, leads: 63 },
];

const MOCK_WHY_LOST: WhyLostReason[] = [
  { reason: "Cena príliš vysoká", count: 12, percentage: 40 },
  { reason: "Klient si vybral konkurenciu", count: 8, percentage: 27 },
  { reason: "Zmenil plány", count: 6, percentage: 20 },
  { reason: "Bez odpovede", count: 4, percentage: 13 },
];

export function FounderDashboard() {
  return (
    <div className="space-y-4">
      <AiDailyPlanPanel />
      <GrowthChart data={MOCK_GROWTH} />
      <WhyLostPanel reasons={MOCK_WHY_LOST} />
    </div>
  );
}
`,
  "src/components/onboarding/RevolisNavSpriteIcon.tsx": `export function RevolisNavSpriteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
`,
  "src/components/shared/founder-discount-spots-counter.tsx": `"use client";
import { useFounderDiscountSpots } from "@/components/shared/founder-discount-spots-context";

export function FounderDiscountSpotsCounter() {
  const { spots, decrement } = useFounderDiscountSpots();

  if (spots <= 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-cyan-400">{spots} miest zostáva</span>
      <button
        onClick={decrement}
        className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-900"
      >
        Rezervovať
      </button>
    </div>
  );
}
`,
};

for (const [filePath, content] of Object.entries(files)) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  console.log("OK:", filePath);
}
console.log("Done — all component/route stubs written.");
