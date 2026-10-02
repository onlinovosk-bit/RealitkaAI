import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { resolveDataPort } from "../agents/data-port.js";
import { decideNextAction } from "../agents/next-action.js";
import { AgentError } from "../agents/types.js";
import { isRecord, requestedActionProperty, runAgentTool, type AgentToolDeps } from "./agent-support.js";

export const customerNextActionTool: Tool = {
  name: "onlinovo_customer_next_action",
  description:
    "ONL-CUSTOMER-NEXT-ACTION. Read-only. Returns ONE recommended action for ONE pseudonymised customer (NO_ACTION, REPLENISHMENT, CROSS_SELL, BUNDLE, REACTIVATION, DISCOVERY). Consent, frequency cap and eligibility are rules. The customer_ref must be a pseudonym; an e-mail or phone number is refused. Nothing is sent.",
  inputSchema: {
    type: "object",
    properties: {
      customer_ref: { type: "string", description: "Pseudonymous reference (cus_<16 hex>). Never an e-mail or phone number.", maxLength: 64 },
      requested_action: requestedActionProperty,
    },
    required: ["customer_ref"],
    additionalProperties: false,
  },
};

export async function handleCustomerNextAction(args: unknown, deps?: AgentToolDeps) {
  return runAgentTool({
    tool: "onlinovo_customer_next_action",
    agentId: "ONL-CUSTOMER-NEXT-ACTION",
    actions: ["onlinovo.data.observe", "onlinovo.nextaction.recommend"],
    args,
    deps,
    run: async ({ env, now }) => {
      const ref = isRecord(args) ? args.customer_ref : undefined;
      if (typeof ref !== "string") throw new AgentError("INVALID_INPUT", "customer_ref must be a string");
      const { port, error_code } = resolveDataPort(env);
      const snapshot = await port.snapshot(now);
      const decision = decideNextAction({ customer_ref: ref, snapshot, now });
      return { source: snapshot.source, as_of: snapshot.as_of, decision, intelligence_source_error: error_code };
    },
    // The audit trail records the outcome, never the customer reference.
    summarize: (data) => ({ source: data.source, recommended: data.decision.action, policy_status: data.decision.policy_status }),
  });
}
