import { existsSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { lookupAction } from "@revolis/control-contract";
import { AGENT_SPECS } from "../agent-specs";
import { SEND_ACTIONS } from "@/lib/inbound/approve-draft";
import { APPROVABLE_DRAFT_AGENTS } from "@/lib/inbound/draft-view";

/**
 * The spec is load-bearing: if code and spec drift apart, this fails CI.
 */
const CRM = resolve(__dirname, "../../../..");

describe("agent specs match the running system", () => {
  it("agent ids are unique", () => {
    const ids = AGENT_SPECS.map((s) => s.agentId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const spec of AGENT_SPECS) {
    describe(spec.agentId, () => {
      it("every allowed action is registered, irreversible and externally visible", () => {
        for (const action of spec.allowedActions) {
          const meta = lookupAction(action);
          expect(meta, action).not.toBeNull();
          expect(meta!.reversible, action).toBe(false);
          expect(meta!.externallyVisible, action).toBe(true);
          expect(meta!.denied, action).toBe(false);
        }
      });

      it("has a versioned prompt and names every Blueprint L1 field", () => {
        expect(spec.promptVersion).toMatch(/-v\d+$/);
        for (const k of ["mission", "trigger", "approvalPolicy", "memoryPolicy", "failurePolicy", "owner"] as const) {
          expect(spec[k].length, k).toBeGreaterThan(0);
        }
        expect(spec.forbiddenActions).toContain("send without a human approval");
      });

      it("its evaluation suite and code files exist", () => {
        for (const f of [...spec.evaluationSuite, ...spec.code]) {
          expect(existsSync(resolve(CRM, f)), f).toBe(true);
        }
      });
    });
  }

  it("every draft agent in the approve path has a spec with exactly those actions", () => {
    for (const agentId of APPROVABLE_DRAFT_AGENTS) {
      const spec = AGENT_SPECS.find((s) => s.agentId === agentId);
      expect(spec, agentId).toBeDefined();
      const wired = Object.values(SEND_ACTIONS[agentId] ?? {}).sort();
      expect(wired).toEqual([...spec!.allowedActions].sort());
    }
  });
});
