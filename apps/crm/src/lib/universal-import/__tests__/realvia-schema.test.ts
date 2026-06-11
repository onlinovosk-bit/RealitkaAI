import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  parseRealviaClient,
  parseRealviaJsonPayload,
  parseRealviaJsonText,
} from "@/lib/universal-import/realvia/realvia-schema";

const FIXTURE = resolve(
  __dirname,
  "../__fixtures__/realvia/clients.json",
);

describe("realvia schema", () => {
  it("parses fixture clients array", () => {
    const text = readFileSync(FIXTURE, "utf8");
    const result = parseRealviaJsonText(text);

    expect(result.clients).toHaveLength(6);
    expect(result.warnings.some((w) => w.path.includes("legacyField"))).toBe(true);
  });

  it("tolerates missing optional fields", () => {
    const { client, warnings } = parseRealviaClient({
      owner: {
        name: "Minimal",
        phone: "0901111111",
        type: "zaujemca",
      },
    });

    expect(client?.owner.name).toBe("Minimal");
    expect(client?.owner.notes).toEqual([]);
    expect(client?.owner.inspections).toEqual([]);
    expect(warnings).toHaveLength(0);
  });

  it("normalizes archived and blacklist type", () => {
    const { client } = parseRealviaClient({
      owner: {
        name: "Blocked",
        type: "blacklist",
        archived: "1",
        email: "x@y.sk",
      },
    });

    expect(client?.owner.archived).toBe(1);
    expect(client?.owner.type).toBe("blacklist");
  });

  it("returns warning on invalid payload", () => {
    const result = parseRealviaJsonPayload({ clients: [{ notOwner: true }] });
    expect(result.clients).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("handles root array format", () => {
    const result = parseRealviaJsonPayload([
      { owner: { name: "A", email: "a@b.sk" } },
      { owner: { name: "B", phone: "0902222222" } },
    ]);
    expect(result.clients).toHaveLength(2);
  });
});
