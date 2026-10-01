import { describe, expect, it } from "vitest";
import { describeError } from "../log-safe";

describe("describeError", () => {
  it("vráti iba názov a správu Error", () => {
    expect(describeError(new TypeError("zle"))).toBe("TypeError: zle");
  });

  it("zahodí `details` z PostgREST chyby (tam Postgres vypisuje celý riadok)", () => {
    const pg = {
      message: 'null value in column "agency_id" violates not-null constraint',
      details: "Failing row contains (a1, null, Jan Novak, jan@example.sk, +421900123456)",
      hint: null,
      code: "23502",
    };
    const out = describeError(pg);
    expect(out).toContain("violates not-null");
    expect(out).not.toContain("jan@example.sk");
    expect(out).not.toContain("Novak");
    expect(out).not.toContain("+421");
  });

  it("zvládne nie-chyby a dlhé správy", () => {
    expect(describeError(undefined)).toBe("non-error (undefined)");
    expect(describeError({ foo: "jan@example.sk" })).toBe("non-error (object)");
    expect(describeError("x".repeat(1000)).length).toBe(300);
  });
});

import fs from "node:fs";
import path from "node:path";

describe("príjem leadov loguje cez describeError, nie celý objekt chyby", () => {
  const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

  it("acquire/email a inbound-lead-triage", () => {
    const route = read("src/app/api/acquire/email/route.ts");
    const triage = read("src/lib/acquire/inbound-lead-triage.ts");
    expect(route).toContain('console.error("[acquire.email]", describeError(e))');
    expect(route).not.toContain('console.error("[acquire.email]", e)');
    expect(triage).toContain("describeError(triageError)");
    expect(triage).not.toMatch(/best-effort failed:",\s*triageError\)/);
  });
});

describe("describeError maskuje adresy a čísla aj v samotnej správe", () => {
  it("SMTP chyba s adresou príjemcu", () => {
    const out = describeError(new Error("Recipient rejected: <jan.novak+x@firma.sk> 550 5.1.1"));
    expect(out).not.toContain("jan.novak");
    expect(out).not.toContain("firma.sk");
    expect(out).toContain("[e-mail]");
  });

  it("telefónne číslo v správe", () => {
    expect(describeError("zlyhalo pre +421 900 123 456")).not.toContain("900 123");
    expect(describeError("HTTP 500 po 12 ms")).toBe("HTTP 500 po 12 ms");
  });
});
