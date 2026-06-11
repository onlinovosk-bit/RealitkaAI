export type ParsedDemoUtm = {
  goals: string[];
  calcLossMonthly: number | null;
};

const GOAL_MODULE_HINTS: Record<string, string> = {
  leads: "Lead triáž a denná priorita",
  followup: "Follow-up sweep pre stagnujúce leady",
  team: "Team prehľad a kapacita maklérov",
  cockpit: "Owner Cockpit (agregát kancelárie)",
  import: "Univerzálny CRM import",
  calendar: "Kalendár a obhliadky",
  rescue: "Seller Rescue (ohrození klienti)",
};

/** Parse utm_content tokens from demo landing (goals_*, calc_loss_*). */
export function parseDemoUtm(utmContent: string | null | undefined): ParsedDemoUtm {
  const goals: string[] = [];
  let calcLossMonthly: number | null = null;
  const raw = (utmContent ?? "").trim();
  if (!raw) return { goals, calcLossMonthly };

  for (const token of raw.split("|")) {
    const t = token.trim();
    if (!t) continue;
    if (t.startsWith("goals_")) {
      const slugs = t
        .slice("goals_".length)
        .split("_")
        .map((s) => s.trim())
        .filter(Boolean);
      goals.push(...slugs);
      continue;
    }
    const calc = t.match(/^calc_loss_(\d+)/);
    if (calc) calcLossMonthly = Number(calc[1]);
  }

  return { goals: [...new Set(goals)], calcLossMonthly };
}

export function demoAccentLines(goalSlugs: string[]): string[] {
  const lines: string[] = [];
  for (const slug of goalSlugs.slice(0, 3)) {
    const hint = GOAL_MODULE_HINTS[slug];
    lines.push(hint ? `${slug}: ${hint}` : slug);
  }
  while (lines.length < 3) {
    lines.push("Všeobecný prehľad: denná priorita leadov + follow-up rutina");
    break;
  }
  return lines.slice(0, 3);
}

export function extractEmailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return domain || null;
}
