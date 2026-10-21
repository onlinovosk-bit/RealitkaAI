import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildConnectUrl,
  canManageGmailConnection,
  CONNECT_SCOPES,
  decryptToken,
  encryptToken,
  exchangeCodeForConnection,
  GMAIL_READONLY_SCOPE,
  readConnectConfig,
  signConnectState,
  validateGrantedScopes,
  verifyConnectState,
} from "../gmail-connect";

const KEY = randomBytes(32);
const SECRET = "s".repeat(40);
const AGENCY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const PROFILE = "pppppppp-pppp-4ppp-8ppp-pppppppp0002";
const ENV = {
  GOOGLE_GMAIL_INBOUND_CLIENT_ID: "cid",
  GOOGLE_GMAIL_INBOUND_CLIENT_SECRET: "csecret",
  GMAIL_INBOUND_STATE_SECRET: SECRET,
  GMAIL_INBOUND_TOKEN_KEY: KEY.toString("base64"),
  NEXT_PUBLIC_APP_URL: "https://crm.test/",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("šifrovanie tokenu", () => {
  it("round-trip vráti pôvodný token a blob neobsahuje plaintext", () => {
    const blob = encryptToken("1//refresh-token-value", KEY);
    expect(blob).not.toContain("refresh-token-value");
    expect(decryptToken(blob, KEY)).toBe("1//refresh-token-value");
  });

  it("dve šifrovania toho istého tokenu sa líšia (náhodný IV)", () => {
    expect(encryptToken("x", KEY)).not.toBe(encryptToken("x", KEY));
  });

  it("zlý kľúč, zmenený blob aj cudzia verzia zlyhajú nahlas", () => {
    const blob = encryptToken("t", KEY);
    expect(() => decryptToken(blob, randomBytes(32))).toThrow();
    const parts = blob.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptToken(parts.join("."), KEY)).toThrow();
    expect(() => decryptToken(blob.replace(/^v1/, "v9"), KEY)).toThrow("token_blob_invalid");
    expect(() => decryptToken("", KEY)).toThrow();
  });
});

