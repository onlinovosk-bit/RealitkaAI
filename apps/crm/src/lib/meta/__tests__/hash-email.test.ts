import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashEmailForMeta, hashedEmailRows } from "../hash-email";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

describe("hashEmailForMeta", () => {
  it("je SHA-256 (hex, 64 znakov) normalizovanej adresy", () => {
    const h = hashEmailForMeta("  Test@Example.COM ");
    expect(h).toBe(sha("test@example.com"));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rôzna veľkosť písmen a medzery dajú ten istý hash", () => {
    expect(hashEmailForMeta("A@B.sk")).toBe(hashEmailForMeta(" a@b.SK "));
  });
});

describe("hashedEmailRows", () => {
  it("nevracia čisté adresy a deduplikuje", () => {
    const rows = hashedEmailRows([{ email: "a@b.sk" }, { email: "A@B.sk" }, { email: null }, {}]);
    expect(rows).toEqual([[sha("a@b.sk")]]);
    expect(JSON.stringify(rows)).not.toContain("@");
  });
});
