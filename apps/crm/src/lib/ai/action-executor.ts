export type ActionType = "send_email" | "create_task" | "notify_agent";
export type ActionPayload = { type: ActionType; leadId: string; agentId?: string; message?: string };
export async function executeAction(p: ActionPayload): Promise<{ ok: boolean }> {
  console.log("[action-executor]", p.type, p.leadId);
  return { ok: true };
}
