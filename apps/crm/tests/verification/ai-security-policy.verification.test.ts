import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(process.cwd(), "..", "..");
const POLICY_PATH = join(REPO_ROOT, "docs", "security", "AI_SECURITY.md");

describe("AI security policy (live spec)", () => {
  it("AI_SECURITY.md exists at docs/security/", () => {
    expect(existsSync(POLICY_PATH)).toBe(true);
  });

  it("documents gap map, tool matrix, critical human gates, and Security Guardian PR scope", () => {
    const text = readFileSync(POLICY_PATH, "utf8");
    expect(text).toContain("Gap map");
    expect(text).toContain("Least privilege");
    expect(text).toContain("Security Guardian");
    expect(text).toContain("human_approved");
    expect(text).toContain("service_role");
    expect(text).toContain("PR-A");
  });
});
