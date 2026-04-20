export type DealStrategy = {
  summary: string;
  nextSteps: string[];
  objections: string[];
  closingTechnique: string;
};
export async function generateDealStrategy(lead: Record<string, unknown>): Promise<DealStrategy> {
  const score = typeof lead.score === "number" ? lead.score : 50;
  return {
    summary: score >= 70 ? "Vysoká priorita" : "Stredná priorita",
    nextSteps: ["Zavolať do 24 hodín", "Pripraviť ponuku", "Navrhnúť obhliadku"],
    objections: ["Cena je príliš vysoká", "Ešte nie sme rozhodnutí", "Pozeráme aj iné"],
    closingTechnique: score >= 70 ? "Urgency close" : "Value close",
  };
}
