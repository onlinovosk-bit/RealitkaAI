export type CoachFeedback = { score: number; strengths: string[]; improvements: string[]; tip: string };
export async function generateCallCoachFeedback(_t: string): Promise<CoachFeedback> {
  return {
    score: 72,
    strengths: ["Dobrý úvod", "Aktívne počúvanie"],
    improvements: ["Viac otvorených otázok", "Kratší monológ"],
    tip: "Vždy potvrď dátum ďalšieho kontaktu.",
  };
}
