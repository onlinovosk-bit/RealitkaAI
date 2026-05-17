/**
 * AI job types + typed payloads stored in ai_jobs.payload (jsonb).
 */
export const AI_JOB_TYPES = {
  AI_PRIORITY_TRIAGE: "ai_priority_triage",
} as const;

export type AiJobType = (typeof AI_JOB_TYPES)[keyof typeof AI_JOB_TYPES];

export type AiPriorityTriageJobPayload = {
  lead_ids: string[];
};

export type AiJobHandler = (
  payload: Record<string, unknown>,
) => Promise<void>;
