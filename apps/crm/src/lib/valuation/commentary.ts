import { callOpenAI } from "@/lib/ai/openai";
import type {
  ValuationEstimateResult,
  ValuationPropertyInput,
} from "@/lib/valuation/types";

export async function enrichEstimateCommentary(
  input: ValuationPropertyInput,
  estimate: ValuationEstimateResult,
): Promise<string> {
  if (estimate.noEstimate || estimate.low == null || estimate.high == null) {
    return estimate.commentary;
  }

  if (!process.env.OPENAI_API_KEY) {
    return estimate.commentary;
  }

  try {
    const { content } = await callOpenAI({
      model: process.env.VALUATION_COMMENTARY_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 180,
      tag: "valuation-commentary",
      messages: [
        {
          role: "system",
          content:
            "Si realitný analytik. Napíš 2–3 vety po slovensky. Nevymýšľaj nové čísla — použij dodané pásmo. Bez marketingu, bez sľubov predaja.",
        },
        {
          role: "user",
          content: JSON.stringify({
            typ: input.propertyType,
            lokalita: input.location,
            vymera: input.sqm,
            stav: input.condition ?? null,
            pasmo_od: estimate.low,
            pasmo_do: estimate.high,
            region: estimate.regionLabel,
            zdroj: `NBS ${estimate.sourceQuarter ?? ""}`,
          }),
        },
      ],
    });

    const trimmed = content.trim();
    return trimmed.length >= 40 ? trimmed.slice(0, 500) : estimate.commentary;
  } catch (error) {
    console.error("[valuation/commentary]", error);
    return estimate.commentary;
  }
}
