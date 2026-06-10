/**
 * Hardcoded fetch denylist — portály a agregátory.
 * Test vynucuje: žiadny fetch na tieto domény.
 */
export const PORTAL_FETCH_DENYLIST: readonly string[] = [
  "nehnutelnosti.sk",
  "www.nehnutelnosti.sk",
  "topreality.sk",
  "www.topreality.sk",
  "reality.sk",
  "www.reality.sk",
  "bazos.sk",
  "www.bazos.sk",
  "realityscan.sk",
  "zoznamrealit.sk",
  "www.zoznamrealit.sk",
  "adamdarius.sk",
  "nextreality.sk",
] as const;

const DENY_SET = new Set(
  PORTAL_FETCH_DENYLIST.map((d) => d.toLowerCase().replace(/^www\./, "")),
);

export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export function isDeniedFetchHostname(hostname: string): boolean {
  const h = normalizeHostname(hostname);
  if (DENY_SET.has(h)) return true;
  for (const denied of DENY_SET) {
    if (h.endsWith(`.${denied}`)) return true;
  }
  return false;
}

export function isDeniedFetchUrl(url: string): boolean {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return isDeniedFetchHostname(u.hostname);
  } catch {
    return true;
  }
}
