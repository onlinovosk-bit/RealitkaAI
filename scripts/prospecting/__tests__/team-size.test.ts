import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { estimateTeamSize } from "../lib/enrich-parser.ts";

const FIX = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("estimateTeamSize", () => {
  it("small team ~1", () => {
    const html = fs.readFileSync(path.join(FIX, "team-small.html"), "utf8");
    const n = estimateTeamSize(html);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(3);
  });

  it("medium team ~4", () => {
    const html = fs.readFileSync(path.join(FIX, "team-medium.html"), "utf8");
    const n = estimateTeamSize(html);
    expect(n).toBeGreaterThanOrEqual(3);
    expect(n).toBeLessThanOrEqual(6);
  });

  it("large team 11+", () => {
    const html = fs.readFileSync(path.join(FIX, "team-large.html"), "utf8");
    const n = estimateTeamSize(html);
    expect(n).toBeGreaterThanOrEqual(10);
  });
});
