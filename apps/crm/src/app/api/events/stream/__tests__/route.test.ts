import { afterEach, describe, expect, it, vi } from "vitest";

const { notCalls } = vi.hoisted(() => ({ notCalls: [] as unknown[][] }));

vi.mock("@/lib/supabase/server", () => {
  const eventsBuilder: Record<string, unknown> = {};
  for (const m of ["select", "gt", "order", "limit", "or", "is"]) {
    eventsBuilder[m] = () => eventsBuilder;
  }
  eventsBuilder.not = (...args: unknown[]) => {
    notCalls.push(args);
    return eventsBuilder;
  };
  eventsBuilder.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });

  return {
    createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
      from: (table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: { agency_id: "agency-1" } }) }),
            }),
          };
        }
        return eventsBuilder;
      },
    }),
  };
});

import { GET } from "../route";
import {
  AI_CALL_FAILED_EVENT,
  INBOUND_AUTO_RESPONSE_EVENT,
  OPERATOR_ONLY_EVENT_TYPES,
  operatorOnlyEventTypesFilter,
} from "@/lib/platform-events-visibility";
import { AI_CALL_FAILED_EVENT as AI_EVENT_FROM_RECORDER } from "@/lib/ai/ai-failure-record";

afterEach(() => {
  notCalls.length = 0;
});

describe("GET /api/events/stream — diagnostika pre prevádzku tenant nevidí", () => {
  it("dotaz na platform_events vylučuje ai.call_failed a inbound.auto_response", async () => {
    const res = await GET();
    const reader = res.body!.getReader();
    await reader.read(); // CONNECTED
    await new Promise((r) => setTimeout(r, 0)); // prvý poll
    await reader.cancel();

    expect(notCalls).toHaveLength(1);
    expect(notCalls[0]).toEqual([
      "event_type",
      "in",
      '("ai.call_failed","inbound.auto_response")',
    ]);
  });

  it("zoznam obsahuje obe diagnostické udalosti a recorder používa tú istú konštantu", () => {
    expect(OPERATOR_ONLY_EVENT_TYPES).toEqual([AI_CALL_FAILED_EVENT, INBOUND_AUTO_RESPONSE_EVENT]);
    expect(AI_EVENT_FROM_RECORDER).toBe(AI_CALL_FAILED_EVENT);
    expect(operatorOnlyEventTypesFilter()).toBe('("ai.call_failed","inbound.auto_response")');
  });
});
