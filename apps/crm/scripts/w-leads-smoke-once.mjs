/**
 * PROD smoke: W-LEADS (#256) — Smolko session via admin magic link.
 * Writes apps/crm/docs/audit/w-leads-smoke-latest.json
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.production.local") });
config({ path: resolve(process.cwd(), ".env.local") });

const BASE = "https://app.revolis.ai";
const SMOLKO_EMAIL = "rastislav.smolko@gmail.com";
const SMOLKO_AGENCY = "11111111-1111-1111-1111-111111111111";
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseAnon = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  ""
).trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

const stamp = new Date().toISOString();
const testLeadName = `W-LEADS smoke ${stamp.slice(0, 19).replace("T", " ")}`;
const testLeadEmail = `w-leads-smoke+${Date.now()}@revolis.ai`;

const report = {
  at: stamp,
  base: BASE,
  pr: 256,
  mergeCommit: "0fa2e7e8c",
  auth: { method: "admin_magic_link", email: SMOLKO_EMAIL },
  steps: {},
  db: {},
  errors: [],
  ok: false,
  rootCause: null,
};

async function dbLeadCount(sb) {
  const { count, error } = await sb
    .from("leads")
    .select("*", { head: true, count: "exact" })
    .eq("agency_id", SMOLKO_AGENCY);
  if (error) throw new Error(`leads count: ${error.message}`);
  return count ?? 0;
}

async function findSmokeLead(sb) {
  const { data, error } = await sb
    .from("leads")
    .select("id, name, email, source, agency_id, created_at")
    .eq("agency_id", SMOLKO_AGENCY)
    .eq("email", testLeadEmail)
    .maybeSingle();
  if (error) throw new Error(`find lead: ${error.message}`);
  return data;
}

async function cleanupSmokeLead(sb, id) {
  if (!id) return;
  await sb.from("leads").delete().eq("id", id).eq("agency_id", SMOLKO_AGENCY);
}

async function createSmolkoSession(admin) {
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: SMOLKO_EMAIL,
  });
  if (linkErr) throw new Error(`generateLink: ${linkErr.message}`);
  const tokenHash = link?.properties?.hashed_token;
  if (!tokenHash) throw new Error("generateLink: missing hashed_token");

  const cookieJar = [];
  const authClient = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return cookieJar;
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          const idx = cookieJar.findIndex((c) => c.name === cookie.name);
          if (idx >= 0) cookieJar[idx] = cookie;
          else cookieJar.push(cookie);
        }
      },
    },
  });

  const { data: sessionData, error: verifyErr } = await authClient.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (verifyErr) throw new Error(`verifyOtp: ${verifyErr.message}`);
  if (!sessionData.session) throw new Error("verifyOtp: missing session");

  return {
    userId: sessionData.user?.id ?? null,
    cookies: cookieJar.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: "app.revolis.ai",
      path: cookie.path ?? "/",
      httpOnly: cookie.httpOnly ?? true,
      secure: true,
      sameSite: cookie.sameSite ?? "Lax",
    })),
  };
}

async function runBrowserFlow(session) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies(session.cookies);
  const page = await context.newPage();
  let createdLeadId = null;

  try {
    report.steps.magicLinkAuth = {
      ok: Boolean(session.userId),
      userId: session.userId,
      cookieCount: session.cookies.length,
    };

    await page.goto(`${BASE}/leads`, { waitUntil: "networkidle", timeout: 90_000 });
    if (page.url().includes("/login")) {
      throw new Error("session not established — redirected to login on /leads");
    }

    const fullFormLink = page.locator('a[href="/leads/new"]');
    const linkCount = await fullFormLink.count();
    const linkText = linkCount > 0 ? (await fullFormLink.first().textContent())?.trim() : null;

    report.steps.leadsListLink = {
      ok: linkCount > 0,
      href: "/leads/new",
      linkText,
      url: page.url(),
    };
    if (linkCount === 0) report.errors.push("leadsListLink: Plný formulár link not found");

    await page.goto(`${BASE}/leads/new`, { waitUntil: "networkidle", timeout: 90_000 });
    const heading = await page.locator("h1").first().textContent();
    report.steps.newLeadPage = {
      ok: page.url().includes("/leads/new") && /Nová príležitosť/i.test(heading ?? ""),
      url: page.url(),
      heading: heading?.trim(),
    };
    if (!report.steps.newLeadPage.ok) report.errors.push("newLeadPage: page not loaded");

    await page.fill('input[placeholder="Ján Novák"]', testLeadName);
    await page.fill('input[type="email"]', testLeadEmail);

    const postPromise = page.waitForResponse(
      (r) => r.url().includes("/api/leads") && r.request().method() === "POST",
      { timeout: 45_000 },
    );

    await page.getByRole("button", { name: /Uložiť príležitosť/i }).click();
    const postRes = await postPromise;
    let postJson = null;
    let postRaw = null;
    try {
      postRaw = await postRes.text();
      postJson = JSON.parse(postRaw);
    } catch {
      postJson = null;
    }

    await page.waitForURL((url) => /\/leads\/[^/]+$/.test(url.pathname), { timeout: 30_000 }).catch(() => null);

    createdLeadId = postJson?.lead?.id ?? null;
    const detailOk = Boolean(createdLeadId) && page.url().includes(`/leads/${createdLeadId}`);

    report.steps.createLead = {
      ok: postRes.ok() && postJson?.ok === true && detailOk,
      apiStatus: postRes.status(),
      apiError: postJson?.error ?? postRaw,
      leadId: createdLeadId,
      redirectUrl: page.url(),
      leadName: postJson?.lead?.name ?? null,
      agencyId: postJson?.lead?.agencyId ?? postJson?.lead?.agency_id ?? null,
    };
    if (!report.steps.createLead.ok) {
      report.errors.push(`createLead: api=${postRes.status()} redirect=${page.url()}`);
    }

    if (createdLeadId) {
      await page.goto(`${BASE}/leads`, { waitUntil: "networkidle", timeout: 90_000 });
      const rowText = await page.locator("body").innerText();
      const visibleInList = rowText.includes(testLeadName);
      report.steps.inventory = {
        ok: visibleInList,
        leadId: createdLeadId,
        leadName: testLeadName,
      };
      if (!visibleInList) report.errors.push("inventory: created lead not visible on /leads");
    }

    report.steps.browser = { ok: report.errors.length === 0 };
    return createdLeadId;
  } catch (err) {
    report.steps.browser = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    report.errors.push(`browser: ${report.steps.browser.error}`);
    return createdLeadId;
  } finally {
    await browser.close();
  }
}

async function main() {
  if (!supabaseUrl || !serviceKey || !supabaseAnon) {
    throw new Error("Missing Supabase URL, anon key, or service role key");
  }

  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  report.db.leadsBefore = await dbLeadCount(sb);

  const unauth = await fetch(`${BASE}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "x", email: "x@test.com" }),
  });
  report.steps.apiUnauth = { ok: unauth.status === 401, status: unauth.status };

  const session = await createSmolkoSession(sb);
  const leadId = await runBrowserFlow(session);

  const found = await findSmokeLead(sb);
  report.db.smokeLead = found
    ? { id: found.id, name: found.name, email: found.email, source: found.source, agency_id: found.agency_id }
    : null;
  report.db.leadsAfter = await dbLeadCount(sb);

  if (found?.id) {
    await cleanupSmokeLead(sb, found.id);
    report.db.cleanedUp = true;
    report.db.leadsAfterCleanup = await dbLeadCount(sb);
  }

  if (report.steps.createLead?.apiError?.includes("row-level security")) {
    report.rootCause =
      "POST /api/leads: createLead() volal resolveTenantSupabase() bez server session → RLS 400. Hotfix: pass supabaseAuth do createLead().";
  }

  report.ok =
    report.steps.apiUnauth?.ok === true &&
    report.steps.leadsListLink?.ok === true &&
    report.steps.newLeadPage?.ok === true &&
    report.steps.createLead?.ok === true &&
    report.steps.inventory?.ok === true &&
    report.errors.length === 0;

  const outPath = resolve(process.cwd(), "docs/audit/w-leads-smoke-latest.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
