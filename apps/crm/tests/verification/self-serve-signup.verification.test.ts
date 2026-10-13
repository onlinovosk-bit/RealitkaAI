/**
 * Samoobslužná 14-dňová skúška: CRM ostáva fail-closed, kým founder nezapne vlajku.
 * Marketing predvolene posiela nákupné CTA na /register; táto stránka nesmie
 * pri vypnutej vlajke sľubovať funkčný trial.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isSelfServeSignupEnabled,
  selfServeTrialCredits,
  selfServeTrialDays,
} from "@/lib/signup/self-serve";

const PAGE = readFileSync(join(__dirname, "../../src/app/(public)/register/page.tsx"), "utf8");

describe("[verification] self-serve signup gating", () => {
  it("SELF_SERVE_SIGNUP_ENABLED je predvolene vypnutý (len true/1/on)", () => {
    expect(isSelfServeSignupEnabled({})).toBe(false);
    expect(isSelfServeSignupEnabled({ SELF_SERVE_SIGNUP_ENABLED: "false" })).toBe(false);
    expect(isSelfServeSignupEnabled({ SELF_SERVE_SIGNUP_ENABLED: "true" })).toBe(true);
  });

  it("trial bez karty: 14 dní, kredity predvolene 0 (žiadny grant bez GO)", () => {
    expect(selfServeTrialDays({})).toBe(14);
    expect(selfServeTrialCredits({})).toBe(0);
  });

  it("vypnutá vlajka: /register je zatvorená stránka s ukážkou, nie rozbitý formulár", () => {
    expect(PAGE).toContain("Skúška nie je otvorená");
    expect(PAGE).toContain("Dohodnite si ukážku");
    expect(PAGE).toContain("Samoobslužná 14-dňová skúška nie je práve otvorená");
    expect(PAGE).toContain('selfServe ? "Registrácia"');
    expect(PAGE).toContain("Vytvoriť účet");
    expect(PAGE).toContain("Prihláste sa");
    expect(PAGE).not.toContain("Už máš účet");
  });
});
