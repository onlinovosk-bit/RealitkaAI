// @vitest-environment node
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import RozpisFunkcionalitPage from "../page";
import RozpisFunkcionalit from "@/components/billing/RozpisFunkcionalit";
import { expectMatchesGolden, htmlText, LEGACY_PRICE_TOKEN } from "@/components/marketing/__tests__/golden";

const prev = process.env.PRICING_V2_ENABLED;
afterEach(() => {
  if (prev === undefined) delete process.env.PRICING_V2_ENABLED;
  else process.env.PRICING_V2_ENABLED = prev;
});

describe("/rozpis-funkcionalit: gating cien podľa PRICING_V2_ENABLED", () => {
  it("vypnuté (predvolené): výstup zhodný bajt po bajte s pôvodným komponentom (49/99/199/449 € ostávajú)", () => {
    delete process.env.PRICING_V2_ENABLED;
    const html = renderToStaticMarkup(RozpisFunkcionalitPage());
    expect(html).toBe(renderToStaticMarkup(<RozpisFunkcionalit />));
    expectMatchesGolden(
      path.resolve(__dirname, "../../../../components/billing/__tests__"),
      "rozpis-funkcionalit-legacy",
      html,
    );
  });

  it.each(["false", "0", "off", ""])("hodnota %j = vypnuté", (v) => {
    process.env.PRICING_V2_ENABLED = v;
    expect(renderToStaticMarkup(RozpisFunkcionalitPage())).toBe(renderToStaticMarkup(<RozpisFunkcionalit />));
  });

  it.each(["true", "1", "on"])("zapnuté (%s): žiadne zastarané ceny", (v) => {
    process.env.PRICING_V2_ENABLED = v;
    const text = htmlText(renderToStaticMarkup(RozpisFunkcionalitPage()));
    expect(text).not.toMatch(LEGACY_PRICE_TOKEN);
    expect(text).not.toContain("€");
  });
});
