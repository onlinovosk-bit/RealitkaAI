import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { verifyCalendlySignature } from "../calendly-verify";

describe("verifyCalendlySignature", () => {
  it("accepts valid HMAC signature", () => {
    const key = "whsec_test";
    const body = '{"event":"invitee.created","payload":{}}';
    const t = String(Math.floor(Date.now() / 1000));
    const v1 = crypto.createHmac("sha256", key).update(`${t}.${body}`).digest("hex");
    expect(verifyCalendlySignature(body, `t=${t},v1=${v1}`, key)).toBe(true);
  });

  it("rejects tampered body", () => {
    const key = "whsec_test";
    const body = '{"event":"invitee.created"}';
    const t = String(Math.floor(Date.now() / 1000));
    const v1 = crypto.createHmac("sha256", key).update(`${t}.${body}`).digest("hex");
    expect(verifyCalendlySignature(body + "x", `t=${t},v1=${v1}`, key)).toBe(false);
  });

  it("rejects missing header", () => {
    expect(verifyCalendlySignature("{}", null, "key")).toBe(false);
  });
});
