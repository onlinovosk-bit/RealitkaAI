// ================================================================
// BOD 4 (zadanie foundera 2026-10-15): plánovač Realvia fronty.
//
// Route existovala, ale nebola vo `vercel.json` — v komentári stálo, že ju
// spúšťa externý cron každých 5 minút. Taký cron nebežal. Zmerané na PROD
// 2026-10-15 z `realvia_metrics`: za 21 dní beh prebehol iba v 7 dňoch
// (24 behov), úloha vo fronte čakala v priemere ~2 dni, najdlhšie 28 dní.
//
// Odteraz beží hodinovo a po každom behu nechá stopu. Testy držia to druhé:
// bez stopy by sa o mesiac znova nedalo povedať, či cron prichádza.
// ================================================================
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  queue: { processed: 0, succeeded: 0, failed: 0, durationMs: 5, results: [] as Array<Record<string, unknown>> },
  queueThrows: null as string | null,
  record: vi.fn(),
  skipped: vi.fn(),
  unauthorized: vi.fn(),
  client: {} as unknown,
}));

vi.mock("@/lib/supabase/admin", () => ({ createServiceRoleClient: () => mocks.client }));

vi.mock("@/lib/realvia/processQueue", () => ({
  processRealviaQueue: async () => {
    if (mocks.queueThrows) throw new Error(mocks.queueThrows);
    return mocks.queue;
  },
}));
vi.mock("@/lib/realvia/webhookStore", () => ({
  enqueueReplayFailedQueueJobs: async () => ({ replayedCount: 3, errors: [] }),
}));
vi.mock("@/lib/realvia/reconcileWebhookProcessed", () => ({
  reconcileWebhookProcessedFlags: async () => ({ updated: 1 }),
}));

vi.mock("@/lib/ops/cron-run", async (orig) => ({
  ...(await orig<typeof import("@/lib/ops/cron-run")>()),
  recordCronRun: (...a: unknown[]) => mocks.record(...a),
  recordSkippedCronRun: (...a: unknown[]) => mocks.skipped(...a),
  recordUnauthorizedCronRun: (...a: unknown[]) => mocks.unauthorized(...a),
}));

import { GET } from "../route";

const SECRET = "fixture-cron";

function req(headers: Record<string, string> = {}, query = "") {
  return new NextRequest(`http://localhost/api/cron/realvia-process${query}`, {
    headers: { authorization: `Bearer ${SECRET}`, ...headers },
  });
}

/** Posledný zápis do cron_runs. */
const zapis = () => mocks.record.mock.calls.at(-1)?.[1] as Record<string, unknown> | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", SECRET);
  mocks.queue = { processed: 0, succeeded: 0, failed: 0, durationMs: 5, results: [] };
  mocks.queueThrows = null;
  mocks.client = {};
  mocks.record.mockResolvedValue(null);
  mocks.skipped.mockResolvedValue(true);
  mocks.unauthorized.mockResolvedValue(true);
});

describe("odmietnutie na autorizácii", () => {
  it("zlý secret s cron hlavičkou nechá stopu aj s user agentom", async () => {
    const res = await GET(
      req({
        authorization: "Bearer zle",
        "x-vercel-cron-schedule": "50 * * * *",
        "user-agent": "vercel-cron/1.0",
      }),
    );
    expect(res.status).toBe(401);
    expect(mocks.unauthorized).toHaveBeenCalledWith(
      expect.anything(), "realvia-process", "50 * * * *", "vercel-cron/1.0",
    );
  });

  it("zlý secret bez cron hlavičky nezapisuje nič", async () => {
    const res = await GET(req({ authorization: "Bearer zle" }));
    expect(res.status).toBe(401);
    expect(mocks.unauthorized).not.toHaveBeenCalled();
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it("chýbajúci CRON_SECRET zatvára dvere, nie otvára", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(req())).status).toBe(401);
  });
});

describe("beh nechá stopu", () => {
  it("prázdna fronta: zastropovaný záznam, nie riadok z každej hodiny", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(mocks.skipped).toHaveBeenCalledWith(
      expect.anything(), "realvia-process", "empty_queue",
      expect.objectContaining({ minIntervalMs: 6 * 60 * 60 * 1000 }),
    );
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it("spracovaná dávka: stav ok s počtami", async () => {
    mocks.queue = { processed: 4, succeeded: 4, failed: 0, durationMs: 120, results: [] };
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(zapis()).toMatchObject({ job: "realvia-process", status: "ok", eligible: 4, written: 4, failed: 0 });
  });

  it("čiastočné zlyhanie nesie prvú chybu", async () => {
    mocks.queue = {
      processed: 3, succeeded: 2, failed: 1, durationMs: 90,
      results: [{ success: true }, { success: false, error: "Agency resolution failed" }],
    };
    await GET(req());
    expect(zapis()).toMatchObject({ status: "partial", written: 2, failed: 1 });
    expect(zapis()?.firstError).toBe("Agency resolution failed");
  });

  it("nič sa nepodarilo spracovať: failed, nie ok", async () => {
    // 1287 z 2830 pokusov na PROD zlyhalo; tento stav sa nesmie javiť ako úspech.
    mocks.queue = { processed: 2, succeeded: 0, failed: 2, durationMs: 50, results: [{ success: false, error: "boom" }] };
    await GET(req());
    expect(zapis()?.status).toBe("failed");
  });

  it("výnimka z workera sa zapíše a vráti 500", async () => {
    mocks.queueThrows = "spojenie zlyhalo";
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(zapis()).toMatchObject({ status: "failed", firstError: "spojenie zlyhalo" });
  });

  it("replay sa zapíše aj pri prázdnej fronte", async () => {
    // Ručný zásah nie je „nič sa nedialo" — musí byť v denníku vidieť.
    await GET(req({}, "?replay_failed=1"));
    expect(mocks.skipped).not.toHaveBeenCalled();
    expect(zapis()?.detail).toMatchObject({ replayed: 3 });
  });
});
