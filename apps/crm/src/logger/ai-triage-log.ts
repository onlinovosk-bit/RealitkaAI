/**
 * Structured stdout logs for AI triage (Vercel / serverless friendly).
 * Single JSON object per line; grep on `[ai_triage]`.
 */

export type AiTriageRunSource = "cron_lead_ai_triage" | "ai_jobs_queue" | string;

const PREFIX = "[ai_triage]";

export type AiTriageLogFields = Record<string, unknown>;

export function logAiTriage(fields: AiTriageLogFields): void {
  const payload = {
    ...fields,
    _logged_at: new Date().toISOString(),
  };
  console.log(`${PREFIX} ${JSON.stringify(payload)}`);
}
