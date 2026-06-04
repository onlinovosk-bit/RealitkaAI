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
});
