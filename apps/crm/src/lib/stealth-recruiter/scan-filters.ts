const BRATISLAVA_TZ = "Europe/Bratislava";

/** Calendar date YYYY-MM-DD in Europe/Bratislava. */
export function bratislavaCalendarDate(ref = new Date()): string {
  return ref.toLocaleDateString("en-CA", { timeZone: BRATISLAVA_TZ });
}

/** UTC bounds for verified_at filter: start inclusive, end exclusive (next midnight Bratislava). */
export function bratislavaVerifiedAtRange(ref = new Date()): { from: string; to: string } {
  const day = bratislavaCalendarDate(ref);
  const probe = new Date(`${day}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BRATISLAVA_TZ,
    timeZoneName: "shortOffset",
  }).formatToParts(probe);
  const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const match = offsetPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const sign = match?.[1] === "-" ? "-" : "+";
  const hours = String(match?.[2] ?? "1").padStart(2, "0");
  const mins = String(match?.[3] ?? "00").padStart(2, "0");
  const offset = `${sign}${hours}:${mins}`;

  const from = new Date(`${day}T00:00:00${offset}`);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 1);

  return { from: from.toISOString(), to: to.toISOString() };
}

export function normalizeRegion(area?: string | null): string | null {
  const trimmed = String(area ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function regionMatchesProspect(region: string | null | undefined, area: string): boolean {
  const target = normalizeRegion(area);
  if (!target) return true;
  const value = String(region ?? "").trim();
  if (!value) return false;
  return value.localeCompare(target, "sk", { sensitivity: "base" }) === 0;
}

export function isStealthRecruiterDemoMode(): boolean {
  return process.env.STEALTH_RECRUITER_DEMO_MODE === "true";
}
