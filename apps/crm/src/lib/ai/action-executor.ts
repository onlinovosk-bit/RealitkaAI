import type { Lead } from "@/lib/mock-data";
import { createActivity } from "@/lib/activities-store";
import { createTask } from "@/lib/tasks-store";
import { sendAiOutreachEmail } from "@/lib/outreach-store";
import type { AutopilotAction } from "./autopilot-rules";

export type ActionExecutionResult = {
  action: AutopilotAction["type"];
  ok: boolean;
  detail: string;
};

function autopilotEnabled() {
  return process.env.AUTOPILOT_ENABLED !== "0" && process.env.AUTOPILOT_ENABLED !== "false";
}

function dryRun() {
  return process.env.AUTOPILOT_DRY_RUN === "1" || process.env.AUTOPILOT_DRY_RUN === "true";
}

function sendEmailAllowed() {
  return process.env.AUTOPILOT_SEND_EMAIL === "1" || process.env.AUTOPILOT_SEND_EMAIL === "true";
}

/**
 * Vykoná jednu autopilot akciu: úlohy, aktivity, voliteľne odoslanie emailu.
 */
export async function executeAutopilotAction(
  action: AutopilotAction,
  lead: Lead
): Promise<ActionExecutionResult> {
  if (!autopilotEnabled()) {
    return {
      action: action.type,
      ok: false,
      detail: "AUTOPILOT_ENABLED vypnutý — akcia sa nevykonala.",
    };
  }

  if (dryRun()) {
    return {
      action: action.type,
      ok: true,
      detail: `[dry-run] ${action.type}: ${action.reason}`,
    };
  }

  try {
    switch (action.type) {
      case "call": {
        await createTask({
          leadId: lead.id,
          title: `Autopilot: zavolať ${lead.name}`,
          description: `Priorita ${action.priority}. ${action.reason}`,
          status: "open",
          priority: "high",
          dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
        await createActivity({
          leadId: lead.id,
          type: "Telefonát",
          title: "AI Autopilot — naplánovaný hovor",
          text: `Systém vytvoril úlohu na zavolanie (${action.reason}).`,
          entityType: "lead",
          entityId: lead.id,
          actorName: "AI Autopilot",
          source: "autopilot",
          severity: "info",
          meta: { action: action.type, priority: action.priority },
        });
        return { action: action.type, ok: true, detail: "Úloha + aktivita vytvorená." };
      }

      case "urgent_followup": {
        if (sendEmailAllowed() && lead.email) {
          try {
            await sendAiOutreachEmail(lead.id);
            await createActivity({
              leadId: lead.id,
              type: "Email",
              title: "AI Autopilot — odoslaný follow-up",
              text: `Urgent follow-up email (${action.reason}).`,
              entityType: "lead",
              entityId: lead.id,
              actorName: "AI Autopilot",
              source: "autopilot",
              severity: "success",
              meta: { action: action.type, channel: "email" },
            });
            return { action: action.type, ok: true, detail: "Follow-up email odoslaný." };
          } catch (e) {
            await createActivity({
              leadId: lead.id,
              type: "Email",
              title: "AI Autopilot — follow-up zlyhal",
              text: e instanceof Error ? e.message : "Nepodarilo sa odoslať email.",
              entityType: "lead",
              entityId: lead.id,
              actorName: "AI Autopilot",
              source: "autopilot",
              severity: "warning",
              meta: { action: action.type },
            });
            return { action: action.type, ok: false, detail: "Email sa nepodarilo odoslať; aktivita zalogovaná." };
          }
        }
        await createActivity({
          leadId: lead.id,
          type: "Email",
          title: "AI Autopilot — urgentný follow-up",
          text: `Odporúčanie: urgentný follow-up (${action.reason}). Nastav AUTOPILOT_SEND_EMAIL=1 pre auto-odoslanie.`,
          entityType: "lead",
          entityId: lead.id,
          actorName: "AI Autopilot",
          source: "autopilot",
          severity: "info",
          meta: { action: action.type, priority: action.priority },
        });
        return {
          action: action.type,
          ok: true,
          detail: sendEmailAllowed()
            ? "Aktivita bez emailu (lead bez emailu?)."
            : "Aktivita zalogovaná (AUTOPILOT_SEND_EMAIL nie je zapnuté).",
        };
      }

      case "nurture_campaign":
        await createActivity({
          leadId: lead.id,
          type: "Email",
          title: "AI Autopilot — nurture sekvencia",
          text: `Odporúčanie: nurture / remarketing (${action.reason}).`,
          entityType: "lead",
          entityId: lead.id,
          actorName: "AI Autopilot",
          source: "autopilot",
          severity: "info",
          meta: { action: action.type },
        });
        return { action: action.type, ok: true, detail: "Nurture krok zalogovaný." };

      default:
        return { action: action.type, ok: false, detail: "Neznámy typ akcie." };
    }
  } catch (e) {
    return {
      action: action.type,
      ok: false,
      detail: e instanceof Error ? e.message : "Vykonanie zlyhalo.",
    };
  }
}
