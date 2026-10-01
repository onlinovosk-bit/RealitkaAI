import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NBS_ATTRIBUTION_TEXT, NbsAttributionLine } from "../NbsAttributionLine";

describe("NbsAttributionLine", () => {
  it("renders NBS attribution when numeric band is shown", () => {
    const html = renderToStaticMarkup(
      <NbsAttributionLine mutedColor="#64748b" show />,
    );
    expect(html).toContain("Národnej banky Slovenska");
    expect(html).toContain(NBS_ATTRIBUTION_TEXT);
    expect(html).toMatch(/<p[^>]*>/);
  });

  it("omits attribution from DOM when noEstimate / priceSource none", () => {
    const html = renderToStaticMarkup(
      <NbsAttributionLine mutedColor="#64748b" show={false} />,
    );
    expect(html).toBe("");
    expect(html).not.toContain("Národnej banky Slovenska");
  });
});
