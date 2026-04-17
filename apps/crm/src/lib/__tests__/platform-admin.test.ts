import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { isPlatformOwnerEmail, parsePlatformOwnerEmails } from "@/lib/platform-admin";

describe("platform-admin", () => {
  const prev = process.env.PLATFORM_OWNER_EMAILS;

  beforeEach(() => {
    process.env.PLATFORM_OWNER_EMAILS = "owner@a.com, Other@b.com";
  });

  afterEach(() => {
    process.env.PLATFORM_OWNER_EMAILS = prev;
  });

  it("parsePlatformOwnerEmails normalizuje na lower case", () => {
    expect(parsePlatformOwnerEmails()).toEqual(["owner@a.com", "other@b.com"]);
  });

  it("isPlatformOwnerEmail sedí na presný zoznam", () => {
    expect(isPlatformOwnerEmail("owner@a.com")).toBe(true);
    expect(isPlatformOwnerEmail("OTHER@B.COM")).toBe(true);
    expect(isPlatformOwnerEmail("nope@x.com")).toBe(false);
  });
});
