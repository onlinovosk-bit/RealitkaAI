import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TeamActionStrip } from "@/components/team/TeamActionStrip";

describe("WP-1 TeamActionStrip: žiadne demo signály", () => {
  it("bez leadov nezobrazí vymyslených maklérov ani eurá", () => {
    const html = renderToStaticMarkup(<TeamActionStrip leads={[]} profiles={[]} />);
    expect(html).not.toMatch(/Horváth|Nováková|18[\s ,.]?400|9[\s ,.]?200/);
    expect(html).not.toMatch(/€/);
    expect(html).toContain("Nevypočítané");
  });
});
