import { describe, expect, it, vi } from "vitest";
import {
  isSelfServeSignupEnabled,
  parsePlanIntent,
  postSignupDestination,
  provisionAfterEmailConfirmed,
  resolvePostConfirmUrl,
  selfServeTrialCredits,
  selfServeTrialDays,
  validateSelfServeForm,
} from "../self-serve";
import { resolveTrialEndMs } from "../../saas-ops";

function form(over: Record<string, string> = {}) {
  const f = new FormData();
  const base: Record<string, string> = {
    email: "Jana@Example.sk",
    password: "heslo1234",
    fullName: "Jana Nováková",
    phone: "+421900000000",
    agencyName: "Nová Reality",
    plan: "team",
    consent: "on",
    website: "",
  };
  for (const [k, v] of Object.entries({ ...base, ...over })) if (v !== "__omit__") f.set(k, v);
  return f;
}

const ON = { SELF_SERVE_SIGNUP_ENABLED: "true" };
const confirmedUser = {
  id: "u1",
  email_confirmed_at: "2026-10-06T10:00:00Z",
  user_metadata: { self_serve_signup: true, full_name: "J", agency_name: "A", plan_intent: "team", consent_version: "2026-10-06" },
};

describe("flag", () => {
  it("je predvolene vypnutý a zapína ho len výslovné true/1/on", () => {
    expect(isSelfServeSignupEnabled({})).toBe(false);
    for (const v of ["", "false", "0", "off", "yes", "enabled"]) {
      expect(isSelfServeSignupEnabled({ SELF_SERVE_SIGNUP_ENABLED: v })).toBe(false);
    }
    for (const v of ["true", "1", "on", " TRUE "]) {
      expect(isSelfServeSignupEnabled({ SELF_SERVE_SIGNUP_ENABLED: v })).toBe(true);
    }
  });
  it("trial: dni orezané 0–60 a predvolené 14, kredity predvolene 0 a max 200", () => {
    expect(selfServeTrialDays({})).toBe(14);
    expect(selfServeTrialDays({ APP_TRIAL_DAYS: "9999" })).toBe(60);
    expect(selfServeTrialDays({ APP_TRIAL_DAYS: "-5" })).toBe(0);
    expect(selfServeTrialDays({ APP_TRIAL_DAYS: "abc" })).toBe(14);
    expect(selfServeTrialCredits({})).toBe(0);
    expect(selfServeTrialCredits({ SELF_SERVE_TRIAL_CREDITS: "999999" })).toBe(200);
    expect(selfServeTrialCredits({ SELF_SERVE_TRIAL_CREDITS: "-3" })).toBe(0);
    expect(selfServeTrialCredits({ SELF_SERVE_TRIAL_CREDITS: "x" })).toBe(0);
  });
});

describe("validateSelfServeForm", () => {
  it("platný formulár: e-mail malými, plán rozpoznaný", () => {
    const r = validateSelfServeForm(form());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.email).toBe("jana@example.sk");
      expect(r.value.planIntent).toBe("team");
    }
  });
  it("honeypot, chýbajúci súhlas, zlý e-mail, slabé heslo, krátke meno", () => {
    expect(validateSelfServeForm(form({ website: "http://spam" }))).toEqual({ ok: false, code: "bot" });
    expect(validateSelfServeForm(form({ consent: "__omit__" }))).toEqual({ ok: false, code: "consent_required" });
    expect(validateSelfServeForm(form({ email: "nie-email" }))).toEqual({ ok: false, code: "invalid_email" });
    expect(validateSelfServeForm(form({ password: "krátke" }))).toEqual({ ok: false, code: "weak_password" });
    expect(validateSelfServeForm(form({ fullName: "J" }))).toEqual({ ok: false, code: "invalid_name" });
  });
  it("neznámy plán sa zahodí, nezlyhá", () => {
    const r = validateSelfServeForm(form({ plan: "enterprise-free" }));
    expect(r.ok && r.value.planIntent).toBe(null);
    expect(parsePlanIntent("network")).toBe("network");
    expect(parsePlanIntent(undefined)).toBe(null);
  });
});

