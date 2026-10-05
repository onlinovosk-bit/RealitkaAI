import type { ToolResponse } from "@revolis/mcp-shared";
import { beginAgentAudit } from "../agents/agent-audit.js";
import { authorizeAgentAction, type GuardDecision } from "../agents/guard.js";
import { assertNoPii } from "../agents/pseudonym.js";
import { AgentError, type AgentId } from "../agents/types.js";

/**
 * Shared plumbing for the three read-only agent tools. A tool is only a thin, audited shell:
 * guard first, then the pure agent function, then a PII scan of the answer.
 * Nothing here sends, schedules, persists or contacts anyone.
 */
export interface AgentToolDeps {
  env?: NodeJS.ProcessEnv;
  /** Injected by tests. Deliberately not part of any tool input schema: a caller must not choose "now". */
  now?: () => Date;
}

/** The input of a read-only tool is a handful of fields. Anything bigger is refused before it is parsed or scanned. */
export const MAX_TOOL_INPUT_CHARS = 100_000;

export type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: true };

const REQUESTED_ACTION_DESCRIPTION =
  "Optional. Name an action you want the agent to perform. Anything other than the agent's own read or recommend action is refused.";

export const requestedActionProperty = { type: "string", description: REQUESTED_ACTION_DESCRIPTION, maxLength: 100 } as const;

function asResult(response: ToolResponse<unknown>, isError: boolean): ToolResult {
  const result: ToolResult = { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  if (isError) result.isError = true;
  return result;
}

function requestedAction(args: unknown): string | null {
  if (args === null || typeof args !== "object") return null;
  const raw = (args as { requested_action?: unknown }).requested_action;
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" || raw.length > 100) return "invalid";
  const name = raw.trim();
  return name.startsWith("onlinovo.") ? name : `onlinovo.${name}`;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function runAgentTool<T extends object>(opts: {
  tool: string;
  agentId: AgentId;
  /** Registry actions this tool exercises. Each one is authorized before anything runs. */
  actions: readonly string[];
  args: unknown;
  deps?: AgentToolDeps;
  run: (ctx: { env: NodeJS.ProcessEnv; now: Date; args: unknown }) => Promise<T>;
  summarize?: (data: T) => Record<string, unknown>;
}): Promise<ToolResult> {
  const env = opts.deps?.env ?? process.env;
  const now = (opts.deps?.now ?? (() => new Date()))();

  // The input is serialised exactly once. What is measured against the cap is what is parsed and processed:
  // a getter or a toJSON that answers differently the second time can no longer smuggle a larger value past it.
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(opts.args ?? null);
  } catch {
    serialized = undefined;
  }
  const refuse = (code: "INPUT_TOO_LARGE" | "INVALID_INPUT", message: string, rule: string): ToolResult => {
    const audit = beginAgentAudit(opts.tool, opts.agentId, opts.actions.join(","), {
      allowed: false, verdict: "FORBIDDEN", code: null, rule, tier: null, message,
    });
    audit.finish({ denied: true, reason: rule });
    return asResult({ success: false, request_id: audit.request_id, error: { code, message } }, true);
  };
  if (serialized === undefined) return refuse("INVALID_INPUT", "tool input cannot be serialised to JSON", "input_not_serialisable");
  if (serialized.length > MAX_TOOL_INPUT_CHARS) {
    return refuse("INPUT_TOO_LARGE", `tool input is larger than ${MAX_TOOL_INPUT_CHARS} characters`, "input_too_large");
  }
  const args: unknown = JSON.parse(serialized);

  const asked = requestedAction(args);
  const checks: string[] = asked === null ? [...opts.actions] : [asked, ...opts.actions];
  let last: GuardDecision | null = null;
  for (const action of checks) {
    const decision = authorizeAgentAction({ agentId: opts.agentId, action: action === "invalid" ? "onlinovo.invalid" : action }, env);
    last = decision;
    if (!decision.allowed) {
      const audit = beginAgentAudit(opts.tool, opts.agentId, action, decision);
      audit.finish({ denied: true });
      return asResult(
        {
          success: false,
          request_id: audit.request_id,
          error: { code: decision.code ?? "DENIED", message: decision.message },
        },
        true,
      );
    }
  }
  const audit = beginAgentAudit(opts.tool, opts.agentId, opts.actions.join(","), last as GuardDecision);
  try {
    const data = await opts.run({ env, now, args });
    assertNoPii(data);
    audit.finish(opts.summarize?.(data));
    return asResult({ success: true, request_id: audit.request_id, data }, false);
  } catch (err) {
    const code = err instanceof AgentError ? err.code : "INTERNAL_ERROR";
    audit.log.error(`${opts.tool} failed`, { code });
    return asResult(
      { success: false, request_id: audit.request_id, error: { code, message: err instanceof AgentError ? err.message : "internal error" } },
      true,
    );
  }
}
