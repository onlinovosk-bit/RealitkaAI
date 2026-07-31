import { propagateAttributes, type PropagateAttributesParams } from "@langfuse/tracing";

import { isLangfuseEnabled } from "@/lib/langfuse/config";

/** Trace context propagated to Langfuse spans (agency, workflow, feature). */
export type AiTraceContext = {
  feature: string;
  workflowType?: string;
  agencyId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  extra?: Record<string, string>;
};

export function buildAiTraceParams(
  trace: AiTraceContext | undefined,
  tag?: string,
): PropagateAttributesParams {
  const feature = trace?.feature ?? tag ?? "ai-call";
  const metadata: Record<string, string> = { feature };

  if (trace?.workflowType) metadata.workflow_type = trace.workflowType;
  if (trace?.agencyId) metadata.agency_id = trace.agencyId;
  if (trace?.extra) {
    for (const [key, value] of Object.entries(trace.extra)) {
      metadata[key] = value;
    }
  }

  const tags = ["revolis-crm", feature];
  if (trace?.workflowType) tags.push(trace.workflowType);

  return {
    traceName: feature,
    tags,
    userId: trace?.userId ?? undefined,
    sessionId: trace?.sessionId ?? undefined,
    metadata,
  };
}

/** Run fn with Langfuse trace attributes when tracing is enabled. */
export async function withAiTraceContext<T>(
  trace: AiTraceContext | undefined,
  tag: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  if (!isLangfuseEnabled()) return fn();

  const params = buildAiTraceParams(trace, tag);
  return propagateAttributes(params, fn);
}
