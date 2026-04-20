import type { AutopilotRule } from "@/lib/ai/autopilot-rules";
export type AutopilotTriggerContext = {
  leadId: string;
  score: number;
  daysSinceContact: number;
  emailClicked: boolean;
};
export type AutopilotActionResult = {
  ruleId: string;
  action: AutopilotRule["action"];
  executed: boolean;
  reason: string;
};
export async function runAutopilotRules(
  ctx: AutopilotTriggerContext,
  rules: AutopilotRule[]
): Promise<AutopilotActionResult[]> {
  return rules.filter((r) => r.enabled).map((rule) => {
    let ok = false;
    if (rule.trigger === "score_above" && ctx.score >= rule.threshold) ok = true;
    if (rule.trigger === "score_below" && ctx.score < rule.threshold) ok = true;
    if (rule.trigger === "no_contact_days" && ctx.daysSinceContact >= rule.threshold) ok = true;
    if (rule.trigger === "email_click" && ctx.emailClicked) ok = true;
    return { ruleId: rule.id, action: rule.action, executed: ok, reason: ok ? "Splnené" : "Nesplnené" };
  });
}
