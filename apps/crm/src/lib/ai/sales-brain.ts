export type SalesBrainInsight = {
  headline: string;
  reasoning: string;
  priority: "high" | "medium" | "low";
  suggestedAction: string;
};
export async function analyzeSalesBrain(
  _id: string,
  d: Record<string, unknown>
): Promise<SalesBrainInsight> {
  const s = typeof d.score === "number" ? d.score : 50;
  const p: "high" | "medium" | "low" = s >= 75 ? "high" : s >= 50 ? "medium" : "low";
  return {
    headline: s >= 75 ? "Horúci lead" : "Potenciálny lead",
    reasoning: `Skóre ${s}/100`,
    priority: p,
    suggestedAction: p === "high" ? "Zavolaj dnes" : "Pošli email",
  };
}
