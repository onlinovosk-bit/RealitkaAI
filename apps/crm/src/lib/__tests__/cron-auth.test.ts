import { describe, expect, it } from "vitest";
import { isAuthorizedCronBearer } from "@/lib/cron-auth";

function req(authorization: string | null): Pick<Request, "headers"> {
  return {
    headers: {
      get(name: string) {
        if (name.toLowerCase() === "authorization") return authorization;
        return null;
      },
    } as Headers,
  };
}

describe("isAuthorizedCronBearer", () => {
  it("refuses when CRON_SECRET is unset (no Bearer undefined)", () => {
    expect(isAuthorizedCronBearer(req("Bearer undefined"), {})).toBe(false);
    expect(isAuthorizedCronBearer(req(null), {})).toBe(false);
  });

  it("refuses when CRON_SECRET is blank", () => {
    expect(isAuthorizedCronBearer(req("Bearer x"), { CRON_SECRET: "  " })).toBe(false);
  });

  it("refuses wrong bearer", () => {
    expect(
      isAuthorizedCronBearer(req("Bearer wrong"), { CRON_SECRET: "secret" }),
    ).toBe(false);
  });

  it("accepts exact Bearer match", () => {
    expect(
      isAuthorizedCronBearer(req("Bearer secret"), { CRON_SECRET: "secret" }),
    ).toBe(true);
  });
});
