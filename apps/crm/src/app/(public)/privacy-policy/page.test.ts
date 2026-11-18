import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "page.tsx"), "utf8");

describe("/privacy-policy metadata", () => {
  it("uses the Slovak privacy title and description", () => {
    expect(src).toContain('title: "Ochrana osobných údajov | Revolis.ai"');
    expect(src).toContain(
      'description: "Zásady ochrany osobných údajov služby Revolis.ai pre realitných maklérov."',
    );
  });
});
