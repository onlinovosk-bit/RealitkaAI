import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { resolveDataPort } from "../agents/data-port.js";
import {
  DEFAULT_OPPORTUNITY_PARAMS,
  detectOpportunities,
  type OpportunityAssumptions,
  type OpportunityParams,
  type RangeAssumption,
} from "../agents/opportunity.js";
import { AgentError } from "../agents/types.js";
import { isRecord, requestedActionProperty, runAgentTool, type AgentToolDeps } from "./agent-support.js";

const range = {
  type: "object",
  properties: { low: { type: "number" }, high: { type: "number" } },
  required: ["low", "high"],
  additionalProperties: false,
} as const;

export const revenueOpportunitiesTool: Tool = {
  name: "onlinovo_revenue_opportunities",
  description:
    "ONL-REVENUE-OPPORTUNITY. Read-only. Detects evidence-backed commercial opportunities in the pseudonymised snapshot (fixture or unconnected). Every number is a FACT or a labelled ESTIMATE with its assumptions. It prepares audiences; it never sends, schedules or changes anything.",
  inputSchema: {
    type: "object",
    properties: {
      assumptions: {
        type: "object",
        description: "Explicit assumptions for ESTIMATE values. Without them estimated_value is null.",
        properties: {
          vat_rate: { type: "number", minimum: 0, maximum: 1 },
          revenue_per_recipient_gross: range,
          incremental_share: range,
          unpaid_recovery_share: range,
          stockout_lost_share: range,
        },
        required: ["vat_rate"],
        additionalProperties: false,
      },
      requested_action: requestedActionProperty,
    },
    additionalProperties: false,
  },
};

function parseRange(raw: unknown, name: string, max: number): RangeAssumption | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw) || typeof raw.low !== "number" || typeof raw.high !== "number") {
    throw new AgentError("INVALID_INPUT", `${name} must be {low, high} numbers`);
  }
  if (!(raw.low >= 0) || !(raw.high >= raw.low) || raw.high > max) {
    throw new AgentError("INVALID_INPUT", `${name} must satisfy 0 <= low <= high <= ${max}`);
  }
  return { low: raw.low, high: raw.high };
}

export function parseAssumptions(raw: unknown): OpportunityAssumptions | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) throw new AgentError("INVALID_INPUT", "assumptions must be an object");
  const vat = raw.vat_rate;
  if (typeof vat !== "number" || !(vat >= 0) || vat > 1) throw new AgentError("INVALID_INPUT", "vat_rate must be a number in 0..1");
  return {
    vat_rate: vat,
    revenue_per_recipient_gross: parseRange(raw.revenue_per_recipient_gross, "revenue_per_recipient_gross", 1000),
    incremental_share: parseRange(raw.incremental_share, "incremental_share", 1),
    unpaid_recovery_share: parseRange(raw.unpaid_recovery_share, "unpaid_recovery_share", 1),
    stockout_lost_share: parseRange(raw.stockout_lost_share, "stockout_lost_share", 1),
  };
}

export async function handleRevenueOpportunities(args: unknown, deps?: AgentToolDeps) {
  return runAgentTool({
    tool: "onlinovo_revenue_opportunities",
    agentId: "ONL-REVENUE-OPPORTUNITY",
    actions: ["onlinovo.data.observe", "onlinovo.opportunity.analyze", "onlinovo.opportunity.recommend"],
    args,
    deps,
    run: async ({ env, now, args: clean }) => {
      const input = isRecord(clean) ? clean : {};
      const assumptions = parseAssumptions(input.assumptions);
      const params: OpportunityParams = { ...DEFAULT_OPPORTUNITY_PARAMS, assumptions };
      const { port, error_code } = resolveDataPort(env);
      const snapshot = await port.snapshot(now);
      const run = detectOpportunities(snapshot, now, params);
      return { ...run, intelligence_source_error: error_code };
    },
    summarize: (data) => ({ source: data.source, status: data.status, count: data.opportunities.length, usage: data.usage }),
  });
}
