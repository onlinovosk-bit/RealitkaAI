import { describe, expect, it } from "vitest";
import robots from "./robots";
import {
  APP_ROBOTS_ALLOW,
  APP_ROBOTS_DISALLOW,
  APP_SITE_ORIGIN,
} from "@/lib/app-robots";

describe("app.revolis.ai robots()", () => {
  it("allows public legal pages and disallows login, auth, dashboard and other app routes", () => {
    const doc = robots();
    const rules = Array.isArray(doc.rules) ? doc.rules[0] : doc.rules;

    expect(rules.userAgent).toBe("*");
    expect(rules.allow).toEqual([...APP_ROBOTS_ALLOW]);
    expect(rules.disallow).toEqual([...APP_ROBOTS_DISALLOW]);
    expect(doc.host).toBe(APP_SITE_ORIGIN);

    expect(APP_ROBOTS_ALLOW).toEqual(
      expect.arrayContaining([
        "/privacy",
        "/privacy-policy",
        "/terms",
        "/cookie-policy",
        "/cookies",
        "/legal",
        "/legal/",
        "/security",
        "/trust-center",
        "/sla",
        "/support",
        "/aup",
        "/dpa-request",
      ]),
    );
    expect(APP_ROBOTS_DISALLOW).toEqual(
      expect.arrayContaining([
        "/login",
        "/register",
        "/auth/",
        "/dashboard",
        "/onboarding",
        "/admin",
        "/api/",
        "/leads",
        "/contacts",
        "/properties",
        "/settings",
        "/billing",
      ]),
    );
  });
});
