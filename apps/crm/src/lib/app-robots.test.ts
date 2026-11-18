import { describe, expect, it } from "vitest";
import { APP_ROBOTS_ALLOW, APP_ROBOTS_DISALLOW, APP_SITE_ORIGIN } from "./app-robots";

describe("APP_ROBOTS policy", () => {
  it("keeps legal pages allowed and authenticated prefixes disallowed", () => {
    expect(APP_SITE_ORIGIN).toBe("https://app.revolis.ai");
    expect(APP_ROBOTS_ALLOW).toContain("/privacy");
    expect(APP_ROBOTS_ALLOW).toContain("/privacy-policy");
    expect(APP_ROBOTS_ALLOW).toContain("/terms");
    expect(APP_ROBOTS_DISALLOW).toContain("/login");
    expect(APP_ROBOTS_DISALLOW).toContain("/dashboard");
    expect(APP_ROBOTS_DISALLOW).toContain("/auth/");
  });
});
