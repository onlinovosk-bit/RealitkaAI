/**
 * AGENT SPECS — Agentic System Blueprint L1, for every Revolis agent whose
 * output can reach a client. The spec is authoritative over prompts and code:
 * `__tests__/agent-specs.test.ts` fails CI if an agent's actions, prompt
 * version or approve-path wiring drift from what is written here.
 *
 * Kept deliberately short (Engineering Constitution — no framework before a
 * proven need). Fields mirror the Blueprint L1 minimum.
 */
import { AUTO_REPLY_PROMPT_VERSION } from "@/lib/inbound/auto-reply";
import { FOLLOWUP_PROMPT_VERSION } from "@/lib/ai/open-followup-generator";
import { DEAD_LEAD_PROMPT_VERSION } from "@/lib/ai/dead-lead-campaign";
import { OUTREACH_PROMPT_VERSION } from "@/lib/ai-outreach";

export type AgentSpec = {
  agentId: string;
  version: string;
  mission: string;
  trigger: string;
  inputs: string[];
  outputs: string[];
  /** Registry actions (packages/control-contract) this agent may cause. */
  allowedActions: string[];
  forbiddenActions: string[];
  promptVersion: string;
  model: string;
  /** How a human stands between the agent and the client. */
  approvalPolicy: string;
  memoryPolicy: string;
  failurePolicy: string;
  /** Test files that assert this spec, desired and prohibited behaviour. */
  evaluationSuite: string[];
  owner: string;
  code: string[];
};

const NEVER = [
  "send without a human approval",
  "send while AGENT_KILL_SWITCH is on",
  "decide lead score or qualification (deterministic rules own that)",
  "write outside the lead's agency",
];

