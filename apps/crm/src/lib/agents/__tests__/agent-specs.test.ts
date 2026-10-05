import { existsSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { lookupAction } from "@revolis/control-contract";
import { AGENT_SPECS, agentKind } from "../agent-specs";
import { AGENT_ALLOWED } from "../../../../../../packages/mcp-onlinovo/src/agents/guard";
import { LLM_WIRED } from "../../../../../../packages/mcp-onlinovo/src/agents/classification";
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
      if (agentKind(spec) === "customer_facing_send") {
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
      } else {
        it("every allowed action is registered, allowed, internal, reversible and never customer-visible", () => {
          expect(spec.allowedActions.length).toBeGreaterThan(0);
          for (const action of spec.allowedActions) {
            const meta = lookupAction(action);
            expect(meta, action).not.toBeNull();
            expect(meta!.denied, action).toBe(false);
            expect(["OBSERVE", "ANALYZE", "RECOMMEND"], action).toContain(meta!.capability);
            expect(meta!.reversible, action).toBe(true);
            expect(meta!.externallyVisible, action).toBe(false);
            expect(meta!.externalProvider, action).toBeNull();
          }
        });

        it("names every Blueprint L1 field and forbids sending, campaigns and unapproved action", () => {
          for (const k of ["mission", "trigger", "approvalPolicy", "memoryPolicy", "failurePolicy", "owner"] as const) {
            expect(spec[k].length, k).toBeGreaterThan(0);
          }
          expect(spec.forbiddenActions).toContain("send without a human approval");
          expect(spec.forbiddenActions.some((f) => f.includes("onlinovo.campaign.*") && f.includes("BLOCKED"))).toBe(true);
          expect(spec.forbiddenActions.some((f) => /LLM/.test(f))).toBe(true);
        });

        it("declares its model honestly: no LLM while none is wired", () => {
          expect(LLM_WIRED).toBe(false);
          expect(spec.model).toMatch(/^none \(deterministic/);
          expect(spec.promptVersion).toMatch(/^none \(deterministic/);
        });

        it("allows exactly what the runtime guard allows for this agent", () => {
          const wired = AGENT_ALLOWED[spec.agentId as keyof typeof AGENT_ALLOWED];
          expect(wired, spec.agentId).toBeDefined();
          expect([...spec.allowedActions].sort()).toEqual([...wired].sort());
        });

        it("is not an agent a human can approve into sending", () => {
          expect(APPROVABLE_DRAFT_AGENTS as readonly string[]).not.toContain(spec.agentId);
          expect(Object.keys(SEND_ACTIONS)).not.toContain(spec.agentId);
        });
      }

      it("its evaluation suite and code files exist", () => {
        for (const f of [...spec.evaluationSuite, ...spec.code]) {
          expect(existsSync(resolve(CRM, f)), f).toBe(true);
        }
      });
    });
  }

  it("every ONLINOVO spec is internal intelligence, and nothing else claims that domain", () => {
    const onl = AGENT_SPECS.filter((x) => x.domain === "onlinovo");
    expect(onl.map((x) => x.agentId).sort()).toEqual(["ONL-CUSTOMER-NEXT-ACTION", "ONL-EXPERIMENT", "ONL-REVENUE-OPPORTUNITY"]);
    for (const spec of onl) expect(agentKind(spec), spec.agentId).toBe("internal_intelligence");
    for (const spec of AGENT_SPECS.filter((x) => x.domain !== "onlinovo")) {
      expect(agentKind(spec), spec.agentId).toBe("customer_facing_send");
    }
  });

  it("every draft agent in the approve path has a spec with exactly those actions", () => {
    for (const agentId of APPROVABLE_DRAFT_AGENTS) {
      const spec = AGENT_SPECS.find((s) => s.agentId === agentId);
      expect(spec, agentId).toBeDefined();
      const wired = Object.values(SEND_ACTIONS[agentId] ?? {}).sort();
      expect(wired).toEqual([...spec!.allowedActions].sort());
    }
  });
});
