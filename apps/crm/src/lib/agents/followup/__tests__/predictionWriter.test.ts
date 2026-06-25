import { describe, expect, it, vi } from "vitest";
import {
  toDecisionRow,
  writeOpenPrediction,
  writeOpenPredictions,
  type PredictionWriterClient,
} from "@/lib/agents/followup/predictionWriter";

describe("predictionWriter", () => {
  it("maps prediction to decision insert row", () => {
    const row = toDecisionRow({
      agency_id: "11111111-1111-1111-1111-111111111111",
      lead_id: "lead-1",
      decision: "follow_up_email",
      p_outcome: 0.22,
      expected_value_eur: 420,
      confidence: 0.62,
      expected_outcome: "reply_or_meeting",
      status: "open",
    });
    expect(row.status).toBe("open");
    expect(row.lead_id).toBe("lead-1");
  });

  it("writes open prediction via injected client", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "dec-1" }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    const client = { from } as unknown as PredictionWriterClient;

    const id = await writeOpenPrediction(
      {
        agency_id: "11111111-1111-1111-1111-111111111111",
        lead_id: "lead-2",
        decision: "follow_up_sms",
        p_outcome: 0.18,
        expected_value_eur: 310,
        confidence: 0.55,
        expected_outcome: "sms_reply",
        status: "open",
      },
      client,
    );

    expect(from).toHaveBeenCalledWith("decisions");
    expect(insert).toHaveBeenCalled();
    expect(id).toEqual({ id: "dec-1" });
  });

  it("batch-writes predictions sequentially", async () => {
    let counter = 0;
    const client = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => {
              counter += 1;
              return { data: { id: `dec-${counter}` }, error: null };
            },
          }),
        }),
      }),
    } as unknown as PredictionWriterClient;

    const ids = await writeOpenPredictions(
      [
        {
          agency_id: "11111111-1111-1111-1111-111111111111",
          lead_id: "a",
          decision: "follow_up_email",
          p_outcome: 0.2,
          expected_value_eur: 400,
          confidence: 0.6,
          expected_outcome: "reply_or_meeting",
          status: "open",
        },
        {
          agency_id: "11111111-1111-1111-1111-111111111111",
          lead_id: "b",
          decision: "follow_up_sms",
          p_outcome: 0.18,
          expected_value_eur: 300,
          confidence: 0.5,
          expected_outcome: "sms_reply",
          status: "open",
        },
      ],
      client,
    );

    expect(ids).toEqual(["dec-1", "dec-2"]);
  });
});
