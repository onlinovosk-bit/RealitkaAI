import fs from "fs";
import path from "path";

const files = {
  "src/lib/ai/ai-engine-types.ts": `export type AiEngineSnapshot = {
  version: "v2";
  combinedScore: number;
  legacyScore: number;
  confidence: number;
  timeToCloseDays: number;
  updatedAt: string;
};
`,
  "src/lib/ai/probability.ts": `export function computeProbability(score: number): number {
  return Math.min(1, Math.max(0, score / 100));
}
`,
  "src/lib/ai/confidence.ts": `export function computeConfidence(dataPoints: number): number {
  if (dataPoints <= 0) return 0.3;
  if (dataPoints >= 10) return 0.95;
  return 0.3 + (dataPoints / 10) * 0.65;
}
`,
  "src/lib/ai/time-to-close.ts": `export function estimateTimeToCloseDays(score: number): number {
  if (score >= 80) return 14;
  if (score >= 60) return 30;
  if (score >= 40) return 60;
  return 90;
}
`,
  "src/lib/ai/signals.ts": `export type SignalType = "email_open" | "email_click" | "portal_visit" | "call" | "meeting";
export type Signal = { type: SignalType; timestamp: string; metadata?: Record<string, unknown> };
const W: Record<SignalType, number> = { email_open: 2, email_click: 5, portal_visit: 3, call: 10, meeting: 15 };
export function scoreSignals(signals: Signal[]): number {
  return signals.reduce((s, x) => s + (W[x.type] ?? 1), 0);
}
`,
  "src/lib/ai/forecast-money.ts": `export function forecastRevenue(leads: { score: number; budget: number }[]): number {
  return leads.reduce((sum, l) => sum + l.budget * (l.score / 100), 0);
}
`,
  "src/lib/ai/forecast-snapshot.ts": `export type ForecastSnapshot = {
  period: string;
  expectedRevenue: number;
  leadsCount: number;
  avgScore: number;
  generatedAt: string;
};
export function buildForecastSnapshot(
  period: string,
  leads: { score: number; budget: number }[]
): ForecastSnapshot {
  const n = leads.length;
  const rev = leads.reduce((s, l) => s + l.budget * (l.score / 100), 0);
  const avg = n > 0 ? leads.reduce((s, l) => s + l.score, 0) / n : 0;
  return { period, expectedRevenue: rev, leadsCount: n, avgScore: avg, generatedAt: new Date().toISOString() };
}
`,
  "src/lib/ai/multi-model.ts": `export type ModelResult = { model: string; score: number; confidence: number };
export function mergeModelResults(r: ModelResult[]): { score: number; confidence: number } {
  if (!r.length) return { score: 50, confidence: 0.5 };
  const tc = r.reduce((s, x) => s + x.confidence, 0);
  return { score: r.reduce((s, x) => s + x.score * x.confidence, 0) / tc, confidence: tc / r.length };
}
`,
  "src/lib/ai/deal-strategy.ts": `export type DealStrategy = {
  summary: string;
  nextSteps: string[];
  objections: string[];
  closingTechnique: string;
};
export async function generateDealStrategy(lead: Record<string, unknown>): Promise<DealStrategy> {
  const score = typeof lead.score === "number" ? lead.score : 50;
  return {
    summary: score >= 70 ? "Vysoká priorita" : "Stredná priorita",
    nextSteps: ["Zavolať do 24 hodín", "Pripraviť ponuku", "Navrhnúť obhliadku"],
    objections: ["Cena je príliš vysoká", "Ešte nie sme rozhodnutí", "Pozeráme aj iné"],
    closingTechnique: score >= 70 ? "Urgency close" : "Value close",
  };
}
`,
  "src/lib/ai/sales-brain.ts": `export type SalesBrainInsight = {
  headline: string;
  reasoning: string;
  priority: "high" | "medium" | "low";
  suggestedAction: string;
};
export async function analyzeSalesBrain(
  _id: string,
  d: Record<string, unknown>
): Promise<SalesBrainInsight> {
  const s = typeof d.score === "number" ? d.score : 50;
  const p: "high" | "medium" | "low" = s >= 75 ? "high" : s >= 50 ? "medium" : "low";
  return {
    headline: s >= 75 ? "Horúci lead" : "Potenciálny lead",
    reasoning: \`Skóre \${s}/100\`,
    priority: p,
    suggestedAction: p === "high" ? "Zavolaj dnes" : "Pošli email",
  };
}
`,
  "src/lib/ai/call-analysis.ts": `export type CallAnalysisResult = {
  sentiment: "positive" | "neutral" | "negative";
  keyTopics: string[];
  nextAction: string;
  score: number;
  summary: string;
};
export async function analyzeCall(t: string): Promise<CallAnalysisResult> {
  return {
    sentiment: "neutral",
    keyTopics: ["cena", "lokalita", "termín"],
    nextAction: "Odoslať ponuku do 24 hodín",
    score: Math.min(100, t.split(/\s+/).length / 2),
    summary: "Hovor prebehol štandardne.",
  };
}
`,
  "src/lib/ai/call-transcript.ts": `export type TranscriptSegment = {
  speaker: "agent" | "client";
  text: string;
  startMs: number;
  endMs: number;
};
export type Transcript = { segments: TranscriptSegment[]; fullText: string; durationMs: number };
export function buildTranscriptText(segs: TranscriptSegment[]): string {
  return segs.map((s) => (s.speaker === "agent" ? "Maklér" : "Klient") + ": " + s.text).join("\n");
}
`,
  "src/lib/ai/call-coach.ts": `export type CoachFeedback = { score: number; strengths: string[]; improvements: string[]; tip: string };
export async function generateCallCoachFeedback(_t: string): Promise<CoachFeedback> {
  return {
    score: 72,
    strengths: ["Dobrý úvod", "Aktívne počúvanie"],
    improvements: ["Viac otvorených otázok", "Kratší monológ"],
    tip: "Vždy potvrď dátum ďalšieho kontaktu.",
  };
}
`,
  "src/lib/ai/autopilot-rules.ts": `export type AutopilotRule = {
  id: string;
  name: string;
  trigger: "score_above" | "score_below" | "no_contact_days" | "email_click";
  threshold: number;
  action: "send_email" | "create_task" | "notify_agent";
  enabled: boolean;
};
export const DEFAULT_AUTOPILOT_RULES: AutopilotRule[] = [
  { id: "rule_hot", name: "Horúci lead", trigger: "score_above", threshold: 80, action: "notify_agent", enabled: true },
  { id: "rule_dormant", name: "Žiadny kontakt 14 dní", trigger: "no_contact_days", threshold: 14, action: "create_task", enabled: true },
];
`,
  "src/lib/ai/autopilot-runner.ts": `import type { AutopilotRule } from "@/lib/ai/autopilot-rules";
export type AutopilotTriggerContext = {
  leadId: string;
  score: number;
  daysSinceContact: number;
  emailClicked: boolean;
};
export type AutopilotActionResult = {
  ruleId: string;
  action: AutopilotRule["action"];
  executed: boolean;
  reason: string;
};
export async function runAutopilotRules(
  ctx: AutopilotTriggerContext,
  rules: AutopilotRule[]
): Promise<AutopilotActionResult[]> {
  return rules.filter((r) => r.enabled).map((rule) => {
    let ok = false;
    if (rule.trigger === "score_above" && ctx.score >= rule.threshold) ok = true;
    if (rule.trigger === "score_below" && ctx.score < rule.threshold) ok = true;
    if (rule.trigger === "no_contact_days" && ctx.daysSinceContact >= rule.threshold) ok = true;
    if (rule.trigger === "email_click" && ctx.emailClicked) ok = true;
    return { ruleId: rule.id, action: rule.action, executed: ok, reason: ok ? "Splnené" : "Nesplnené" };
  });
}
`,
  "src/lib/ai/action-executor.ts": `export type ActionType = "send_email" | "create_task" | "notify_agent";
export type ActionPayload = { type: ActionType; leadId: string; agentId?: string; message?: string };
export async function executeAction(p: ActionPayload): Promise<{ ok: boolean }> {
  console.log("[action-executor]", p.type, p.leadId);
  return { ok: true };
}
`,
  "src/lib/call-transcribe-limits.ts": `export const TRANSCRIBE_MAX_FILE_SIZE_MB = 25;
export const TRANSCRIBE_ALLOWED_MIME_TYPES = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg"];
export function isFileSizeAllowed(b: number): boolean {
  return b <= TRANSCRIBE_MAX_FILE_SIZE_MB * 1024 * 1024;
}
export function isMimeTypeAllowed(m: string): boolean {
  return TRANSCRIBE_ALLOWED_MIME_TYPES.includes(m);
}
`,
  "src/lib/rate-limit.ts": `const counters = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(key: string, max: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const e = counters.get(key);
  if (!e || now > e.resetAt) {
    counters.set(key, { count: 1, resetAt: now + 60_000 });
    return { allowed: true, remaining: max - 1 };
  }
  if (e.count >= max) return { allowed: false, remaining: 0 };
  e.count++;
  return { allowed: true, remaining: max - e.count };
}
`,
  "src/lib/founder/types.ts": `export type FounderMetrics = {
  totalRevenue: number;
  activeLeads: number;
  conversionRate: number;
  avgDealSize: number;
  topAgents: { id: string; name: string; score: number }[];
};
export type GrowthDataPoint = { month: string; revenue: number; leads: number };
export type WhyLostReason = { reason: string; count: number; percentage: number };
`,
  "src/lib/activities-store-proxy.ts": `import { createClient } from "@/lib/supabase/server";
export async function createActivity(data: {
  lead_id: string;
  type: string;
  note?: string;
  agent_id?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert(data);
  if (error) throw error;
}
`,
  "src/hooks/useLandingCtaVariant.ts": `"use client";
import { useMemo } from "react";
export function useLandingCtaVariant(): "a" | "b" {
  return useMemo(() => (Math.random() < 0.5 ? "a" : "b"), []);
}
`,
};

for (const [filePath, content] of Object.entries(files)) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  console.log("OK:", filePath);
}
console.log("Done — all stubs written.");
