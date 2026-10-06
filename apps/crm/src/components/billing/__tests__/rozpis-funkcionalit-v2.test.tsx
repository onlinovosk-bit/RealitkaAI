// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RozpisFunkcionalit from "../RozpisFunkcionalit";
import { expectMatchesGolden, htmlText, LEGACY_PRICE_TOKEN } from "@/components/marketing/__tests__/golden";

describe("RozpisFunkcionalit: vypnutý prepínač", () => {
  it("bez propu je výstup zhodný bajt po bajte s pôvodným (golden z commitu 4e57283)", () => {
    expectMatchesGolden(__dirname, "rozpis-funkcionalit-legacy", renderToStaticMarkup(<RozpisFunkcionalit />));
  });
});

describe("RozpisFunkcionalit: zapnutý prepínač (hidePrices)", () => {
  const html = renderToStaticMarkup(<RozpisFunkcionalit hidePrices />);
  const text = htmlText(html);

  it("neukazuje zastarané ceny 49/99/199/449 € ani žiadnu sumu v €", () => {
    expect(text).not.toMatch(LEGACY_PRICE_TOKEN);
    expect(text).not.toContain("€");
    expect(text).not.toContain("/ mes");
  });
  it("ostáva tabuľka funkcií (názvy programov, riadky) a odkaz na Predplatné", () => {
    expect(text).toContain("Smart Start");
    expect(text).toContain("Protocol Authority");
    expect(text).toContain("SLA uptime garancia");
    expect(html).toContain('href="/billing"');
    expect(text).toContain("Aktuálne ceny a pásma nájdete");
  });
  it("hidePrices=false je zhodné s pôvodným výstupom", () => {
    expectMatchesGolden(__dirname, "rozpis-funkcionalit-legacy", renderToStaticMarkup(<RozpisFunkcionalit hidePrices={false} />));
  });
});
