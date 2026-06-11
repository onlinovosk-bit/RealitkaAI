import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ScoredProspect } from "./types.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
dotenv.config({ path: path.join(ROOT, "apps", "crm", ".env.local") });
dotenv.config({ path: path.join(ROOT, ".env.local") });

export async function generatePersonalLine(prospect: ScoredProspect): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY missing in .env.local");
  }

  const facts = [
    prospect.mesto && `mesto: ${prospect.mesto}`,
    prospect.kraj && `kraj: ${prospect.kraj}`,
    prospect.team_size_estimate != null && `tím na webe ~${prospect.team_size_estimate}`,
    prospect.portals_detected.length > 0 && `portály: ${prospect.portals_detected.join(", ")}`,
    prospect.zamestnanci != null && `zamestnanci FinStat: ${prospect.zamestnanci}`,
  ]
    .filter(Boolean)
    .join("; ");

  const prompt = `Napíš jednu slovenskú vetu (max 25 slov) pre B2B cold email majiteľovi RK ${prospect.nazov}.
Použi IBA tieto overiteľné fakty: ${facts || "žiadne extra fakty"}.
Žiadne lichôtky, žiadne vymyslené čísla, žiadne "AI". Vráť len vetu.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 120,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}`);
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
  return text.replace(/^["']|["']$/g, "");
}
