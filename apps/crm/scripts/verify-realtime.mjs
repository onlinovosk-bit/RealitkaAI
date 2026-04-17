/**
 * Rýchla kontrola HTTP endpointov (bez session cookie — očakáva 401 na /api/events).
 * Usage: node scripts/verify-realtime.mjs https://your-host
 */
const base = process.argv[2] || "http://localhost:3000";

async function main() {
  try {
    const u = `${base.replace(/\/$/, "")}/api/cron/auto-tune`;
    const r = await fetch(u, { method: "POST" });
    const t = await r.text();
    console.log("POST /api/cron/auto-tune (bez secret):", r.status, t.slice(0, 200));

    const u2 = `${base.replace(/\/$/, "")}/api/events`;
    const r2 = await fetch(u2, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: "test", signals: { email_open: 1 } }),
    });
    const t2 = await r2.text();
    console.log("POST /api/events (bez login):", r2.status, t2.slice(0, 200));
  } catch (e) {
    console.error("Server nedostupný alebo zlé URL:", base, e?.message ?? e);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
