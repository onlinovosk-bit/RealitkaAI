import type { Lead } from "@/lib/leads-store";

export type RevenueTileStatus = "live" | "pending" | "hidden";

export type RevenueTileKey =
  | "action_queue"
  | "leads_by_source"
  | "pipeline_velocity"
  | "forecast_risk"
  | "ai_priority_strip"
  | "liquidity_radar"
  | "demand_supply_gap"
  | "neural_prediction_accuracy"
  | "live_market_pulse"
  | "kataster_context";

export type RevenueTilePolicy = {
  key: RevenueTileKey;
  label: string;
  cluster: number;
  source: string;
  status: RevenueTileStatus;
  pendingMessage?: string;
};

export const REVENUE_TILE_REGISTRY: Record<RevenueTileKey, RevenueTilePolicy> = {
  action_queue: {
    key: "action_queue",
    label: "Nekontaktované leady / Action Queue",
    cluster: 1,
    source: "leads (status='Nový')",
    status: "live",
  },
  leads_by_source: {
    key: "leads_by_source",
    label: "Leady podľa zdroja",
    cluster: 1,
    source: "leads.source",
    status: "live",
  },
  pipeline_velocity: {
    key: "pipeline_velocity",
    label: "Pipeline Velocity",
    cluster: 1,
    source: "zmeny status v čase",
    status: "pending",
    pendingMessage: "Zobrazí sa, keď sa leady začnú posúvať pipeline-om.",
  },
  forecast_risk: {
    key: "forecast_risk",
    label: "Forecast / predikcia rizika",
    cluster: 1,
    source: "activities + status história",
    status: "pending",
    pendingMessage: "Počíta sa z aktivít a histórie statusov. Zobrazí sa po prvých kontaktoch.",
  },
  ai_priority_strip: {
    key: "ai_priority_strip",
    label: "AI Priority Strip",
    cluster: 1,
    source: "leads.ai_priority",
    status: "pending",
    pendingMessage: "Priorita sa odomkne po diverzifikácii AI triáže (nie keď všetko ostáva na jednej úrovni).",
  },
  liquidity_radar: {
    key: "liquidity_radar",
    label: "Likvidita v Radare",
    cluster: 1,
    source: "leads.budget",
    status: "pending",
    pendingMessage: "Doplň rozpočty leadov a uvidíš kúpnu silu v pipeline.",
  },
  demand_supply_gap: {
    key: "demand_supply_gap",
    label: "Demand/Supply Gap",
    cluster: 5,
    source: "portálové dáta + leads.property_type",
    status: "hidden",
  },
  neural_prediction_accuracy: {
    key: "neural_prediction_accuracy",
    label: "Neural Prediction Accuracy",
    cluster: 1,
    source: "história predikcií vs výsledky",
    status: "hidden",
  },
  live_market_pulse: {
    key: "live_market_pulse",
    label: "Live Market Pulse",
    cluster: 5,
    source: "portálové dáta",
    status: "hidden",
  },
  kataster_context: {
    key: "kataster_context",
    label: "Kataster / parcelný kontext",
    cluster: 2,
    source: "ZBGIS WMS",
    status: "live",
  },
};

function leadCreatedAt(lead: Lead): number {
  const fallback = Number.MAX_SAFE_INTEGER;
  const raw = (lead as Lead & { createdAt?: string }).createdAt;
  if (!raw) return fallback;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function getActionQueueLeads(leads: Lead[]) {
  return leads
    .filter((lead) => lead.status === "Nový" || lead.status === "new")
    .sort((a, b) => leadCreatedAt(a) - leadCreatedAt(b));
}

export function countLeadsBySource(leads: Lead[]) {
  const tally = new Map<string, number>();
  for (const lead of leads) {
    const source = lead.source?.trim() || "Neznámy zdroj";
    tally.set(source, (tally.get(source) ?? 0) + 1);
  }
  return Array.from(tally.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}
