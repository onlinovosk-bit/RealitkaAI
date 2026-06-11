import { describe, expect, it } from "vitest";
import { buildLeadRows } from "@/lib/import/contacts-import-core";

describe("buildLeadRows", () => {
  it("assigns status Nový so cron OPEN_STATUSES picks up new imports", () => {
    const { rows } = buildLeadRows(
      [
        {
          Meno: "Jana",
          Priezvisko: "Adamovičová",
          Email: "jana@example.sk",
          "Telefón": "0905123456",
        },
      ],
      "agency-test-uuid",
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("Nový");
    expect(rows[0]?.status).not.toBe("imported");
  });

  it("flags missing name but still imports when contact info valid", () => {
    const { rows, flags } = buildLeadRows(
      [{ Meno: "", Priezvisko: "", Email: "orphan@example.sk", "Telefón": "0905000001" }],
      "agency-test-uuid",
    );
    expect(rows).toHaveLength(1);
    expect(flags.no_name).toBe(1);
    expect(rows[0]?.note).toContain("no_name");
  });

  it("normalizes international phone to E.164-ish storage", () => {
    const { rows } = buildLeadRows(
      [
        {
          Meno: "Test",
          Priezvisko: "User",
          Email: "test@example.sk",
          "Telefón": "00421905123456",
        },
      ],
      "agency-test-uuid",
    );
    expect(rows[0]?.phone).toMatch(/^\+421/);
  });

  it("dedupes duplicate email within same batch (first wins)", () => {
    const input = [
      { Meno: "A", Priezvisko: "One", Email: "dup@example.sk", "Telefón": "0905111111" },
      { Meno: "B", Priezvisko: "Two", Email: "dup@example.sk", "Telefón": "0905222222" },
    ];
    const { rows } = buildLeadRows(input, "agency-test-uuid");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("A One");
  });

  it("skips rows without valid email or phone", () => {
    const { rows, skipped } = buildLeadRows(
      [{ Meno: "Ghost", Priezvisko: "Row", Email: "", "Telefón": "" }],
      "agency-test-uuid",
    );
    expect(rows).toHaveLength(0);
    expect(skipped[0]?.reason).toBe("no valid email/phone");
  });
});
