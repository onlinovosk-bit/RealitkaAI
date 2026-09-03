import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_ROOT = process.cwd();
const ACTIONS = join(CRM_ROOT, "src/app/(public)/register/actions.ts");
const SMOLKO = "11111111-1111-1111-1111-111111111111";
const SMOLKO_TEAM = "22222222-2222-2222-2222-222222222222";

function src(): string {
  return readFileSync(ACTIONS, "utf8");
}

describe("public register must not assign shared Smolko tenant", () => {
  it("does not hard-code DEFAULT_AGENCY_ID / DEFAULT_TEAM_ID for inserts", () => {
    const text = src();
    expect(text).not.toMatch(/const DEFAULT_AGENCY_ID/);
    expect(text).not.toMatch(/const DEFAULT_TEAM_ID/);
    expect(text).not.toContain(`agency_id: "${SMOLKO}"`);
    expect(text).not.toContain(`agency_id: '${SMOLKO}'`);
    expect(text).not.toContain(`team_id: "${SMOLKO_TEAM}"`);
  });

  it("never inserts profiles with the Smolko agency UUID", () => {
    const text = src();
    // Forbidden UUID may appear only as an explicit denylist constant, not as insert value.
    const insertBlock = text.match(/\.insert\(\{[\s\S]*?\}\)/g) ?? [];
    for (const block of insertBlock) {
      expect(block).not.toContain(SMOLKO);
    }
  });

  it("does not assign role from a global profiles count", () => {
    const text = src();
    expect(text).not.toMatch(/count === 0 \? ["']owner["']/);
    expect(text).not.toMatch(/select\("\*", \{ count: "exact"/);
  });

  it("fails closed when no pre-provisioned profile exists", () => {
    const text = src();
    expect(text).toMatch(/Registrácia je dočasne nedostupná|chýba bezpečné založenie agentúry/);
  });
});
