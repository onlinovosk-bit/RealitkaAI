export type CallAnalysisResult = {
  sentiment: "positive" | "neutral" | "negative";
  keyTopics: string[];
  nextAction: string;
  score: number;
  summary: string;
};
export async function analyzeCall(t: string): Promise<CallAnalysisResult> {
  return {
    sentiment: "neutral",
    keyTopics: ["cena", "lokalita", "termín"],
    nextAction: "Odoslať ponuku do 24 hodín",
    score: Math.min(100, t.split(/s+/).length / 2),
    summary: "Hovor prebehol štandardne.",
  };
}