describe("provisionAfterEmailConfirmed", () => {
  const admin = (data: unknown, error: { message: string } | null = null) =>
    ({ rpc: vi.fn().mockResolvedValue({ data, error }) }) as never;

  it("vlajka vypnutá → nič nezavolá", async () => {
    const a = admin({ ok: true });
    const r = await provisionAfterEmailConfirmed(confirmedUser, { env: {}, admin: a });
    expect(r).toEqual({ ok: true, skipped: true });
    expect((a as { rpc: ReturnType<typeof vi.fn> }).rpc).not.toHaveBeenCalled();
  });
  it("užívateľ bez self-serve metadát (reset hesla, pozvaný) → preskočené", async () => {
    const a = admin({ ok: true });
    const r = await provisionAfterEmailConfirmed({ ...confirmedUser, user_metadata: {} }, { env: ON, admin: a });
    expect(r).toEqual({ ok: true, skipped: true });
    expect((a as { rpc: ReturnType<typeof vi.fn> }).rpc).not.toHaveBeenCalled();
  });
  it("neoverený e-mail → chyba, RPC sa nevolá", async () => {
    const a = admin({ ok: true });
    const r = await provisionAfterEmailConfirmed({ ...confirmedUser, email_confirmed_at: null }, { env: ON, admin: a });
    expect(r).toEqual({ ok: false, error: "email_not_confirmed" });
    expect((a as { rpc: ReturnType<typeof vi.fn> }).rpc).not.toHaveBeenCalled();
  });
  it("chýba service role klient → fail-closed", async () => {
    const r = await provisionAfterEmailConfirmed(confirmedUser, { env: ON, admin: null });
    expect(r).toEqual({ ok: false, error: "unavailable" });
  });
  it("volá bootstrap s orezanými hodnotami trialu a bez dôvery v klientske čísla", async () => {
    const a = admin({ ok: true, created: true, agency_id: "ag1" });
    const r = await provisionAfterEmailConfirmed(confirmedUser, {
      env: { ...ON, APP_TRIAL_DAYS: "500", SELF_SERVE_TRIAL_CREDITS: "5000" },
      admin: a,
    });
    expect(r).toEqual({ ok: true, created: true, agencyId: "ag1" });
    const call = (a as { rpc: ReturnType<typeof vi.fn> }).rpc.mock.calls[0];
    expect(call[0]).toBe("bootstrap_self_serve_agency");
    expect(call[1]).toMatchObject({ p_auth_user_id: "u1", p_trial_days: 60, p_trial_credits: 200, p_plan_intent: "team" });
  });
  it("chyba DB / odmietnutie SQL funkcie sa premietne ako neúspech", async () => {
    expect(await provisionAfterEmailConfirmed(confirmedUser, { env: ON, admin: admin(null, { message: "boom" }) })).toEqual({
      ok: false,
      error: "unavailable",
    });
    expect(
      await provisionAfterEmailConfirmed(confirmedUser, { env: ON, admin: admin({ ok: false, error: "invite_exists" }) }),
    ).toEqual({ ok: false, error: "invite_exists" });
  });
});

describe("resolvePostConfirmUrl", () => {
  const origin = new URL("https://app.revolis.ai/auth/callback");
  const dflt = new URL("https://app.revolis.ai/reset-password");
  it("ne-signup toky ostávajú na pôvodnej adrese", async () => {
    expect(await resolvePostConfirmUrl(origin, { id: "u", user_metadata: {} }, dflt, { env: ON })).toBe(dflt);
    expect(await resolvePostConfirmUrl(origin, null, dflt)).toBe(dflt);
  });
  it("úspešný signup s plánom → /upgrade?plan=, bez plánu → onboarding", async () => {
    const ok = { rpc: vi.fn().mockResolvedValue({ data: { ok: true, created: true, agency_id: "a" }, error: null }) } as never;
    const u = await resolvePostConfirmUrl(origin, confirmedUser, dflt, { env: ON, admin: ok });
    expect(u.pathname + u.search).toBe("/upgrade?plan=team");
    const noPlan = { ...confirmedUser, user_metadata: { ...confirmedUser.user_metadata, plan_intent: null } };
    const u2 = await resolvePostConfirmUrl(origin, noPlan, dflt, { env: ON, admin: ok });
    expect(u2.pathname).toBe("/onboarding/step-1-vitaj");
    expect(postSignupDestination("zle")).toBe("/onboarding/step-1-vitaj");
  });
  it("zlyhanie bootstrapu → späť na /register s chybou", async () => {
    const u = await resolvePostConfirmUrl(origin, confirmedUser, dflt, { env: ON, admin: null });
    expect(u.pathname).toBe("/register");
    expect(u.searchParams.get("error")).toContain("kanceláriu");
  });
});

describe("resolveTrialEndMs", () => {
  const now = Date.parse("2026-10-06T12:00:00Z");
  it("trial agentúry má prednosť pred vekom auth účtu", () => {
    const end = resolveTrialEndMs({ agencyTrialEndsAt: "2026-10-20T12:00:00Z", userCreatedAt: "2026-01-01T00:00:00Z", trialDays: 14, nowMs: now });
    expect(end).toBe(Date.parse("2026-10-20T12:00:00Z"));
  });
  it("bez trial_ends_at platí historické odvodenie; neplatný dátum tiež", () => {
    const legacy = resolveTrialEndMs({ agencyTrialEndsAt: null, userCreatedAt: "2026-10-01T00:00:00Z", trialDays: 14, nowMs: now });
    expect(legacy).toBe(Date.parse("2026-10-15T00:00:00Z"));
    expect(resolveTrialEndMs({ agencyTrialEndsAt: "nonsense", userCreatedAt: "2026-10-01T00:00:00Z", trialDays: 14, nowMs: now })).toBe(legacy);
    expect(resolveTrialEndMs({ agencyTrialEndsAt: undefined, userCreatedAt: undefined, trialDays: 14, nowMs: now })).toBe(now + 14 * 86400000);
  });
});
