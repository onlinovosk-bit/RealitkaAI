import { describe, it, expect } from "vitest";

import { generateProspectEmail } from "@/lib/ai/prospect-email-generator";

describe("generateProspectEmail", () => {
  it("obsahuje mestá a počet ponúk", () => {
    const body = generateProspectEmail({
      name: "Test RK",
      city: "Bratislava",
      listingsCount: 42,
    });
    expect(body).toContain("Bratislava");
    expect(body).toContain("42");
    expect(body).toContain("Revolis.AI");
  });
});
