/**
 * ACTION METADATA REGISTRY — resolves U-L.
 *
 * Evidence (docs/reports/2026-09-18-U-JKL-evidence-report.md): a grep for
 * `reversible|irreversible|nezvratn|undoable|can_undo` across `apps/crm/src`
 * returned ZERO hits. `resolveAuthority` therefore had no source for the
 * `reversible` flag, which made the OD-9 authority floor inapplicable.
 *
 * This registry IS that source. Two rules make it load-bearing rather than
 * decorative:
 *   1. An action with no entry here cannot be authorized (fail-closed, FORBIDDEN).
 *   2. The registry — not the caller — is the truth for the action-intrinsic
 *      fields (capability, reversible, externallyVisible, risk). See authority.ts.
 */
import type { Capability } from "./authority.ts";

export type ActionRisk = "low" | "medium" | "high" | "irreversible";

/**
 * U-J is recorded here as an enforceable field rather than a footnote.
 * `probable` means "documented by search results, primary source not read"
 * (AP-005). It is deliberately NOT the same value as `supported`.
 */
export type ProviderIdempotency =
  | { status: "not_applicable" }
  | {
      status: "supported" | "probable";
      mechanism: string;
      /** How long the provider deduplicates. Shorter than our key's lifetime = residual risk. */
      retentionHours: number | null;
      evidenceRef: string;
    }
  | { status: "unknown"; evidenceRef: string };

export type ActionMetadata = {
  action: string;
  capability: Capability;
  /** Can the effect be undone by us, without the counterparty's cooperation? */
  reversible: boolean;
  /** Does a person outside the tenant's staff see the effect? */
  externallyVisible: boolean;
  risk: ActionRisk;
  externalProvider: string | null;
  providerIdempotency: ProviderIdempotency;
  /** Explicit owner decision (DENY_LIST), not a property of the action. OD-9. */
  denied: boolean;
  deniedReason: string | null;
  description: string;
};

const UJKL = "docs/reports/2026-09-18-U-JKL-evidence-report.md";

