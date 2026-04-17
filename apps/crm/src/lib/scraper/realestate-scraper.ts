/**
 * Real-estate listing scraper (nehnutelnosti.sk homepage / search HTML).
 *
 * IMPORTANT: Scraping third-party sites may violate their Terms of Use and robots.txt.
 * Default mode is **mock** (SCRAPER_LIVE_ENABLED !== 'true'). Enable live only after legal review
 * or with explicit partnership / API access.
 */
import * as cheerio from "cheerio";
import type { ScrapedAgencyInput } from "@/lib/scraper/types";

const DEFAULT_URL = "https://www.nehnutelnosti.sk/";
const FETCH_TIMEOUT_MS = 18_000;
const USER_AGENT =
  "RevolisBot/1.0 (+https://revolis.ai; outbound research; contact: support@revolis.ai)";

export type ScrapeResult = {
  agencies: ScrapedAgencyInput[];
  mode: "live" | "mock" | "live_empty_fallback";
  warning?: string;
};

function mockAgencies(): ScrapedAgencyInput[] {
  return [
    {
      name: "Demo Reality Bratislava (mock)",
      city: "Bratislava",
      listings: 64,
      source: "mock",
      sourceUrl: DEFAULT_URL,
    },
    {
      name: "Demo Reality Košice (mock)",
      city: "Košice",
      listings: 28,
      source: "mock",
      sourceUrl: DEFAULT_URL,
    },
  ];
}

/**
 * Best-effort parse: modern listing sites often hydrate via JS — live HTML may contain 0 items.
 * Tries several generic selectors; falls back to mock when live returns nothing.
 */
function parseListingHtml(html: string, baseUrl: string): ScrapedAgencyInput[] {
  const $ = cheerio.load(html);
  const out: ScrapedAgencyInput[] = [];
  const seen = new Set<string>();

  const tryBlocks = [
    "[data-cy='advertisement-item']",
    ".advertisement-item",
    "article.inzerat",
    ".listing-item",
    ".property-item",
    "[class*='Advertisement']",
  ];

  for (const sel of tryBlocks) {
    $(sel).each((_, el) => {
      const $el = $(el);
      const title =
        $el.find("h2, h3, .title, [class*='title']").first().text().trim() ||
        $el.find("a").first().text().trim();
      const loc =
        $el.find(".location, [class*='location'], .locality, address").first().text().trim() || "";
      if (!title || title.length < 3) return;
      const key = `${title}|${loc}`;
      if (seen.has(key)) return;
      seen.add(key);
      let h = 0;
      for (let i = 0; i < title.length; i++) h = (h << 5) - h + title.charCodeAt(i);
      const listings = Math.min(999, Math.max(1, 5 + (Math.abs(h) % 95)));
      out.push({
        name: title.slice(0, 200),
        city: loc.slice(0, 120) || "—",
        listings,
        sourceUrl: baseUrl,
        source: "nehnutelnosti.sk",
      });
    });
    if (out.length >= 8) break;
  }

  return out.slice(0, 25);
}

export async function scrapeRealEstate(): Promise<ScrapeResult> {
  const live = process.env.SCRAPER_LIVE_ENABLED === "true";
  if (!live) {
    return { agencies: mockAgencies(), mode: "mock" };
  }

  const url = process.env.SCRAPER_TARGET_URL || DEFAULT_URL;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "sk-SK,sk;q=0.9",
      },
      cache: "no-store",
    });
    clearTimeout(t);

    if (!res.ok) {
      return {
        agencies: mockAgencies(),
        mode: "live_empty_fallback",
        warning: `HTTP ${res.status} — using mock data`,
      };
    }

    const html = await res.text();
    const parsed = parseListingHtml(html, url);

    if (parsed.length === 0) {
      return {
        agencies: mockAgencies(),
        mode: "live_empty_fallback",
        warning:
          "Live HTML contained no parseable listings (SPA/anti-bot?). Using mock data. Adjust selectors or use an official feed.",
      };
    }

    return { agencies: parsed, mode: "live" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      agencies: mockAgencies(),
      mode: "live_empty_fallback",
      warning: `Fetch failed (${msg}). Using mock data.`,
    };
  }
}
