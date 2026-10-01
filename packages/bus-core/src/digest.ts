/**
 * Digest = the compression layer of the bus.
 *
 * A result envelope may carry 3 000 words of evidence. The receiving agent (and
 * the founder) should get the decision-relevant skeleton instead: identity,
 * status, counters, and the decisions that actually need a human.
 */

import type { BusEnvelope } from "./types.ts";

export interface DigestOptions {
  /** Cap on listed decisions; the rest are summarized as `+N more`. */
  maxDecisions?: number;
  /** Hard character budget. The digest is truncated, never silently trimmed. */
  maxChars?: number;
  includeSummary?: boolean;
}

const DEFAULTS: Required<DigestOptions> = {
  maxDecisions: 10,
  maxChars: 2000,
  includeSummary: true,
};

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 20)).trimEnd()}\n... [truncated]`;
}

function evidenceLine(envelope: BusEnvelope): string | null {
  const commands = envelope.evidence?.commands?.length ?? 0;
  const files = envelope.evidence?.files?.length ?? 0;
  const urls = envelope.evidence?.urls?.length ?? 0;
  if (commands + files + urls === 0) return null;
  return `EVIDENCE: ${commands} commands, ${files} files, ${urls} urls`;
}

/** Single-envelope digest — the block a strategic agent can act on directly. */
export function renderDigest(envelope: BusEnvelope, options: DigestOptions = {}): string {
  const opts = { ...DEFAULTS, ...options };
  const lines: string[] = [];

  lines.push(envelope.task_id ?? envelope.thread ?? envelope.id);
  lines.push(`MESSAGE: ${envelope.id}`);
  lines.push(`FROM: ${envelope.from} -> ${envelope.to}`);
  lines.push(`TYPE: ${envelope.type.toUpperCase()}  STATUS: ${envelope.status.toUpperCase()}`);
  if (envelope.mode) lines.push(`MODE: ${envelope.mode}${envelope.stop_after_report ? "  STOP_AFTER_REPORT: true" : ""}`);
  if (opts.includeSummary && envelope.summary) lines.push(`SUMMARY: ${envelope.summary}`);

  const counters = Object.entries(envelope.counters ?? {});
  if (counters.length > 0) {
    lines.push("");
    for (const [key, value] of counters) {
      lines.push(`${key.toUpperCase()}: ${value}`);
    }
  }

  const decisions = envelope.decisions_required ?? [];
  lines.push("");
  lines.push(`FOUNDER_DECISIONS_REQUIRED: ${decisions.length}`);
  decisions.slice(0, opts.maxDecisions).forEach((decision) => {
    lines.push(`  ${decision.id} [${decision.gate}] ${decision.question}`);
    if (decision.recommendation) lines.push(`      recommend: ${decision.recommendation}`);
  });
  if (decisions.length > opts.maxDecisions) {
    lines.push(`  +${decisions.length - opts.maxDecisions} more (read full envelope)`);
  }

  const evidence = evidenceLine(envelope);
  if (evidence) lines.push(evidence);
  if (envelope.next_action) {
    lines.push(`NEXT: [${envelope.next_action.gate}] ${envelope.next_action.description}`);
  }

  return truncate(lines.join("\n").replace(/\n{3,}/g, "\n\n").trim(), opts.maxChars);
}

/** Queue digest — one line per envelope plus the aggregate decision count. */
export function renderQueueDigest(envelopes: BusEnvelope[], options: DigestOptions = {}): string {
  const opts = { ...DEFAULTS, ...options };
  if (envelopes.length === 0) return "BUS: empty (0 messages)";

  const pendingDecisions = envelopes.reduce((total, envelope) => total + (envelope.decisions_required?.length ?? 0), 0);
  const lines = [`BUS: ${envelopes.length} messages, FOUNDER_DECISIONS_REQUIRED: ${pendingDecisions}`, ""];

  for (const envelope of envelopes) {
    const gate = envelope.next_action ? ` [${envelope.next_action.gate}]` : "";
    const decisions = envelope.decisions_required?.length ?? 0;
    const decisionTag = decisions > 0 ? ` decisions:${decisions}` : "";
    lines.push(
      `${envelope.id}  ${envelope.from}->${envelope.to}  ${envelope.type}/${envelope.status}${decisionTag}${gate}`,
    );
    if (envelope.summary) lines.push(`    ${envelope.summary}`);
  }

  return truncate(lines.join("\n"), opts.maxChars);
}