const ENTRIES: readonly ActionMetadata[] = [
  {
    action: "followup.draft",
    capability: "RECOMMEND",
    reversible: true,
    externallyVisible: false,
    risk: "low",
    externalProvider: null,
    providerIdempotency: { status: "not_applicable" },
    denied: false,
    deniedReason: null,
    description: "Produce a follow-up draft for broker review. No outbound send.",
  },
  {
    action: "followup.email.send",
    capability: "EXECUTE",
    reversible: false,
    externallyVisible: true,
    risk: "irreversible",
    externalProvider: "resend",
    providerIdempotency: {
      status: "probable",
      mechanism: "Idempotency-Key header on POST /emails",
      retentionHours: 24,
      evidenceRef: UJKL,
    },
    denied: false,
    deniedReason: null,
    description: "Send a follow-up e-mail to the lead.",
  },
  {
    action: "followup.sms.send",
    capability: "EXECUTE",
    reversible: false,
    externallyVisible: true,
    risk: "irreversible",
    externalProvider: "twilio",
    providerIdempotency: { status: "unknown", evidenceRef: UJKL },
    denied: false,
    deniedReason: null,
    description:
      "Send a follow-up SMS. Twilio Messages create idempotency is UNDOCUMENTED — at-least-once.",
  },
  {
    action: "inbound.reply.email.send",
    capability: "EXECUTE",
    reversible: false,
    externallyVisible: true,
    risk: "irreversible",
    externalProvider: "resend",
    providerIdempotency: {
      status: "probable",
      mechanism: "Idempotency-Key header on POST /emails",
      retentionHours: 24,
      evidenceRef: UJKL,
    },
    denied: false,
    deniedReason: null,
    description:
      "Send the broker-approved inbound AI reply draft to the lead (REVOLIS-INBOUND-AUTOREPLY).",
  },
  {
    action: "deadlead.email.send",
    capability: "EXECUTE",
    reversible: false,
    externallyVisible: true,
    risk: "irreversible",
    externalProvider: "resend",
    providerIdempotency: {
      status: "probable",
      mechanism: "Idempotency-Key header on POST /emails",
      retentionHours: 24,
      evidenceRef: UJKL,
    },
    denied: false,
    deniedReason: null,
    description:
      "Send a broker-approved dead-lead reactivation e-mail (REVOLIS-DEAD-LEAD-CAMPAIGN).",
  },
  {
    action: "deadlead.sms.send",
    capability: "EXECUTE",
    reversible: false,
    externallyVisible: true,
    risk: "irreversible",
    externalProvider: "twilio",
    providerIdempotency: { status: "unknown", evidenceRef: UJKL },
    denied: false,
    deniedReason: null,
    description:
      "Send a broker-approved dead-lead reactivation SMS. Twilio idempotency UNDOCUMENTED — at-least-once.",
  },
  {
    action: "outreach.email.send",
    capability: "EXECUTE",
    reversible: false,
    externallyVisible: true,
    risk: "irreversible",
    externalProvider: "resend",
    providerIdempotency: {
      status: "probable",
      mechanism: "Idempotency-Key header on POST /emails",
      retentionHours: 24,
      evidenceRef: UJKL,
    },
    denied: false,
    deniedReason: null,
    description:
      "Send an AI outreach e-mail (REVOLIS-OUTREACH). Requires a human approval; cron has none.",
  },
  {
    action: "lead.score.recompute",
    capability: "ANALYZE",
    reversible: true,
    externallyVisible: false,
    risk: "low",
    externalProvider: null,
    providerIdempotency: { status: "not_applicable" },
    denied: false,
    deniedReason: null,
    description: "Recompute a lead score from existing CRM data.",
  },
  {
    action: "lead.observe",
    capability: "OBSERVE",
    reversible: true,
    externallyVisible: false,
    risk: "low",
    externalProvider: null,
    providerIdempotency: { status: "not_applicable" },
    denied: false,
    deniedReason: null,
    description: "Read lead facts from the CRM.",
  },
  {
    action: "billing.charge",
    capability: "EXECUTE",
    reversible: false,
    externallyVisible: true,
    risk: "irreversible",
    externalProvider: "stripe",
    providerIdempotency: { status: "unknown", evidenceRef: UJKL },
    denied: true,
    deniedReason: "DENY_LIST billing.* — CLAUDE.md / memory/decisions.md",
    description: "Charge a customer. Owner decision: never by an agent.",
  },
  {
    action: "prod.delete",
    capability: "EXECUTE",
    reversible: false,
    externallyVisible: false,
    risk: "irreversible",
    externalProvider: null,
    providerIdempotency: { status: "not_applicable" },
    denied: true,
    deniedReason: "DENY_LIST prod.delete — CLAUDE.md / memory/decisions.md",
    description: "Destructive production data change.",
  },
  {
    action: "portal.scrape",
    capability: "EXECUTE",
    reversible: true,
    externallyVisible: true,
    risk: "high",
    externalProvider: null,
    providerIdempotency: { status: "not_applicable" },
    denied: true,
    deniedReason: "DENY_LIST portal.scrape — GDPR / robots.txt / ToS",
    description: "Scrape a listing portal.",
  },
  {
    action: "auto_deploy",
    capability: "EXECUTE",
    reversible: false,
    externallyVisible: false,
    risk: "irreversible",
    externalProvider: null,
    providerIdempotency: { status: "not_applicable" },
    denied: true,
    deniedReason: "DENY_LIST auto_deploy — CLAUDE.md / memory/decisions.md",
    description: "Deploy to production without a human.",
  },
];

const BY_ACTION: ReadonlyMap<string, ActionMetadata> = new Map(
  ENTRIES.map((entry) => [entry.action, entry]),
);

export const ACTION_REGISTRY = ENTRIES;

export function lookupAction(action: string): ActionMetadata | null {
  return BY_ACTION.get(action) ?? null;
}

export function registeredActions(): string[] {
  return ENTRIES.map((entry) => entry.action);
}

/**
 * At-most-once delivery across the network boundary is unachievable (CP-SPEC §3.8).
 * This says how close a given action can get, so a caller can decide whether a
 * retry is safe or needs a human.
 */
export function deliveryGuarantee(
  metadata: ActionMetadata,
): "internal" | "effectively_once" | "at_least_once" {
  if (metadata.externalProvider === null) return "internal";
  return metadata.providerIdempotency.status === "unknown"
    ? "at_least_once"
    : "effectively_once";
}
