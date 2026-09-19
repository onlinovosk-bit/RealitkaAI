import { beforeEach, describe, expect, it, vi } from "vitest";

const trackGaEventMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics/gtag", () => ({
  trackGaEvent: trackGaEventMock,
}));

import {
  trackListingClicked,
  trackResultsEmpty,
  trackResultsShown,
  trackSprievodcaStarted,
  trackSprievodcaSubmitted,
  trackUnknownSectionShown,
} from "@/lib/sprievodca/analytics";

describe("sprievodca analytics", () => {
  beforeEach(() => {
    trackGaEventMock.mockClear();
  });

  it("trackSprievodcaStarted", () => {
    trackSprievodcaStarted("reality-smolko", "sess-1");
    expect(trackGaEventMock).toHaveBeenCalledWith("sprievodca_started", {
      agency_slug: "reality-smolko",
      session_id: "sess-1",
    });
  });

  it("trackSprievodcaSubmitted", () => {
    trackSprievodcaSubmitted("reality-smolko", "sess-1", "buy", "flat");
    expect(trackGaEventMock).toHaveBeenCalledWith("sprievodca_submitted", {
      agency_slug: "reality-smolko",
      session_id: "sess-1",
      deal_type: "buy",
      property_type: "flat",
    });
  });

  it("trackResultsShown", () => {
    trackResultsShown("reality-smolko", "sess-1", 12);
    expect(trackGaEventMock).toHaveBeenCalledWith("results_shown", {
      agency_slug: "reality-smolko",
      session_id: "sess-1",
      result_count: 12,
    });
  });

  it("trackResultsEmpty", () => {
    trackResultsEmpty("reality-smolko", "sess-1", "rent", "house");
    expect(trackGaEventMock).toHaveBeenCalledWith("results_empty", {
      agency_slug: "reality-smolko",
      session_id: "sess-1",
      deal_type: "rent",
      property_type: "house",
    });
  });

  it("trackUnknownSectionShown", () => {
    trackUnknownSectionShown("reality-smolko", "sess-1", 7);
    expect(trackGaEventMock).toHaveBeenCalledWith("unknown_section_shown", {
      agency_slug: "reality-smolko",
      session_id: "sess-1",
      unknown_count: 7,
    });
  });

  it("trackListingClicked", () => {
    trackListingClicked("reality-smolko", "sess-1", 3);
    expect(trackGaEventMock).toHaveBeenCalledWith("listing_clicked", {
      agency_slug: "reality-smolko",
      session_id: "sess-1",
      listing_position: 3,
    });
  });

  it("never includes PII keys in any event payload", () => {
    trackSprievodcaStarted("reality-smolko", "sess-1");
    trackSprievodcaSubmitted("reality-smolko", "sess-1", "buy", "flat");
    trackResultsShown("reality-smolko", "sess-1", 1);
    trackResultsEmpty("reality-smolko", "sess-1", "buy", "flat");
    trackUnknownSectionShown("reality-smolko", "sess-1", 1);
    trackListingClicked("reality-smolko", "sess-1", 0);
    for (const call of trackGaEventMock.mock.calls) {
      const payload = (call[1] ?? {}) as Record<string, unknown>;
      const keys = Object.keys(payload);
      expect(keys).not.toContain("email");
      expect(keys).not.toContain("name");
      expect(keys).not.toContain("phone");
      expect(keys).not.toContain("rawFocusText");
      expect(JSON.stringify(payload)).not.toMatch(/@|rawFocusText|0900/);
    }
  });
});

describe("gtag missing guard", () => {
  it("real trackGaEvent does not throw without window.gtag", async () => {
    const mod = await vi.importActual<typeof import("@/lib/analytics/gtag")>(
      "@/lib/analytics/gtag",
    );
    expect(() =>
      mod.trackGaEvent("sprievodca_started", { agency_slug: "x" }),
    ).not.toThrow();
  });
});
