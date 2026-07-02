import { describe, it, expect } from "vitest";
import { parseFinStatCsv } from "../lib/finstat.ts";

describe("parseFinStatCsv", () => {
  it("parses standard headers", () => {
    const csv = `ico,nazov,web,kraj,mesto,zamestnanci,konatel,email,telefon
123,RK Test,example.sk,Prešovský,Prešov,5,Peter Novák,info@example.sk,+421900`;
    const rows = parseFinStatCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].ico).toBe("123");
    expect(rows[0].outreach_email).toBe("info@example.sk");
    expect(rows[0].outreach_email_flag).toBe("company");
  });

  it("flags personal email", () => {
    const csv = `ico,nazov,web,kraj,mesto,zamestnanci,konatel,email,telefon
1,Solo,,,,1,XY,a@gmail.com,`;
    const rows = parseFinStatCsv(csv);
    expect(rows[0].outreach_email).toBeNull();
    expect(rows[0].outreach_email_flag).toBe("personal");
  });
});
