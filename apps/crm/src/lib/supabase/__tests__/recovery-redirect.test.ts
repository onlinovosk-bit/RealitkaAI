import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getPasswordRecoveryRedirectUrl, getRecoveryCodeCallbackPath } from "../recovery-redirect";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

describe("recovery redirect", () => {
  it("points the reset email at the server-side callback", () => {
    expect(getPasswordRecoveryRedirectUrl("https://app.revolis.ai/")).toBe(
      "https://app.revolis.ai/auth/callback?next=/reset-password",
    );
  });

  it("encodes the legacy ?code= into a callback path without leaking it into next", () => {
    expect(getRecoveryCodeCallbackPath("a b&c=d")).toBe(
      "/auth/callback?code=a%20b%26c%3Dd&next=%2Freset-password",
    );
  });

  it("forgot-password uses the helper and reset-password no longer exchanges the code on the client", () => {
    const forgot = read("src/app/forgot-password/page.tsx");
    const reset = read("src/app/reset-password/page.tsx");
    expect(forgot).toContain("getPasswordRecoveryRedirectUrl()");
    expect(forgot).not.toContain("/reset-password`");
    expect(reset).toContain("getRecoveryCodeCallbackPath(code)");
    expect(reset).not.toContain("exchangeCodeForSession");
  });
});
