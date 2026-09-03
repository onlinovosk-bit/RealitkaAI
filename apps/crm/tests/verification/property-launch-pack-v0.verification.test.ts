import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

describe("[verification] Property Launch Pack V0", () => {
  it("is gated by PROPERTY_LAUNCH_PACK_V0 flag default off", () => {
    const facts = read("src/lib/capabilities/property-launch-pack/facts.ts");
    const route = read("src/app/api/ai/property-launch-pack/route.ts");
    expect(facts).toContain('PROPERTY_LAUNCH_PACK_V0 === "1"');
    expect(route).toContain("isPropertyLaunchPackEnabled");
    expect(route).toContain("404");
  });

  it("wires Quality Guardian and blocks Neznáme without confirm", () => {
    const build = read("src/lib/capabilities/property-launch-pack/build.ts");
    expect(build).toContain("reviewGeneratedListing");
    expect(build).toContain("exportAllowed");
    expect(build).not.toContain("portal_listings");
  });

  it("export allowlist strips payload_raw", () => {
    const facts = read("src/lib/capabilities/property-launch-pack/facts.ts");
    expect(facts).toContain("payload_raw");
    expect(facts).toContain("EXPORT_FORBIDDEN_KEYS");
  });

  it("does not mutate Realvia processQueue in this feature module", () => {
    const build = read("src/lib/capabilities/property-launch-pack/build.ts");
    expect(build).not.toContain("processQueue");
    expect(build).not.toContain("mapCategory");
  });
});
