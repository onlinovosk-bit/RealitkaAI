import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { isFounderMetricsViewer, parseFounderEmails } from "../access";

describe("founder metrics access", () => {
  const prev = process.env.FOUNDER_EMAILS;

  beforeEach(() => {
    process.env.FOUNDER_EMAILS = "andy@revolis.ai, founder@example.com";
  });

  afterEach(() => {
    process.env.FOUNDER_EMAILS = prev;
  });

  it("parseFounderEmails splits comma-separated list", () => {
    expect(parseFounderEmails(" A@x.com , B@x.com ")).toEqual(["a@x.com", "b@x.com"]);
  });

  it("allows listed founder emails", () => {
    expect(isFounderMetricsViewer("andy@revolis.ai")).toBe(true);
    expect(isFounderMetricsViewer("Founder@Example.com")).toBe(true);
  });

  it("rejects unlisted emails", () => {
    expect(isFounderMetricsViewer("agent@rk.sk")).toBe(false);
    expect(isFounderMetricsViewer(null)).toBe(false);
  });

  it("denies all when env empty", () => {
    process.env.FOUNDER_EMAILS = "";
    expect(isFounderMetricsViewer("andy@revolis.ai")).toBe(false);
  });
});
