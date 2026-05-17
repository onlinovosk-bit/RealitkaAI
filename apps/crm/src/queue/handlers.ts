import { executeAiPriorityTriageJob } from "@/ai/jobs/ai-priority-triage";
import type { AiJobHandler } from "./types";

export function getQueueHandlers(): Record<string, AiJobHandler> {
  return {
    ai_priority_triage: executeAiPriorityTriageJob,
  };
}
