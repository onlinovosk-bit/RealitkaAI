import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { canViewFounderMetrics, isFounderMetricsViewer, parseFounderEmails } from "../access";

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

  it("platform admin prejde aj keď jeho e-mail v allowliste nie je", () => {
    // Presne prípad, ktorý vracal 404: is_platform_admin = true, e-mail mimo zoznamu.
    expect(isFounderMetricsViewer("gpmmfashion@gmail.com")).toBe(false);
    expect(
      canViewFounderMetrics({ email: "gpmmfashion@gmail.com", isPlatformAdmin: true }),
    ).toBe(true);
  });

  it("platform admin prejde aj keď je FOUNDER_EMAILS prázdna", () => {
    process.env.FOUNDER_EMAILS = "";
    expect(canViewFounderMetrics({ email: "kto@kolvek.sk", isPlatformAdmin: true })).toBe(true);
  });

  it("allowlist ostáva druhou cestou pre človeka bez profilu", () => {
    expect(
      canViewFounderMetrics({ email: "andy@revolis.ai", isPlatformAdmin: false }),
    ).toBe(true);
  });

  it("bez oboch nepustí nikoho", () => {
    expect(canViewFounderMetrics({ email: "agent@rk.sk", isPlatformAdmin: false })).toBe(false);
    expect(canViewFounderMetrics({ email: null, isPlatformAdmin: null })).toBe(false);
    expect(canViewFounderMetrics({ email: undefined, isPlatformAdmin: undefined })).toBe(false);
  });
});
