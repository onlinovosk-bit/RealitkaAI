import { describe, expect, it } from "vitest";
import { SLATE_HORIZON } from "./slate-horizon-theme";

function relativeLuminance(hex: string): number {
  const raw = hex.replace("#", "");
  const n = Number.parseInt(raw, 16);
  const channels = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

describe("SLATE_HORIZON Admiral tokens", () => {
  it("keeps object keys — values only", () => {
    expect(Object.keys(SLATE_HORIZON)).toEqual([
      "brand",
      "brand2",
      "brandDeep",
      "brandNavy",
      "ink",
      "inkDeep",
      "deep",
      "muted",
      "line",
      "soft",
      "softBorder",
      "bg",
      "green",
      "greenDark",
      "money",
      "amber",
      "warning",
      "red",
      "danger",
      "navText",
      "sidebarBg",
      "cardBg",
      "cardShadow",
      "cardHoverShadow",
      "topbarGradient",
      "heroGradient",
      "heroAmbient",
      "railGradient",
      "railWidth",
      "sidebarWidth",
      "ctaGradient",
      "focusRing",
    ]);
  });

  it("body text meets 4.5:1 on its surfaces", () => {
    expect(contrastRatio("#FFFFFF", SLATE_HORIZON.brand)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#FFFFFF", SLATE_HORIZON.brandDeep)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#FFFFFF", SLATE_HORIZON.brandNavy)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(SLATE_HORIZON.ink, SLATE_HORIZON.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(SLATE_HORIZON.muted, SLATE_HORIZON.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(SLATE_HORIZON.navText, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps green / amber / red distinguishable", () => {
    expect(SLATE_HORIZON.green).not.toBe(SLATE_HORIZON.amber);
    expect(SLATE_HORIZON.amber).not.toBe(SLATE_HORIZON.red);
    expect(SLATE_HORIZON.green).not.toBe(SLATE_HORIZON.red);
    expect(SLATE_HORIZON.green.toLowerCase()).not.toBe(SLATE_HORIZON.brand.toLowerCase());
  });
});
