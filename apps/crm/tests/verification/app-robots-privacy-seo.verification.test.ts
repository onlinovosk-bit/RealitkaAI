import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../../../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("app.revolis.ai privacy SEO and robots", () => {
  it("sets Slovak privacy metadata on both legal privacy routes", () => {
    const privacy = read("apps/crm/src/app/(public)/privacy/page.tsx");
    const policy = read("apps/crm/src/app/(public)/privacy-policy/page.tsx");
    const title = 'title: "Ochrana osobných údajov | Revolis.ai"';
    const description =
      'description: "Zásady ochrany osobných údajov služby Revolis.ai pre realitných maklérov."';

    expect(privacy).toContain(title);
    expect(privacy).toContain(description);
    expect(policy).toContain(title);
    expect(policy).toContain(description);
  });

  it("ships App Router robots.ts with legal allow and authenticated disallow", () => {
    const robots = read("apps/crm/src/app/robots.ts");
    const policy = read("apps/crm/src/lib/app-robots.ts");

    expect(robots).toContain("MetadataRoute.Robots");
    expect(policy).toContain('"/privacy"');
    expect(policy).toContain('"/privacy-policy"');
    expect(policy).toContain('"/terms"');
    expect(policy).toContain('"/login"');
    expect(policy).toContain('"/dashboard"');
    expect(policy).toContain('"/auth/"');
    expect(policy).toContain("https://app.revolis.ai");
  });
});
