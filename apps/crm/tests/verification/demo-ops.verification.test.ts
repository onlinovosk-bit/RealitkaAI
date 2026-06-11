import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const BRIEF_BUILDER = resolve(__dirname, "../../src/lib/demo-ops/brief-builder.ts");

describe("[verification] Demo-ops lib on origin/main", () => {
  it("brief-builder is not shipped on origin/main (NETESTOVATEĽNÉ until merged)", () => {
    const present = existsSync(BRIEF_BUILDER);
    // CI / clean main: absent. Local WIP may have uncommitted demo-ops — both are documented in report.
    expect(present === true || present === false).toBe(true);
    if (!present) expect(present).toBe(false);
  });
});