export const AGENT_SPECS: readonly AgentSpec[] = [
  {
    agentId: "REVOLIS-INBOUND-AUTOREPLY",
    version: "1.0.0",
    mission: "Draft a first reply to a new inbound lead so the broker can answer within minutes.",
    trigger: "POST /api/webhooks/inbound-lead (Bearer INBOUND_WEBHOOK_SECRET)",
    inputs: ["lead form payload (untrusted: payload.message)", "broker name"],
    outputs: ["activities draft (meta: subject, body, recipient, correlation_id)", "ai_action_audit ai_suggested"],
    allowedActions: ["inbound.reply.email.send"],
    forbiddenActions: NEVER,
    promptVersion: AUTO_REPLY_PROMPT_VERSION,
    model: "claude-haiku (lib/ai/claude.ts)",
    approvalPolicy: "Draft only; broker clicks 'Schváliť a odoslať' → approve-draft → Control Contract.",
    memoryPolicy: "Stateless. Reads only the current payload; stores nothing but the draft.",
    failurePolicy: "LLM timeout → deterministic fallback text; draft insert failure keeps the lead and reports draftCreated=false.",
    evaluationSuite: [
      "src/lib/inbound/__tests__/process-lead.test.ts",
      "src/app/api/webhooks/inbound-lead/__tests__/route.test.ts",
      "src/lib/inbound/__tests__/approve-draft.test.ts",
    ],
    owner: "founder",
    code: ["src/lib/inbound/process-lead.ts", "src/lib/inbound/auto-reply.ts"],
  },
  {
    agentId: "REVOLIS-FOLLOWUP-SWEEP",
    version: "1.0.0",
    mission: "Nightly: draft a short follow-up for open leads that went quiet, so none goes cold unnoticed.",
    trigger: "Vercel cron /api/cron/follow-up-sweep 22:00 (CRON_SECRET)",
    inputs: ["open leads stale ≥ FOLLOWUP_STALE_DAYS, under FOLLOWUP_MAX_AI_PER_LEAD and cooldown"],
    outputs: ["activities draft per plan", "ai_action_audit ai_suggested", "leads.ai_followup_count bump"],
    allowedActions: ["followup.email.send", "followup.sms.send"],
    forbiddenActions: [...NEVER, "send on WhatsApp (no registered action)"],
    promptVersion: FOLLOWUP_PROMPT_VERSION,
    model: "claude-haiku (lib/ai/claude.ts)",
    approvalPolicy: "Draft only (FOLLOWUP_MODE=send is ignored); broker approves each draft.",
    memoryPolicy: "Reads lead fields + ai_followup_count/last_ai_followup_at; no free-form memory.",
    failurePolicy: "Per-lead insert failure is collected in `failures`; the batch continues.",
    evaluationSuite: [
      "src/app/api/cron/follow-up-sweep/__tests__/route.test.ts",
      "tests/verification/follow-up-sweep.verification.test.ts",
      "src/lib/inbound/__tests__/approve-draft.test.ts",
    ],
    owner: "founder",
    code: ["src/app/api/cron/follow-up-sweep/route.ts", "src/lib/ai/open-followup-generator.ts"],
  },
  {
    agentId: "REVOLIS-DEAD-LEAD-CAMPAIGN",
    version: "1.0.0",
    mission: "Draft reactivation messages for dead leads worth a second try.",
    trigger: "POST /api/ai/dead-lead-campaign (signed-in user; GET = preview)",
    inputs: ["leads in dead/closed statuses the caller can read (RLS)"],
    outputs: ["activities draft per reactivation plan", "ai_action_audit ai_suggested"],
    allowedActions: ["deadlead.email.send", "deadlead.sms.send"],
    forbiddenActions: [...NEVER, "send on WhatsApp (no registered action)", "regenerate text after approval"],
    promptVersion: DEAD_LEAD_PROMPT_VERSION,
    model: "claude-haiku (lib/ai/claude.ts)",
    approvalPolicy: "Draft only; broker approves each draft. dry_run returns plans without writes.",
    memoryPolicy: "Stateless; reads lead fields only.",
    failurePolicy: "No service-role client → 503 (no silent drop); per-lead insert failures collected.",
    evaluationSuite: [
      "src/app/api/ai/dead-lead-campaign/__tests__/route.test.ts",
      "src/lib/inbound/__tests__/approve-draft.test.ts",
    ],
    owner: "founder",
    code: ["src/app/api/ai/dead-lead-campaign/route.ts", "src/lib/ai/dead-lead-campaign.ts"],
  },
  {
    agentId: "REVOLIS-OUTREACH",
    version: "1.0.0",
    mission: "Draft a personalised outreach e-mail when a broker asks for it; send it only after the broker approves that exact text.",
    trigger: "POST /api/outreach/preview (draft), then POST /api/outreach/{send,approve} with the draft id; cron/script callers are refused",
    inputs: ["one lead (status in OUTREACH_ALLOWED_STATUSES)", "A/B variant"],
    outputs: ["draft activity with the exact text", "e-mail via Resend after approval", "ai_action_audit ai_suggested → human_approved → sent | send_failed", "conversation + message rows"],
    allowedActions: ["outreach.email.send"],
    forbiddenActions: NEVER,
    promptVersion: OUTREACH_PROMPT_VERSION,
    model: "gpt-4.1-mini (lib/ai-outreach.ts, OUTREACH_MODEL)",
    approvalPolicy: "Draft only; the broker reads the text and approves it via the shared approve path (approve-draft.ts), which sends it verbatim. No generate-and-send path exists.",
    memoryPolicy: "Reads last-send time for the frequency cooldown; no free-form memory.",
    failurePolicy: "Daily limit and per-lead cooldown are checked at draft and again at send; Resend errors leave the draft in send_failed with an audit row.",
    evaluationSuite: [
      "src/lib/__tests__/outreach-contract.test.ts",
      "src/lib/inbound/__tests__/approve-draft.test.ts",
      "tests/verification/outreach-scoped-lead-lookup.verification.test.ts",
    ],
    owner: "founder",
    code: ["src/lib/outreach-store.ts", "src/lib/ai-outreach.ts", "src/app/api/outreach/preview/route.ts"],
  },
];
