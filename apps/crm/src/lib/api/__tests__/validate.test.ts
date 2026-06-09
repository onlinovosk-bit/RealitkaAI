import { describe, expect, it } from "vitest";
import { sanitizeString, validateEmail, validatePhone, validateUUID } from "../validate";

describe("validateUUID", () => {
  it("rejects non-v4 uuid", () => {
    expect(validateUUID("11111111-1111-1111-1111-111111111111")).toBe(false);
  });
  it("accepts v4 uuid", () => {
    expect(validateUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });
});

describe("validateEmail", () => {
  it("accepts valid email", () => {
    expect(validateEmail("test@example.com")).toBe(true);
  });
  it("rejects invalid", () => {
    expect(validateEmail("not-an-email")).toBe(false);
  });
});

describe("validatePhone", () => {
  it("accepts SK mobile", () => {
    expect(validatePhone("+421900123456")).toBe(true);
    expect(validatePhone("0905333444")).toBe(true);
  });
  it("rejects short", () => {
    expect(validatePhone("123")).toBe(false);
  });
});

describe("sanitizeString", () => {
  it("strips angle brackets", () => {
    expect(sanitizeString("<script>")).toBe("script");
  });
});
