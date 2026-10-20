import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockPull = vi.fn();
const mockRecord = vi.fn();
const mockSkipped = vi.fn();
const mockClient = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({ createServiceRoleClient: () => mockClient() }));
vi.mock("@/lib/ops/cron-run", async (orig) => ({
  ...(await orig<typeof import("@/lib/ops/cron-run")>()),
  recordCronRun: (...args: unknown[]) => mockRecord(...args),
  recordSkippedCronRun: (...args: unknown[]) => mockSkipped(...args),
}));

vi.mock("@/lib/inbound/gmail-pull", () => ({
  runGmailInboundPullAll: (...args: unknown[]) => mockPull(...args),
}));

import { GET, POST } from "../route";

function req(secret: string | null) {
  const init: ConstructorParameters<typeof NextRequest>[1] = {};
  if (secret) init.headers = { authorization: `Bearer ${secret}` };
  return new NextRequest("http://localhost/api/inbound/gmail-pull", init);
}

describe("POST /api/inbound/gmail-pull", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "fixture-cron");
    mockPull.mockResolvedValue({ ok: true, agencies: 1, pulled: 0, posted: 0, errors: [], alreadySeen: 0, outsideLabel: 0 });
    mockClient.mockReturnValue({});
    mockRecord.mockResolvedValue(null);
    mockSkipped.mockResolvedValue(true);
  });

  it("returns 401 without Bearer CRON_SECRET", async () => {
    const res = await GET(req(null));
    expect(res.status).toBe(401);
    expect(mockPull).not.toHaveBeenCalled();
  });

  it("returns 401 with the wrong secret", async () => {
    const res = await POST(req("wrong"));
    expect(res.status).toBe(401);
    expect(mockPull).not.toHaveBeenCalled();
  });

  it("fails closed when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const res = await POST(req("fixture-cron"));

    expect(res.status).toBe(401);
    expect(mockPull).not.toHaveBeenCalled();
  });

  it("runs pull when authorized", async () => {
    const res = await GET(req("fixture-cron"));
    expect(res.status).toBe(200);
    expect(mockPull).toHaveBeenCalledOnce();
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("tichý beh bez nových správ nezapisuje do cron_runs", async () => {
    await GET(req("fixture-cron"));
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it("vypnutý pull nezapisuje do cron_runs", async () => {
    mockPull.mockResolvedValue({ ok: true, skipped: "disabled", agencies: 0, pulled: 0, posted: 0, errors: [], alreadySeen: 0, outsideLabel: 0 });
  it("vypnutý pull nechá zastropovanú stopu s dôvodom, nie ticho", async () => {
    // Odkedy je pull v rozvrhu (vercel.json, 20 * * * *), prázdna tabuľka
    // znamenala dve rôzne veci: "Vercel to nespúšťa" a "spúšťa a chýba mu
    // konfigurácia". Riadok s dôvodom je to jediné, čo ich rozlíši.
    mockPull.mockResolvedValue({ ok: true, skipped: "disabled", pulled: 0, posted: 0, errors: [] });
    const res = await GET(req("fixture-cron"));
    expect(res.status).toBe(200);
    expect(mockSkipped).toHaveBeenCalledWith(expect.anything(), "gmail-inbound-pull", "disabled");
    // Preskočenie nie je beh: do bežnej vetvy denníka sa nezapisuje.
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it("preskočený beh nezhodí odpoveď, ani keď sa stopa nepodarí zapísať", async () => {
    mockPull.mockResolvedValue({ ok: true, skipped: "missing_oauth_env", pulled: 0, posted: 0, errors: [] });
    mockSkipped.mockResolvedValue(false);
    expect((await GET(req("fixture-cron"))).status).toBe(200);
  });

  it("tichý beh (zapnutý, bez nových správ) stopu NEzapisuje", async () => {
    // Hodinový rozvrh = 24 behov denne; zapisovať každý prázdny by z denníka
    // urobil skládku. Preskočenie (vyššie) je iná vec: to je porucha nastavenia.
    mockPull.mockResolvedValue({ ok: true, pulled: 0, posted: 0, errors: [] });
    await GET(req("fixture-cron"));
    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockSkipped).not.toHaveBeenCalled();
  });

  it("beh s novými správami nechá stopu s počtami", async () => {
    mockPull.mockResolvedValue({ ok: true, agencies: 1, pulled: 2, posted: 2, errors: [], alreadySeen: 5, outsideLabel: 0 });
    const res = await GET(req("fixture-cron"));
    expect(res.status).toBe(200);
    expect(mockRecord).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ job: "gmail-inbound-pull", status: "ok", eligible: 2, written: 2, failed: 0 }),
    );
  });

  it("vypršaný token: 503 a stopa s dôvodom (jediný signál, že dopyty prestali chodiť)", async () => {
    mockPull.mockResolvedValue({ ok: false, error: "oauth_refresh_failed:invalid_grant" });
    const res = await GET(req("fixture-cron"));
    expect(res.status).toBe(503);
    expect(mockRecord).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "failed", firstError: "oauth_refresh_failed:invalid_grant" }),
    );
  });

  it("zlyhanie aj zápisu stopy vráti 500, aby chyba nezostala nemá", async () => {
    mockPull.mockResolvedValue({ ok: false, error: "gmail_list_failed" });
    mockRecord.mockResolvedValue("db down");
    expect((await GET(req("fixture-cron"))).status).toBe(500);
  });
});
