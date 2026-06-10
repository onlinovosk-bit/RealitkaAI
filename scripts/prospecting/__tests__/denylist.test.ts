import { describe, it, expect } from "vitest";
import {
  isDeniedFetchUrl,
  isDeniedFetchHostname,
  PORTAL_FETCH_DENYLIST,
} from "../lib/denylist.ts";

describe("portal fetch denylist", () => {
  it("denylist is non-empty and includes major portals", () => {
    expect(PORTAL_FETCH_DENYLIST.length).toBeGreaterThan(5);
    expect(PORTAL_FETCH_DENYLIST.some((d) => d.includes("nehnutelnosti.sk"))).toBe(true);
  });

  it("blocks nehnutelnosti.sk fetch", () => {
    expect(isDeniedFetchUrl("https://www.nehnutelnosti.sk/inzerat/123")).toBe(true);
    expect(isDeniedFetchHostname("nehnutelnosti.sk")).toBe(true);
  });

  it("blocks topreality and bazos", () => {
    expect(isDeniedFetchUrl("https://topreality.sk/detail")).toBe(true);
    expect(isDeniedFetchUrl("https://reality.bazos.sk/inzerat")).toBe(true);
  });

  it("allows agency websites", () => {
    expect(isDeniedFetchUrl("https://www.reality-smolko.sk/tim")).toBe(false);
    expect(isDeniedFetchUrl("https://example-realitka.sk")).toBe(false);
  });
});
