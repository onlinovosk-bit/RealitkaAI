import { describe, expect, it } from "vitest";
import {
  detectColumnsFromHeaders,
  detectTargetField,
} from "@/lib/universal-import/column-detector";

describe("[verification] Universal import column detector", () => {
  it("maps Slovak Realvia headers to CRM fields", () => {
    expect(detectTargetField("Meno a priezvisko", ["Ján Novák"]).target).toBe("contact_name");
    expect(detectTargetField("Mobil", ["0903123456"]).target).toBe("phone");
    expect(detectTargetField("e-mail", ["jan@example.sk"]).target).toBe("email");
  });

  it("detects full header row from import sample", () => {
    const headers = ["Meno a priezvisko", "Mobil", "e-mail", "plocha", "xyz_unknown"];
    const rows = [
      {
        "Meno a priezvisko": "Ján Novák",
        Mobil: "0903123456",
        "e-mail": "jan@example.sk",
        plocha: "85 m2",
        xyz_unknown: "foo",
      },
    ];
    const detected = detectColumnsFromHeaders(headers, rows);
    const targets = detected.map((c) => c.target);
    expect(targets).toContain("contact_name");
    expect(targets).toContain("phone");
    expect(targets).toContain("email");
    expect(detected.find((c) => c.originalHeader === "xyz_unknown")?.target).toBe("skip");
  });
});
