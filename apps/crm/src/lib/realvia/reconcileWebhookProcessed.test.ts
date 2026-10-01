import { describe, expect, it } from "vitest";
import { isAdvertPayload } from "@/lib/realvia/types";

describe("reconcileWebhookProcessed source_id extraction", () => {
  it("extracts source_id only from advert payloads", () => {
    const payload = {
      action: "create",
      advert: { source_id: "13303557", title: "Test" },
      broker: { source_id: 1 },
    };
    expect(isAdvertPayload(payload)).toBe(true);
    if (isAdvertPayload(payload)) {
      expect(String(payload.advert.source_id)).toBe("13303557");
    }
  });
});
