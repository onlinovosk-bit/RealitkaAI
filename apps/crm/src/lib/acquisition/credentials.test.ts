import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GOOGLE_ADS_RATE_LIMIT_PER_TENANT,
  GOOGLE_ADS_CREDENTIAL_REF,
  GoogleAdsCredentialsError,
  containsGoogleAdsSecret,
  loadGoogleAdsCredentials,
  normalizeGoogleAdsCustomerId,
  redactGoogleAdsSecrets,
  toGoogleAdsCredentialsPublicMeta,
} from "./credentials";

const FAKE_PRIVATE_KEY =
  "-----BEGIN PRIVATE KEY-----\nTEST_PRIVATE_KEY_MATERIAL_NOT_REAL\n-----END PRIVATE KEY-----\n";

const FAKE_SA_JSON = JSON.stringify({
  type: "service_account",
  client_email: "ads-sa@example-test.iam.gserviceaccount.com",
  private_key: FAKE_PRIVATE_KEY,
});

const FAKE_DEVELOPER_TOKEN = "dev-token-TEST-NEVER-REAL-xyz";

function stubValidEnv(overrides: Record<string, string | undefined> = {}) {
  const env: NodeJS.ProcessEnv = {
    GOOGLE_ADS_DEVELOPER_TOKEN: FAKE_DEVELOPER_TOKEN,
    GOOGLE_ADS_LOGIN_CUSTOMER_ID: "123-456-7890",
    GOOGLE_ADS_SA_KEY_JSON: FAKE_SA_JSON,
    GOOGLE_ADS_RATE_LIMIT_PER_TENANT: "10",
    ...overrides,
  };
  return env;
}

describe("loadGoogleAdsCredentials", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("loads and validates env credentials", () => {
    const creds = loadGoogleAdsCredentials(stubValidEnv());
    expect(creds.developerToken).toBe(FAKE_DEVELOPER_TOKEN);
    expect(creds.loginCustomerId).toBe("1234567890");
    expect(creds.saKeyJson).toBe(FAKE_SA_JSON);
    expect(creds.rateLimitPerTenant).toBe(10);
  });

  it("throws explicit error when a required env value is missing (not silent undefined)", () => {
    const cases = [
      "GOOGLE_ADS_DEVELOPER_TOKEN",
      "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
      "GOOGLE_ADS_SA_KEY_JSON",
    ] as const;

    for (const key of cases) {
      const env = stubValidEnv({ [key]: "" });
      expect(() => loadGoogleAdsCredentials(env)).toThrow(GoogleAdsCredentialsError);
      try {
        loadGoogleAdsCredentials(env);
      } catch (err) {
        expect(err).toBeInstanceOf(GoogleAdsCredentialsError);
        const e = err as GoogleAdsCredentialsError;
        expect(e.code).toBe("MISSING_GOOGLE_ADS_CREDENTIAL");
        expect(e.envName).toBe(key);
        expect(e.message).toContain(key);
        expect(e.message).not.toContain(FAKE_PRIVATE_KEY);
        expect(e.message).not.toContain(FAKE_DEVELOPER_TOKEN);
      }
    }
  });

  it("defaults rate limit to binding value when unset", () => {
    const creds = loadGoogleAdsCredentials(
      stubValidEnv({ GOOGLE_ADS_RATE_LIMIT_PER_TENANT: undefined }),
    );
    expect(creds.rateLimitPerTenant).toBe(DEFAULT_GOOGLE_ADS_RATE_LIMIT_PER_TENANT);
  });

  it("rejects invalid SA JSON without leaking key material", () => {
    const env = stubValidEnv({
      GOOGLE_ADS_SA_KEY_JSON: '{"client_email":"x@y.z"}',
    });
    expect(() => loadGoogleAdsCredentials(env)).toThrow(GoogleAdsCredentialsError);
    try {
      loadGoogleAdsCredentials(env);
    } catch (err) {
      const message = String(err);
      expect(message).not.toMatch(/BEGIN PRIVATE KEY/);
      expect(message).toContain("private_key");
    }
  });

  it("never logs the service account key (console spies)", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);

    const creds = loadGoogleAdsCredentials(stubValidEnv());
    const meta = toGoogleAdsCredentialsPublicMeta(creds);
    console.log("google ads creds ready", meta);
    console.info(JSON.stringify(meta));

    const all = [...log.mock.calls, ...info.mock.calls, ...warn.mock.calls, ...error.mock.calls, ...debug.mock.calls]
      .map((args) => args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "))
      .join("\n");

    expect(containsGoogleAdsSecret(all, creds)).toBe(false);
    expect(all).not.toContain(FAKE_PRIVATE_KEY);
    expect(all).not.toContain(FAKE_DEVELOPER_TOKEN);
    expect(all).not.toContain(FAKE_SA_JSON);
    expect(meta.credentialRef).toBe(GOOGLE_ADS_CREDENTIAL_REF);
  });

  it("redactGoogleAdsSecrets strips secrets from arbitrary text", () => {
    const creds = loadGoogleAdsCredentials(stubValidEnv());
    const leaked = `token=${creds.developerToken}; key=${creds.saKeyJson}`;
    const redacted = redactGoogleAdsSecrets(leaked, creds);
    expect(containsGoogleAdsSecret(redacted, creds)).toBe(false);
    expect(redacted).toContain("[REDACTED_DEVELOPER_TOKEN]");
    expect(redacted).toContain("[REDACTED_SA_KEY_JSON]");
  });

  it("normalizeGoogleAdsCustomerId strips non-digits", () => {
    expect(normalizeGoogleAdsCustomerId("123-456-7890")).toBe("1234567890");
  });
});