describe("state", () => {
  const T0 = 1_800_000_000_000;

  it("platný state vráti agentúru a profil", () => {
    const st = signConnectState({ agencyId: AGENCY, profileId: PROFILE }, SECRET, T0);
    expect(verifyConnectState(st, SECRET, T0 + 1000)).toEqual({ agencyId: AGENCY, profileId: PROFILE });
  });

  it("expirovaný, podvrhnutý, podpísaný iným tajomstvom, budúci a prázdny state sa odmietne", () => {
    const st = signConnectState({ agencyId: AGENCY, profileId: PROFILE }, SECRET, T0);
    expect(verifyConnectState(st, SECRET, T0 + 16 * 60_000)).toBeNull();
    expect(verifyConnectState(st, "x".repeat(40), T0 + 1000)).toBeNull();
    expect(verifyConnectState(st, SECRET, T0 - 5 * 60_000)).toBeNull();
    expect(verifyConnectState(null, SECRET, T0)).toBeNull();
    expect(verifyConnectState("", SECRET, T0)).toBeNull();
    expect(verifyConnectState("not-base64-::", SECRET, T0)).toBeNull();
    // zámena agentúry v payloade pri zachovanom podpise
    const raw = Buffer.from(st, "base64url").toString("utf8");
    const forged = Buffer.from(raw.replace(AGENCY, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0009"), "utf8").toString("base64url");
    expect(verifyConnectState(forged, SECRET, T0 + 1000)).toBeNull();
  });
});

describe("scopes", () => {
  it("prijme len gmail.readonly (+ openid, email)", () => {
    expect(validateGrantedScopes(`${GMAIL_READONLY_SCOPE} openid email`)).toEqual([GMAIL_READONLY_SCOPE, "openid", "email"]);
    expect(validateGrantedScopes(`${GMAIL_READONLY_SCOPE} https://www.googleapis.com/auth/userinfo.email openid`)).toContain("email");
  });

  it("odmietne nadmerné povolenie aj chýbajúce čítanie", () => {
    for (const bad of ["gmail.send", "gmail.modify", "gmail.compose", "https://mail.google.com/", "https://www.googleapis.com/auth/calendar"]) {
      const scope = bad.startsWith("http") ? bad : `https://www.googleapis.com/auth/${bad}`;
      expect(() => validateGrantedScopes(`${GMAIL_READONLY_SCOPE} ${scope}`)).toThrow("forbidden_gmail_scope");
    }
    expect(() => validateGrantedScopes("openid email")).toThrow("scope_readonly_missing");
    expect(() => validateGrantedScopes(undefined)).toThrow("scope_readonly_missing");
  });

  it("súhlasová URL žiada presne povolené scopy a nič iné", () => {
    const cfg = readConnectConfig(ENV, "https://fallback.test");
    if ("error" in cfg) throw new Error("config");
    const u = new URL(buildConnectUrl(cfg, "st"));
    expect(u.searchParams.get("scope")).toBe(CONNECT_SCOPES.join(" "));
    expect(u.searchParams.get("access_type")).toBe("offline");
    expect(u.searchParams.get("include_granted_scopes")).toBe("false");
    expect(u.searchParams.get("redirect_uri")).toBe("https://crm.test/api/integrations/gmail-inbound/callback");
    expect(u.toString()).not.toMatch(/gmail\.send|gmail\.modify|mail\.google\.com|calendar/);
  });
});

describe("konfigurácia je fail-closed", () => {
  it("bez klienta, bez tajomstva state alebo bez kľúča tokenu sa nič nepripojí", () => {
    expect(readConnectConfig({ ...ENV, GOOGLE_GMAIL_INBOUND_CLIENT_ID: "" }, "")).toEqual({ error: "missing_oauth_env" });
    expect(readConnectConfig({ ...ENV, GMAIL_INBOUND_STATE_SECRET: "short" }, "")).toEqual({ error: "missing_state_secret" });
    expect(readConnectConfig({ ...ENV, GMAIL_INBOUND_TOKEN_KEY: "" }, "")).toEqual({ error: "missing_token_key" });
    expect(readConnectConfig({ ...ENV, GMAIL_INBOUND_TOKEN_KEY: Buffer.from("short").toString("base64") }, "")).toEqual({ error: "missing_token_key" });
    expect("error" in readConnectConfig(ENV, "")).toBe(false);
  });
});

describe("výmena kódu", () => {
  const cfg = readConnectConfig(ENV, "https://crm.test");
  if ("error" in cfg) throw new Error("config");

  function mk(token: Record<string, unknown>, info: Record<string, unknown> = { email: "owner@gmail.com" }) {
    return (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com/token")) return json(token);
      if (url.includes("userinfo")) return json(info);
      throw new Error(`unexpected:${url}`);
    }) as typeof fetch;
  }

  it("úspech vráti refresh token, účet a scopy", async () => {
    const r = await exchangeCodeForConnection(
      cfg,
      "code",
      mk({ access_token: "a", refresh_token: "1//r", scope: `${GMAIL_READONLY_SCOPE} openid email` }),
    );
    expect(r).toEqual({ refreshToken: "1//r", gmailUserEmail: "owner@gmail.com", scopes: [GMAIL_READONLY_SCOPE, "openid", "email"] });
  });

  it("nadmerný scope, chýbajúci refresh token a zlyhaná výmena sa neuložia", async () => {
    await expect(
      exchangeCodeForConnection(cfg, "c", mk({ access_token: "a", refresh_token: "r", scope: `${GMAIL_READONLY_SCOPE} https://www.googleapis.com/auth/gmail.send` })),
    ).rejects.toThrow("forbidden_gmail_scope");
    await expect(
      exchangeCodeForConnection(cfg, "c", mk({ access_token: "a", scope: GMAIL_READONLY_SCOPE })),
    ).rejects.toThrow("refresh_token_missing");
    await expect(
      exchangeCodeForConnection(cfg, "c", (async () => json({ error: "invalid_grant" }, 400)) as typeof fetch),
    ).rejects.toThrow("token_exchange_failed:invalid_grant");
    await expect(
      exchangeCodeForConnection(cfg, "c", mk({ access_token: "a", refresh_token: "r", scope: GMAIL_READONLY_SCOPE }, {})),
    ).rejects.toThrow("userinfo_failed");
  });
});

describe("kto smie spravovať pripojenie", () => {
  it("iba aktívny vlastník alebo manažér s agentúrou", () => {
    expect(canManageGmailConnection({ role: "owner", agency_id: AGENCY, is_active: true })).toBe(true);
    expect(canManageGmailConnection({ role: " Manager ", agency_id: AGENCY, is_active: true })).toBe(true);
    expect(canManageGmailConnection({ role: "agent", agency_id: AGENCY, is_active: true })).toBe(false);
    expect(canManageGmailConnection({ role: "owner", agency_id: null, is_active: true })).toBe(false);
    expect(canManageGmailConnection({ role: "owner", agency_id: AGENCY, is_active: false })).toBe(false);
    expect(canManageGmailConnection(null)).toBe(false);
  });
});
