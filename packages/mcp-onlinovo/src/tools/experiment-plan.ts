import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { proposeExperiment, type ProposalInput } from "../agents/experiment.js";
import { AgentError } from "../agents/types.js";
import { isRecord, requestedActionProperty, runAgentTool, type AgentToolDeps } from "./agent-support.js";

const stop = {
  type: "object",
  properties: {
    metric: { type: "string" },
    direction: { type: "string", enum: ["below", "above"] },
    value: { type: "number" },
    description: { type: "string" },
  },
  required: ["metric", "direction", "value", "description"],
  additionalProperties: false,
} as const;

export const experimentPlanTool: Tool = {
  name: "onlinovo_experiment_plan",
  description:
    "ONL-EXPERIMENT. Read-only. Turns a hypothesis into a bounded experiment specification in state PROPOSED with a pre-registered KPI, success threshold, stop conditions, allocation and sample plan. It does not start, approve, persist or send anything; approval is a human act.",
  inputSchema: {
    type: "object",
    properties: {
      hypothesis: { type: "string" },
      control: { type: "string" },
      treatment: { type: "string" },
      audience: {
        type: "object",
        properties: {
          description: { type: "string" },
          size: { type: "integer", minimum: 1 },
          opportunity_id: { type: "string" },
        },
        required: ["description", "size"],
        additionalProperties: false,
      },
      primary_metric: { type: "string", description: "Must be a pre-registered KPI id." },
      secondary_metrics: { type: "array", items: { type: "string" } },
      success_threshold: {
        type: "object",
        properties: { metric: { type: "string" }, min_difference: { type: "number" } },
        required: ["metric", "min_difference"],
        additionalProperties: false,
      },
      stop_conditions: { type: "array", items: stop, minItems: 1 },
      allocation: {
        type: "object",
        properties: { control: { type: "number" }, treatment: { type: "number" } },
        required: ["control", "treatment"],
        additionalProperties: false,
      },
      duration_days: { type: "integer", minimum: 1, maximum: 365 },
      min_sample_per_arm: { type: "integer", minimum: 1 },
      requested_action: requestedActionProperty,
    },
    required: ["hypothesis", "control", "treatment", "audience", "primary_metric", "stop_conditions", "allocation", "duration_days", "min_sample_per_arm"],
    additionalProperties: false,
  },
};

function toProposal(args: unknown): ProposalInput {
  if (!isRecord(args)) throw new AgentError("INVALID_INPUT", "arguments must be an object");
  const { audience, allocation, success_threshold, stop_conditions, secondary_metrics } = args;
  if (!isRecord(audience) || !isRecord(allocation)) throw new AgentError("INVALID_INPUT", "audience and allocation must be objects");
  if (stop_conditions !== undefined && (!Array.isArray(stop_conditions) || !stop_conditions.every(isRecord))) {
    throw new AgentError("INVALID_INPUT", "stop_conditions must be an array of objects");
  }
  if (secondary_metrics !== undefined && (!Array.isArray(secondary_metrics) || !secondary_metrics.every((m) => typeof m === "string"))) {
    throw new AgentError("INVALID_INPUT", "secondary_metrics must be an array of strings");
  }
  if (success_threshold !== undefined && !isRecord(success_threshold)) {
    throw new AgentError("INVALID_INPUT", "success_threshold must be an object");
  }
  return args as unknown as ProposalInput;
}

export async function handleExperimentPlan(args: unknown, deps?: AgentToolDeps) {
  return runAgentTool({
    tool: "onlinovo_experiment_plan",
    agentId: "ONL-EXPERIMENT",
    actions: ["onlinovo.experiment.propose"],
    args,
    deps,
    run: async () => {
      const spec = proposeExperiment(toProposal(args));
      return {
        experiment: spec,
        persisted: false,
        next_step: "A human approves the plan before anything starts. No campaign is sent by this tool.",
      };
    },
    summarize: (data) => ({ state: data.experiment.state, planned_power: data.experiment.planned_power }),
  });
}
