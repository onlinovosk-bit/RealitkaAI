import * as cheerio from "cheerio";
import type { DiscoveredAgency, AgencyDiscoverySource } from "@/domain/agency/AgencyDiscovery";

const BASE_URL = "https://www.nehnutelnosti.sk";
const DIRECTORY_PATH = "/realitne-kancelarie";
const DEFAULT_MAX_PAGES = 10;
const REQUEST_DELAY_MS = 1200;

export class PortalNehnutelnostiSource implements AgencyDiscoverySource {
  readonly name = "nehnutelnosti.sk";

  constructor(private readonly maxPages: number = DEFAULT_MAX_PAGES) {}

  async discoverNewAgencies(): Promise<DiscoveredAgency[]> {
    const results: DiscoveredAgency[] = [];

    for (let page = 1; page <= this.maxPages; page++) {
      const url =
        page === 1
          ? `${BASE_URL}${DIRECTORY_PATH}/`
          : `${BASE_URL}${DIRECTORY_PATH}/?page=${page}`;

      const batch = await this.fetchPage(url);
      if (!batch.length) break;

      results.push(...batch);

      if (page < this.maxPages) {
        await sleep(REQUEST_DELAY_MS);
      }
    }

    return results;
  }

  private async fetchPage(url: string): Promise<DiscoveredAgency[]> {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RevolisAI/1.0; +https://revolis.ai)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "sk-SK,sk;q=0.9",
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    return this.parseAgencies(html);
  }

  private parseAgencies(html: string): DiscoveredAgency[] {
    const $ = cheerio.load(html);
    const agencies: DiscoveredAgency[] = [];

    $('a[href*="/realitna-kancelaria/"]').each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const externalId = extractUuid(href);
      if (!externalId) return;

      const name = $(el).find("h3").first().text().trim();
      if (!name) return;

      const addressText = $(el)
        .find("p")
        .filter((_, p) => {
          const t = $(p).text();
          return (
            t.includes(",") &&
            !t.includes("ponúk") &&
            !t.includes("ponuky") &&
            !t.includes("maklérov")
          );
        })
        .first()
        .text()
        .trim();

      const city = extractCity(addressText);
      const listingsCount = extractListingsCount($(el).text());

      const rawPath = href.startsWith("http")
        ? new URL(href).pathname
        : href;

      agencies.push({
        externalId,
        name,
        website: `${BASE_URL}${rawPath}`,
        email: null,
        phone: null,
        city: city || null,
        country: "SK",
        portal: "nehnutelnosti.sk",
        listingsCount,
      });
    });

    return agencies;
  }
}

function extractUuid(href: string): string | null {
  const match = href.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  return match?.[1] ?? null;
}

function extractCity(address: string): string {
  if (!address) return "";
  const parts = address.split(",");
  return parts[parts.length - 1].trim();
}

function extractListingsCount(text: string): number {
  let total = 0;
  const forSale = text.match(/Na predaj:\s*(\d+)/);
  if (forSale) total += parseInt(forSale[1], 10);
  const forRent = text.match(/Na prenájom:\s*(\d+)/);
  if (forRent) total += parseInt(forRent[1], 10);
  return total;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
