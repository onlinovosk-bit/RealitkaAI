// @vitest-environment node
import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  saveConnection: vi.fn(),
  readCiphertext: vi.fn(),
  wipeConnection: vi.fn(),
  rateLimit: vi.fn(),
  incrementUsageMetric: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentProfile: mocks.getCurrentProfile }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/lib/usage-metrics", () => ({ incrementUsageMetric: mocks.incrementUsageMetric }));
vi.mock("@/lib/inbound/gmail-connect-store", () => ({
  saveConnection: mocks.saveConnection,
  readCiphertext: mocks.readCiphertext,
  wipeConnection: mocks.wipeConnection,
}));

import { GET as connect } from "../connect/route";
import { GET as callback } from "../callback/route";
import { POST as disconnect } from "../disconnect/route";
import { decryptToken, encryptToken, signConnectState } from "@/lib/inbound/gmail-connect";

const ORIGIN = "https://crm.test";
const KEY = randomBytes(32);
const SECRET = "s".repeat(40);
const AGENCY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002";
const PROFILE = "pppppppp-pppp-4ppp-8ppp-pppppppp0003";
const owner = { id: PROFILE, agency_id: AGENCY, role: "owner", is_active: true };

const GOOD_TOKEN = { access_token: "a", refresh_token: "1//plain-refresh", scope: "https://www.googleapis.com/auth/gmail.readonly openid email" };

function stubFetch(token: Record<string, unknown> = GOOD_TOKEN, info: Record<string, unknown> = { email: "owner@gmail.com" }) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (url.includes("/token")) return new Response(JSON.stringify(token), { status: 200 });
    if (url.includes("userinfo")) return new Response(JSON.stringify(info), { status: 200 });
    if (url.includes("/revoke")) return new Response("{}", { status: 200 });
    throw new Error(`unexpected:${url}`);
  });
  return calls;
}

const req = (path: string, init?: RequestInit) => new Request(`${ORIGIN}${path}`, init);
const loc = (r: Response) => r.headers.get("location") ?? "";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  mocks.getCurrentProfile.mockResolvedValue(owner);
  mocks.saveConnection.mockResolvedValue({ ok: true });
  mocks.wipeConnection.mockResolvedValue(true);
  mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 9 });
  vi.stubEnv("GOOGLE_GMAIL_INBOUND_CLIENT_ID", "cid");
  vi.stubEnv("GOOGLE_GMAIL_INBOUND_CLIENT_SECRET", "csecret");
  vi.stubEnv("GMAIL_INBOUND_STATE_SECRET", SECRET);
  vi.stubEnv("GMAIL_INBOUND_TOKEN_KEY", KEY.toString("base64"));
  vi.stubEnv("NEXT_PUBLIC_APP_URL", ORIGIN);
});

