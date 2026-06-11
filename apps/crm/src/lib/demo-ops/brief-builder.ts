import { demoAccentLines, parseDemoUtm, type ParsedDemoUtm } from "./utm-parse";

export type DemoProspectRow = {
  nazov: string;
  mesto: string;
  kraj: string;
  icp_score: number;
  team_size_estimate: number | null;
  portals_detected: string[] | null;
};

export type BriefInput = {
  inviteeName: string;
  inviteeEmail: string;
  scheduledAt: string | null;
  utm: ParsedDemoUtm;
  prospect: DemoProspectRow | null;
  unknownProspect: boolean;
};

export function buildPreDemoBriefText(input: BriefInput): { subject: string; text: string } {
  const when = input.scheduledAt
    ? new Date(input.scheduledAt).toLocaleString("sk-SK", { timeZone: "Europe/Bratislava" })
    : "čas neuvedený";

  const accents = demoAccentLines(input.utm.goals);
  const lossLine =
    input.utm.calcLossMonthly != null && input.utm.calcLossMonthly >= 100
      ? `Kontext: prišiel s odhadom straty ~${input.utm.calcLossMonthly} €/mes (kalkulačka).`
      : null;

  const prospectBlock = input.prospect
    ? [
        `Kancelária: ${input.prospect.nazov}`,
        `Mesto / kraj: ${input.prospect.mesto || "—"} / ${input.prospect.kraj || "—"}`,
        `ICP skóre: ${input.prospect.icp_score}/100`,
        `Tím (odhad): ${input.prospect.team_size_estimate ?? "—"}`,
        `Portály (detekcia na webe): ${(input.prospect.portals_detected ?? []).join(", ") || "—"}`,
      ].join("\n")
    : input.unknownProspect
      ? "Prospect: neznámy (žiadny match podľa e-mail domény)."
      : "Prospect: bez matchu v databáze.";

  const text = [
    `Pre-demo brief — ${input.inviteeName || input.inviteeEmail}`,
    `Termín: ${when}`,
    "",
    prospectBlock,
    lossLine,
    "",
    "3 demo akcenty:",
    `1. ${accents[0]}`,
    `2. ${accents[1]}`,
    `3. ${accents[2]}`,
    "",
    "— Revolis Demo Ops",
  ]
    .filter(Boolean)
    .join("\n");

  const subject = `Pre-demo brief: ${input.prospect?.nazov ?? input.inviteeName ?? input.inviteeEmail}`;
  return { subject, text };
}

export function parseUtmFromBooking(row: {
  utm_content?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
}): ParsedDemoUtm {
  return parseDemoUtm(row.utm_content);
}
