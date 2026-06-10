import * as cheerio from "cheerio";
import { CRM_SIGNAL_PATTERNS, PORTAL_LINK_PATTERNS } from "./config.ts";

const PHONE_RE = /(\+421|0)\s*\d{2,3}[\s/.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{3}/;
const PHONE_RE_GLOBAL = /(\+421|0)\s*\d{2,3}[\s/.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{3}/g;
const NAME_BLOCK_RE = /class="[^"]*(?:team|makler|agent|member|card|person)[^"]*"/gi;

export function detectPortalsInHtml(html: string): string[] {
  const found = new Set<string>();
  const $ = cheerio.load(html);
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    for (const p of PORTAL_LINK_PATTERNS) {
      if (p.pattern.test(href)) found.add(p.name);
    }
  });
  const raw = html;
  for (const p of PORTAL_LINK_PATTERNS) {
    if (p.pattern.test(raw)) found.add(p.name);
  }
  return [...found];
}

export function detectCrmSignals(html: string): string[] {
  const found: string[] = [];
  for (const s of CRM_SIGNAL_PATTERNS) {
    if (s.pattern.test(html)) found.push(s.name);
  }
  return found;
}

export function detectModernWeb(html: string): boolean {
  const $ = cheerio.load(html);
  const hasViewport = $('meta[name="viewport"]').length > 0;
  const modernHint =
    /tailwind|bootstrap|flex|grid|next\/|react|webpack|vite/i.test(html) ||
    $("link[rel=stylesheet][href*='bootstrap']").length > 0;
  return hasViewport && modernHint;
}

export function estimateTeamSize(html: string): number {
  const $ = cheerio.load(html);
  let count = 0;

  const selectors = [
    "[class*='team'] [class*='member']",
    "[class*='makler']",
    "[class*='agent']",
    ".team-member",
    ".card-person",
    "article",
  ];

  for (const sel of selectors) {
    const n = $(sel).length;
    if (n > count && n <= 50) count = n;
  }

  const phones = html.match(PHONE_RE_GLOBAL) ?? [];
  const phoneBlocks = new Set(phones.map((p) => p.replace(/\s/g, "")));
  if (phoneBlocks.size > count && phoneBlocks.size <= 30) count = phoneBlocks.size;

  const nameBlocks = html.match(NAME_BLOCK_RE)?.length ?? 0;
  if (nameBlocks > count && nameBlocks <= 40) count = nameBlocks;

  const headings = $("h2, h3, h4")
    .filter((_, el) => /tím|maklér|makleri|team|agents/i.test($(el).text()))
    .length;
  if (headings > 0) {
    const section = $("h2, h3, h4")
      .filter((_, el) => /tím|maklér|makleri|team/i.test($(el).text()))
      .first()
      .parent();
    const li = section.find("li").length;
    if (li > count && li <= 40) count = li;
  }

  const liWithPhone = $("li").filter((_, el) => PHONE_RE.test($(el).text())).length;
  if (liWithPhone > count && liWithPhone <= 40) count = liWithPhone;

  return count > 0 ? count : 0;
}

export function konatelListedAsBroker(html: string, konatel: string): boolean {
  if (!konatel.trim()) return false;
  const parts = konatel
    .toLowerCase()
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const text = html.toLowerCase();
  const brokerCtx = /maklér|realitný|realitna|broker|agent/i.test(text);
  if (!brokerCtx) return false;

  return parts.some((name) => {
    const tokens = name.split(/\s+/).filter((t) => t.length > 2);
    if (tokens.length === 0) return false;
    return tokens.every((t) => text.includes(t));
  });
}

export function discoverSubpageUrls(baseUrl: string, html: string, hints: string[]): string[] {
  const $ = cheerio.load(html);
  const origin = new URL(baseUrl).origin;
  const found: string[] = [];

  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
    try {
      const u = new URL(href, baseUrl);
      if (u.origin !== origin) return;
      const path = u.pathname.toLowerCase();
      if (hints.some((h) => path.includes(h.replace(/^\//, "")))) {
        found.push(u.toString());
      }
    } catch {
      /* skip */
    }
  });

  for (const h of hints) {
    try {
      found.push(new URL(h, baseUrl).toString());
    } catch {
      /* skip */
    }
  }

  return [...new Set(found)].slice(0, 5);
}

export function mergeEnrichmentFromPages(
  pages: { url: string; html: string }[],
  konatel: string,
): {
  team_size_estimate: number;
  portals_detected: string[];
  crm_signals: string[];
  has_modern_web: boolean;
  konatel_on_web_as_broker: boolean;
} {
  let team = 0;
  const portals = new Set<string>();
  const crm = new Set<string>();
  let modern = false;
  let konOnWeb = false;

  for (const p of pages) {
    team = Math.max(team, estimateTeamSize(p.html));
    detectPortalsInHtml(p.html).forEach((x) => portals.add(x));
    detectCrmSignals(p.html).forEach((x) => crm.add(x));
    if (detectModernWeb(p.html)) modern = true;
    if (konatelListedAsBroker(p.html, konatel)) konOnWeb = true;
  }

  return {
    team_size_estimate: team > 0 ? team : null,
    portals_detected: [...portals],
    crm_signals: [...crm],
    has_modern_web: modern,
    konatel_on_web_as_broker: konOnWeb,
  };
}
