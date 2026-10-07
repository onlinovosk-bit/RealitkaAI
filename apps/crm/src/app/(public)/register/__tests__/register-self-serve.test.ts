import { beforeEach, describe, expect, it, vi } from "vitest";

const signUp = vi.fn();
const from = vi.fn();
const rate = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signUp }, from }) }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: (...a: unknown[]) => rate(...a) }));
vi.mock("@/lib/send-onboarding-email", () => ({ sendOnboardingEmail: vi.fn() }));

import { register } from "../actions";

function form(over: Record<string, string> = {}) {
  const f = new FormData();
  const base: Record<string, string> = {
    email: "jana@example.sk",
    password: "heslo1234",
    fullName: "Jana Nováková",
    agencyName: "Nová Reality",
    plan: "start",
    consent: "on",
    website: "",
  };
  for (const [k, v] of Object.entries({ ...base, ...over })) f.set(k, v);
  return f;
}
const run = async (f: FormData) => {
  try {
    await register(f);
  } catch (e) {
    return (e as Error).message;
  }
  return "no-redirect";
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SELF_SERVE_SIGNUP_ENABLED = "true";
  rate.mockResolvedValue({ allowed: true, remaining: 5 });
  signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("register (SELF_SERVE_SIGNUP_ENABLED=true)", () => {
  it("platná registrácia: iba auth.signUp s metadátami, žiadny zápis do tabuliek, redirect na 'sent'", async () => {
    const out = await run(form());
    expect(out).toMatch(/^REDIRECT:\/register\?sent=1/);
    expect(from).not.toHaveBeenCalled();
    const arg = signUp.mock.calls[0][0];
    expect(arg.email).toBe("jana@example.sk");
    expect(arg.options.data).toMatchObject({ self_serve_signup: true, agency_name: "Nová Reality", plan_intent: "start", consent_version: "2026-10-06" });
    expect(arg.options.emailRedirectTo).toContain("/auth/callback");
  });
  it("honeypot: tvári sa ako úspech, ale nevolá signUp", async () => {
    expect(await run(form({ website: "spam" }))).toBe("REDIRECT:/register?sent=1");
    expect(signUp).not.toHaveBeenCalled();
  });
  it("bez súhlasu sa nevolá signUp", async () => {
    const f = form();
    f.delete("consent");
    expect(await run(f)).toMatch(/^REDIRECT:\/register\?error=/);
    expect(signUp).not.toHaveBeenCalled();
  });
  it("rate limit (IP aj e-mail) blokuje pred signUp; IP je prvý prvok x-forwarded-for", async () => {
    rate.mockResolvedValue({ allowed: false, remaining: 0 });
    expect(await run(form())).toMatch(/^REDIRECT:\/register\?error=/);
    expect(signUp).not.toHaveBeenCalled();
    expect(rate.mock.calls.map((c) => c[0])).toContain("signup:ip:1.2.3.4");
  });
  it("existujúci e-mail dostane rovnakú odpoveď ako nový (bez vyzvedania účtov)", async () => {
    signUp.mockResolvedValue({ data: {}, error: { message: "User already registered" } });
    expect(await run(form())).toMatch(/^REDIRECT:\/register\?sent=1/);
  });
  it("iná chyba Auth → všeobecná chyba, nie surový text", async () => {
    signUp.mockResolvedValue({ data: {}, error: { message: "internal secret detail" } });
    const out = await run(form());
    expect(out).toMatch(/^REDIRECT:\/register\?error=/);
    expect(decodeURIComponent(out)).not.toContain("secret");
  });
});

describe("register (vlajka vypnutá = pôvodné správanie)", () => {
  it("nevolá self-serve cestu: signUp s e-mailom a heslom bez metadát", async () => {
    process.env.SELF_SERVE_SIGNUP_ENABLED = "false";
    from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    });
    await run(form());
    expect(signUp.mock.calls[0][0]).toEqual({ email: "jana@example.sk", password: "heslo1234" });
  });
});
