import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const maybeSingle = vi.fn();
const createClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

import { loadAcquisitionDashboard, loadAcquisitionSession } from "@/lib/acquisition/load-dashboard";
import type { DashboardSupabase } from "@/lib/acquisition/load-dashboard";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("loadAcquisitionDashboard", () => {
  it("starts accounts, campaigns, and events selects before any of them resolve", async () => {
    const started: string[] = [];
    const accounts = deferred<{ data: unknown[]; error: null }>();
    const campaigns = deferred<{ data: unknown[]; error: null }>();
    const events = deferred<{ data: unknown[]; error: null }>();
    const pending: Record<string, ReturnType<typeof deferred<{ data: unknown[]; error: null }>>> = {
      acquisition_accounts: accounts,
      acquisition_campaigns: campaigns,
      acquisition_events: events,
    };

    const supabase = {
      from(table: string) {
        started.push(table);
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => pending[table].promise,
                }),
              }),
            }),
          }),
        };
      },
    } as unknown as DashboardSupabase;

    const resultPromise = loadAcquisitionDashboard(supabase, "agency-1");
    await Promise.resolve();

    expect(started).toEqual([
      "acquisition_accounts",
      "acquisition_campaigns",
      "acquisition_events",
    ]);

    accounts.resolve({ data: [], error: null });
    campaigns.resolve({ data: [], error: null });
    events.resolve({ data: [], error: null });

    await expect(resultPromise).resolves.toEqual({
      accounts: [],
      campaigns: [],
      events: [],
    });
  });
});

describe("loadAcquisitionSession", () => {
  beforeEach(() => {
    getUser.mockReset();
    maybeSingle.mockReset();
    createClient.mockReset();
    createClient.mockResolvedValue({
      auth: { getUser },
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle }),
        }),
      }),
    });
  });

  it("performs a single auth.getUser round-trip per session load", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    maybeSingle.mockResolvedValue({ data: { agency_id: "agency-1" } });

    const session = await loadAcquisitionSession();

    expect(getUser).toHaveBeenCalledTimes(1);
    expect(session.user?.id).toBe("user-1");
    expect(session.agencyId).toBe("agency-1");
  });
});
