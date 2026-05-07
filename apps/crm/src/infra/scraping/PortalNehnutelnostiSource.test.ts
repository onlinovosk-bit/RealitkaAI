import { describe, expect, it, vi, afterEach } from "vitest";

import { PortalNehnutelnostiSource } from "@/infra/scraping/PortalNehnutelnostiSource";

describe("PortalNehnutelnostiSource", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps agency cards from nehnutelnosti.sk HTML into discovered agencies", async () => {
    const html = `
      <a href="/realitna-kancelaria/123e4567-e89b-12d3-a456-426614174000/revolis-reality/">
        <h3>Revolis Reality</h3>
        <p>Hlavna 12, Bratislava</p>
        <span>Na predaj: 12</span>
        <span>Na prenájom: 3</span>
      </a>
    `;

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => html,
    } as Response);

    const source = new PortalNehnutelnostiSource(1);
    const agencies = await source.discoverNewAgencies();

    expect(agencies).toEqual([
      {
        externalId: "123e4567-e89b-12d3-a456-426614174000",
        name: "Revolis Reality",
        website:
          "https://www.nehnutelnosti.sk/realitna-kancelaria/123e4567-e89b-12d3-a456-426614174000/revolis-reality/",
        email: null,
        phone: null,
        city: "Bratislava",
        country: "SK",
        portal: "nehnutelnosti.sk",
        listingsCount: 15,
      },
    ]);
  });

  it("stops discovery when a page has no agency cards", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "<main>No agencies</main>",
    } as Response);

    const source = new PortalNehnutelnostiSource(3);
    const agencies = await source.discoverNewAgencies();

    expect(agencies).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
