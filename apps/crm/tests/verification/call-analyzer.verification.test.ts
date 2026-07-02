import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import mockResponses from "../fixtures/call-transcripts/mock-claude-responses.json";

const callClaudeMock = vi.fn();

vi.mock("@/lib/ai/claude", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/claude")>();
  return {
    ...actual,
    callClaude: (...args: unknown[]) => callClaudeMock(...args),
    CLAUDE_HAIKU: "claude-haiku-mock",
  };
});

import { analyzeCall } from "@/lib/ai/call-analysis";

const FIXTURE_DIR = resolve(__dirname, "../fixtures/call-transcripts");

function loadTranscript(name: string): string {
  return readFileSync(resolve(FIXTURE_DIR, name), "utf8");
}

function claudeJsonResponse(payload: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    usage: { input_tokens: 100, output_tokens: 200 },
    stop_reason: "end_turn",
  };
}

describe("[verification] Call analyzer short-transcript path", () => {
  it("returns inconclusive fallback for transcripts under 50 chars (no Claude call)", async () => {
    const result = await analyzeCall("Krátky prepis.");
    expect(result.sentiment).toBe("inconclusive");
    expect(result.analysis_confidence).toBe("low");
    expect(result.inconclusive_reason).toContain("krátky");
    expect(result.score).toBe(50);
    expect(callClaudeMock).not.toHaveBeenCalled();
  });

  it("returns inconclusive for empty transcript", async () => {
    const result = await analyzeCall("   ");
    expect(result.escalation_needed).toBe(false);
    expect(result.keyTopics).toEqual([]);
  });
});

describe("[verification] Call analyzer mock pipeline (SK fixtures)", () => {
  beforeEach(() => {
    callClaudeMock.mockReset();
  });

  it("analyzes obhliadka transcript with mocked Claude — buying signals", async () => {
    callClaudeMock.mockResolvedValueOnce(claudeJsonResponse(mockResponses.obhliadka));

    const transcript = loadTranscript("obhliadka.sk.txt");
    expect(transcript.length).toBeGreaterThan(50);

    const result = await analyzeCall(transcript);

    expect(callClaudeMock).toHaveBeenCalledOnce();
    expect(result.sentiment).toBe("positive");
    expect(result.buying_signals.length).toBeGreaterThan(0);
    expect(result.keyTopics).toContain("obhliadka 2-izbového bytu");
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.analysis_confidence).toBe("high");
  });

  it("analyzes cenová námietka transcript — extracts price objections", async () => {
    callClaudeMock.mockResolvedValueOnce(claudeJsonResponse(mockResponses.cenova_namietka));

    const transcript = loadTranscript("cenova-namietka.sk.txt");
    const result = await analyzeCall(transcript);

    expect(callClaudeMock).toHaveBeenCalledOnce();
    expect(result.objections.some((o) => /389|350|360|cena/i.test(o))).toBe(true);
    expect(result.nextAction.length).toBeGreaterThan(5);
    expect(result.sentiment).toBe("neutral");
  });
});
