#!/usr/bin/env node
/**
 * Overenie GET /api/leads/:id/sales-brain po deployi.
 *
 * Použitie:
 *   BASE_URL=https://app.revolis.ai LEAD_ID=xxx COOKIE="session=..." node scripts/verify-sales-brain.mjs
 *
 * Cookie získaš z DevTools → Application → Cookies (prihlásená session),
 * alebo nechaj COOKIE prázdne — očaká 401 pri zapnutom Supabase (tiež validná kontrola auth).
 */

const base = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const leadId = process.env.LEAD_ID || "";
const cookie = process.env.COOKIE || "";

if (!leadId) {
  console.error("Nastav LEAD_ID (UUID leadu).");
  process.exit(1);
}

const url = `${base}/api/leads/${encodeURIComponent(leadId)}/sales-brain`;

async function main() {
  const res = await fetch(url, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  console.log("URL:", url);
  console.log("HTTP:", res.status);
  if (json?.profile?.engineVersion) {
    console.log("OK: profile.engineVersion =", json.profile.engineVersion);
    console.log("combined-style score:", json.profile.score);
  } else if (res.status === 401 && !cookie) {
    console.log("OK: 401 bez COOKIE (auth zapnutý).");
  } else {
    console.log("Body:", text.slice(0, 500));
  }

  const ok = res.ok || (res.status === 401 && !cookie);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
