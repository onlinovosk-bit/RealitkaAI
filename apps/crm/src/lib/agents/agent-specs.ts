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

/**
 * `customer_facing_send` agents draft text that a human approves and the Control Contract sends.
 * `internal_intelligence` agents only read, analyse or recommend: nothing they do is irreversible or
 * visible to a customer, and they have no send path at all. One registry, two kinds — never a second registry.
 */
export type AgentKind = "customer_facing_send" | "internal_intelligence";
export type AgentDomain = "revolis" | "onlinovo";

export type AgentSpec = {
  agentId: string;
  /** Omitted = customer_facing_send (every spec written before ONLINOVO). */
  kind?: AgentKind;
  /** Omitted = revolis. ONLINOVO is the founder's e-shop, kept apart from the Revolis product work. */
  domain?: AgentDomain;
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

export const agentKind = (spec: AgentSpec): AgentKind => spec.kind ?? "customer_facing_send";

const ONL_NEVER = [
  "send without a human approval",
  "send, schedule or update a campaign, or write a journey (LeadHub contract UNVERIFIED: onlinovo.campaign.* and onlinovo.journey.write are BLOCKED)",
  "change a price or a customer permission (owner decision)",
  "persist a record (no verified write path: onlinovo.record.persist is BLOCKED)",
  "receive or pass raw e-mail, phone or any personal data (customers are pseudonymised)",
  "compute a count, date, RFM value, revenue, margin, eligibility, threshold, experiment figure or KPI with an LLM (deterministic first)",
  "act while ONLINOVO_AGENTS_KILL_SWITCH is on",
  "present an estimate as a fact, or a small sample as proof",
];

const ONL_MODEL = "none (deterministic; LLM not wired)";
const ONL_PROMPT = "none (deterministic; LLM not wired)";
const ONL_PKG = "../../packages/mcp-onlinovo/src";

export const AGENT_SPECS: readonly AgentSpec[] = [
  {
    agentId: "REVOLIS-INBOUND-AUTOREPLY",
    version: "1.1.0",
    mission: "Draft a first reply to a new inbound lead so the broker can answer within minutes.",
    trigger:
      "New lead on POST /api/acquire/email (portal e-mail gateway), POST /api/leads/inbound (web form, after response) " +
      "or POST /api/webhooks/inbound-lead (Bearer INBOUND_WEBHOOK_SECRET). Kill switch: INBOUND_REPLY_DRAFT_DISABLED=1.",
    inputs: ["lead contact + message (untrusted: the lead's own text)", "broker name when the mailbox is personal"],
    outputs: ["activities draft (meta: subject, body, recipient, correlation_id)", "ai_action_audit ai_suggested"],
    allowedActions: ["inbound.reply.email.send"],
    forbiddenActions: NEVER,
    promptVersion: AUTO_REPLY_PROMPT_VERSION,
    model: "claude-haiku (lib/ai/claude.ts)",
    approvalPolicy: "Draft only; broker clicks 'Schváliť a odoslať' → approve-draft → Control Contract.",
    memoryPolicy: "Stateless. Reads only the current payload; stores nothing but the draft.",
    failurePolicy:
      "Webhook: LLM timeout → deterministic fallback draft. Gateway/form: LLM timeout (8 s) → no draft (the templated " +
      "acknowledgement already covers it). Any draft failure keeps the lead.",
    evaluationSuite: [
      "src/lib/inbound/__tests__/process-lead.test.ts",
      "src/lib/inbound/__tests__/reply-draft.test.ts",
      "src/app/api/webhooks/inbound-lead/__tests__/route.test.ts",
      "src/app/api/acquire/email/__tests__/route.test.ts",
      "src/app/api/leads/inbound/__tests__/route.test.ts",
      "src/lib/inbound/__tests__/approve-draft.test.ts",
    ],
    owner: "founder",
    code: [
      "src/lib/inbound/reply-draft.ts",
      "src/lib/inbound/process-lead.ts",
      "src/lib/inbound/auto-reply.ts",
      "src/app/api/acquire/email/route.ts",
      "src/app/api/leads/inbound/route.ts",
    ],
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
  {
    agentId: "ONL-REVENUE-OPPORTUNITY",
    kind: "internal_intelligence",
    domain: "onlinovo",
    version: "0.1.0",
    mission: "Find evidence-backed commercial opportunities in the e-shop snapshot and hand the founder a ranked, honestly labelled list.",
    trigger: "MCP tool onlinovo_revenue_opportunities (read-only). No schedule, no cron.",
    inputs: ["pseudonymised revenue snapshot (fixture or unconnected; no live source is wired)", "optional explicit assumptions with ranges"],
    outputs: ["Opportunity objects: evidence (FACT/ESTIMATE/ASSUMPTION/INFERENCE), estimated value or null, confidence, prepared action, policy status"],
    allowedActions: ["onlinovo.data.observe", "onlinovo.opportunity.analyze", "onlinovo.opportunity.recommend"],
    forbiddenActions: ONL_NEVER,
    promptVersion: ONL_PROMPT,
    model: ONL_MODEL,
    approvalPolicy: "Recommends only. Every customer-facing follow-up is tier 3: it needs a human and its execution is BLOCKED until the LeadHub contract is verified.",
    memoryPolicy: "Stateless. Reads one snapshot per call; stores nothing.",
    failurePolicy: "Stale snapshot (> 48 h) → STALE_SNAPSHOT; unconnected source → empty run labelled UNCONNECTED; budget exceeded or invalid input → typed error, no partial answer.",
    evaluationSuite: [
      `${ONL_PKG}/agents/opportunity.test.ts`,
      `${ONL_PKG}/agents/guard.test.ts`,
      `${ONL_PKG}/agent-tools.test.ts`,
    ],
    owner: "founder",
    code: [`${ONL_PKG}/agents/opportunity.ts`, `${ONL_PKG}/tools/revenue-opportunities.ts`],
  },
  {
    agentId: "ONL-CUSTOMER-NEXT-ACTION",
    kind: "internal_intelligence",
    domain: "onlinovo",
    version: "0.1.0",
    mission: "Pick at most one eligible next action for one pseudonymised customer from a closed set, or say why there is none.",
    trigger: "MCP tool onlinovo_customer_next_action (read-only), one customer_ref per call.",
    inputs: ["a pseudonymous customer_ref (an e-mail or phone number is refused)", "pseudonymised revenue snapshot"],
    outputs: ["one of NO_ACTION, REPLENISHMENT, CROSS_SELL, BUNDLE, REACTIVATION, DISCOVERY with evidence, expiry and the rules that blocked the others"],
    allowedActions: ["onlinovo.data.observe", "onlinovo.nextaction.recommend"],
    forbiddenActions: ONL_NEVER,
    promptVersion: ONL_PROMPT,
    model: ONL_MODEL,
    approvalPolicy: "Recommends only. Consent, the 3-day frequency cap and open-payment hold are rules that override any candidate; a chosen action still needs a human and is BLOCKED from execution.",
    memoryPolicy: "Stateless. The audit trail records the outcome, never the customer reference.",
    failurePolicy: "Missing consent, frequency cap, open payment, stale or invalid data, unconnected source → NO_ACTION with the reason. Confidence is never 'high'.",
    evaluationSuite: [
      `${ONL_PKG}/agents/next-action.test.ts`,
      `${ONL_PKG}/agents/pseudonym.test.ts`,
      `${ONL_PKG}/agent-tools.test.ts`,
    ],
    owner: "founder",
    code: [`${ONL_PKG}/agents/next-action.ts`, `${ONL_PKG}/tools/customer-next-action.ts`],
  },
  {
    agentId: "ONL-EXPERIMENT",
    kind: "internal_intelligence",
    domain: "onlinovo",
    version: "0.1.0",
    mission: "Turn a hypothesis into a bounded, pre-registered experiment and judge its result by arithmetic, never by opinion.",
    trigger: "MCP tool onlinovo_experiment_plan (read-only). Starting an experiment is a human act outside this system.",
    inputs: ["hypothesis, control, treatment, audience size, a pre-registered KPI, threshold, stop conditions, allocation, duration, planned sample"],
    outputs: ["experiment specification in state PROPOSED (persisted: false)", "KPI estimate with 95 % interval and sample class when a result is evaluated"],
    allowedActions: ["onlinovo.experiment.propose", "onlinovo.experiment.evaluate"],
    forbiddenActions: ONL_NEVER,
    promptVersion: ONL_PROMPT,
    model: ONL_MODEL,
    approvalPolicy: "A plan is PROPOSED only. Approval is a human object (id, approver, timestamp) that locks the KPI, threshold and stop conditions; an INDICATIVE sample can never reach KEEP.",
    memoryPolicy: "In-memory ledger without delete; a recorded result is immutable. Nothing is persisted (onlinovo.record.persist is BLOCKED).",
    failurePolicy: "Missing threshold, stop condition, sample plan or unregistered KPI → refused before the experiment exists; changed plan after approval → KPI_LOCKED; missing data → BLOCKED, never a guessed number.",
    evaluationSuite: [
      `${ONL_PKG}/agents/experiment.test.ts`,
      `${ONL_PKG}/agents/kpi.test.ts`,
      `${ONL_PKG}/agents/allocation.test.ts`,
      `${ONL_PKG}/agent-tools.test.ts`,
    ],
    owner: "founder",
    code: [`${ONL_PKG}/agents/experiment.ts`, `${ONL_PKG}/agents/kpi.ts`, `${ONL_PKG}/tools/experiment-plan.ts`],
  },
];