describe("GET /connect", () => {
  it("prihlásený vlastník ide na Google s agentúrou z profilu (nie z URL)", async () => {
    const r = await connect(req(`/api/integrations/gmail-inbound/connect?agency=${OTHER}`));
    expect(mocks.incrementUsageMetric).toHaveBeenCalledWith({ agencyId: AGENCY, metric: "gmail_connect_started" });
    const u = new URL(loc(r));
    expect(u.host).toBe("accounts.google.com");
    expect(u.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/gmail.readonly openid email");
    const state = u.searchParams.get("state") ?? "";
    expect(Buffer.from(state, "base64url").toString()).toContain(AGENCY);
    expect(Buffer.from(state, "base64url").toString()).not.toContain(OTHER);
  });

  it("neprihlásený ide na login, agent na forbidden, bez konfigurácie späť s chybou", async () => {
    mocks.getCurrentProfile.mockResolvedValue(null);
    expect(loc(await connect(req("/x")))).toContain("/login");
    mocks.getCurrentProfile.mockResolvedValue({ ...owner, role: "agent" });
    expect(loc(await connect(req("/x")))).toContain("/forbidden");
    mocks.getCurrentProfile.mockResolvedValue(owner);
    vi.stubEnv("GMAIL_INBOUND_TOKEN_KEY", "");
    expect(loc(await connect(req("/x")))).toContain("reason=missing_token_key");
  });
});

describe("GET /callback", () => {
  const goodState = () => signConnectState({ agencyId: AGENCY, profileId: PROFILE }, SECRET);
  const cb = (state: string | null, extra = "") =>
    callback(req(`/api/integrations/gmail-inbound/callback?code=abc${state ? `&state=${state}` : ""}${extra}`));

  it("uloží iba ŠIFROVANÝ token pre agentúru prihláseného profilu a účet, ktorý súhlasil", async () => {
    stubFetch();
    const r = await cb(goodState());
    expect(loc(r)).toContain("gmail=connected");
    const arg = mocks.saveConnection.mock.calls[0][0];
    expect(arg.agencyId).toBe(AGENCY);
    expect(arg.gmailUserEmail).toBe("owner@gmail.com");
    expect(arg.ciphertext).not.toContain("plain-refresh");
    expect(decryptToken(arg.ciphertext, KEY)).toBe("1//plain-refresh");
    expect(JSON.stringify(arg)).not.toContain("plain-refresh");
  });

  it("state vydaný inou agentúrou alebo iným profilom sa odmietne a nič sa neuloží", async () => {
    stubFetch();
    const foreignAgency = signConnectState({ agencyId: OTHER, profileId: PROFILE }, SECRET);
    const foreignProfile = signConnectState({ agencyId: AGENCY, profileId: "pppppppp-pppp-4ppp-8ppp-pppppppp0099" }, SECRET);
    for (const st of [foreignAgency, foreignProfile, "garbage", null]) {
      expect(loc(await cb(st))).toContain("reason=invalid_state");
    }
    expect(mocks.saveConnection).not.toHaveBeenCalled();
  });

  it("nadmerný scope z Googlu sa neuloží (gmail.send)", async () => {
    stubFetch({ ...GOOD_TOKEN, scope: `${GOOD_TOKEN.scope} https://www.googleapis.com/auth/gmail.send` });
    expect(loc(await cb(goodState()))).toContain("reason=forbidden_gmail_scope");
    expect(mocks.saveConnection).not.toHaveBeenCalled();
  });

  it("odmietnutie súhlasu používateľom, chýbajúci refresh token a zlyhanie zápisu sa nahlásia bez uloženia tokenu", async () => {
    stubFetch();
    expect(loc(await callback(req("/cb?error=access_denied")))).toContain("reason=access_denied");
    stubFetch({ access_token: "a", scope: GOOD_TOKEN.scope });
    expect(loc(await cb(goodState()))).toContain("reason=refresh_token_missing");
    stubFetch();
    mocks.saveConnection.mockResolvedValue({ ok: false, error: "db_write_failed" });
    expect(loc(await cb(goodState()))).toContain("reason=db_write_failed");
  });

  it("agent bez práv a neprihlásený nepripojia nič", async () => {
    stubFetch();
    mocks.getCurrentProfile.mockResolvedValue({ ...owner, role: "agent" });
    expect(loc(await cb(goodState()))).toContain("/forbidden");
    mocks.getCurrentProfile.mockResolvedValue(null);
    expect(loc(await cb(goodState()))).toContain("/login");
    expect(mocks.saveConnection).not.toHaveBeenCalled();
  });
});

describe("POST /disconnect", () => {
  it("zmaže ciphertext a odvolá token u Googlu", async () => {
    const calls = stubFetch();
    mocks.readCiphertext.mockResolvedValue(encryptToken("1//to-revoke", KEY));
    const r = await disconnect(req("/api/integrations/gmail-inbound/disconnect", { method: "POST" }));
    expect(r.status).toBe(303);
    expect(loc(r)).toContain("gmail=disconnected");
    expect(mocks.wipeConnection).toHaveBeenCalledWith(AGENCY);
    expect(calls.some((c) => c.startsWith("POST") && c.includes("/revoke"))).toBe(true);
  });

  it("lokálne zmazanie prebehne aj keď Google revoke zlyhá alebo kľúč nesedí", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("network");
    });
    mocks.readCiphertext.mockResolvedValue(encryptToken("1//x", randomBytes(32)));
    const r = await disconnect(req("/d", { method: "POST" }));
    expect(loc(r)).toContain("gmail=disconnected");
    expect(mocks.wipeConnection).toHaveBeenCalledOnce();
  });

  it("zlyhané zmazanie sa nikdy nenahlási ako odpojené", async () => {
    stubFetch();
    mocks.readCiphertext.mockResolvedValue(encryptToken("1//x", KEY));
    mocks.wipeConnection.mockResolvedValue(false);
    const r = await disconnect(req("/d", { method: "POST" }));
    expect(loc(r)).toContain("gmail=error");
    expect(loc(r)).not.toContain("gmail=disconnected");
  });

  it("agent a neprihlásený nemôžu odpojiť", async () => {
    mocks.getCurrentProfile.mockResolvedValue({ ...owner, role: "agent" });
    expect(loc(await disconnect(req("/d", { method: "POST" })))).toContain("/forbidden");
    mocks.getCurrentProfile.mockResolvedValue(null);
    expect(loc(await disconnect(req("/d", { method: "POST" })))).toContain("/login");
    expect(mocks.wipeConnection).not.toHaveBeenCalled();
  });
});

describe("brzda a telemetria", () => {
  it("po prekročení limitu sa nič nepripojí ani neodpojí (429)", async () => {
    mocks.rateLimit.mockResolvedValue({ allowed: false, remaining: 0 });
    stubFetch();
    expect((await connect(req("/c"))).status).toBe(429);
    const st = signConnectState({ agencyId: AGENCY, profileId: PROFILE }, SECRET);
    expect((await callback(req(`/cb?code=a&state=${st}`))).status).toBe(429);
    expect((await disconnect(req("/d", { method: "POST" }))).status).toBe(429);
    expect(mocks.saveConnection).not.toHaveBeenCalled();
    expect(mocks.wipeConnection).not.toHaveBeenCalled();
  });

  it("úspešné pripojenie a odpojenie sa započítajú pre agentúru profilu", async () => {
    stubFetch();
    const st = signConnectState({ agencyId: AGENCY, profileId: PROFILE }, SECRET);
    await callback(req(`/cb?code=a&state=${st}`));
    mocks.readCiphertext.mockResolvedValue(null);
    await disconnect(req("/d", { method: "POST" }));
    expect(mocks.incrementUsageMetric).toHaveBeenCalledWith({ agencyId: AGENCY, metric: "gmail_connect" });
    expect(mocks.incrementUsageMetric).toHaveBeenCalledWith({ agencyId: AGENCY, metric: "gmail_disconnect" });
  });

  it("odpojenie s nečakaným parametrom v URL je 400 a nič nezmaže", async () => {
    const r = await disconnect(req("/d?agency=other", { method: "POST" }));
    expect(r.status).toBe(400);
    expect(mocks.wipeConnection).not.toHaveBeenCalled();
  });
});
