export type AutopilotRule = {
  id: string;
  name: string;
  trigger: "score_above" | "score_below" | "no_contact_days" | "email_click";
  threshold: number;
  action: "send_email" | "create_task" | "notify_agent";
  enabled: boolean;
};
export const DEFAULT_AUTOPILOT_RULES: AutopilotRule[] = [
  { id: "rule_hot", name: "Horúci lead", trigger: "score_above", threshold: 80, action: "notify_agent", enabled: true },
  { id: "rule_dormant", name: "Žiadny kontakt 14 dní", trigger: "no_contact_days", threshold: 14, action: "create_task", enabled: true },
];
