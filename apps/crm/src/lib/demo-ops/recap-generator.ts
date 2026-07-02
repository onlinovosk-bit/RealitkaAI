import { callClaude, CLAUDE_HAIKU } from "@/lib/ai/claude";
import type { ParsedDemoUtm } from "./utm-parse";

export type RecapInput = {
  inviteeName: string;
  companyName: string | null;
  utm: ParsedDemoUtm;
};

export async function generateRecapDraft(input: RecapInput): Promise<string> {
  const goals = input.utm.goals.length ? input.utm.goals.join(", ") : "všeobecná efektivita";
  const loss =
    input.utm.calcLossMonthly != null && input.utm.calcLossMonthly >= 100
      ? `${input.utm.calcLossMonthly} € mesačne`
      : null;

  const system = [
    "Si asistent pre realitné B2B demo follow-upy.",
    "Píš po slovensky, vykanie, max 120 slov.",
    "Bez zmienky o AI — používaj: systém, Revolis, pripravené odpovede.",
    "Žiadne vymyslené čísla ani mená klientov.",
    "Návrh je LEN pre interné schválenie majiteľom — nie finálny email klientovi.",
  ].join(" ");

  const user = [
    `Meno na calendly: ${input.inviteeName}`,
    input.companyName ? `Kancelária: ${input.companyName}` : "",
    `Ciele z demo (utm): ${goals}`,
    loss ? `Odhad straty z kalkulačky: ${loss}` : "",
    "Úloha: Navrhni draft follow-up emailu po demo (rekap cieľov, jedno číslo ak je, jasný ďalší krok).",
  ]
    .filter(Boolean)
    .join("\n");

  const resp = await callClaude(
    {
      model: CLAUDE_HAIKU,
      max_tokens: 400,
      system,
      messages: [{ role: "user", content: user }],
    },
    "demo-recap",
  );

  const block = resp.content.find((b) => b.type === "text");
  const text = block && block.type === "text" ? block.text.trim() : "";
  if (!text) throw new Error("Prázdny recap draft z modelu");
  return text;
}
