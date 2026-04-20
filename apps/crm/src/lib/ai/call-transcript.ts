export type TranscriptSegment = {
  speaker: "agent" | "client";
  text: string;
  startMs: number;
  endMs: number;
};
export type Transcript = { segments: TranscriptSegment[]; fullText: string; durationMs: number };
export function buildTranscriptText(segs: TranscriptSegment[]): string {
  return segs.map((s) => (s.speaker === "agent" ? "Makler" : "Klient") + ": " + s.text).join("\n");
}
