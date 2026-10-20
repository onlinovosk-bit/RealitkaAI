// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * WP-4 ROUTE-GATES: skript scripts/ops/route-gates.mjs musí na malom fixture
 * strome správne klasifikovať trasy (gated / ungated / public / 410 + hrany).
 * Fixture sa generuje do dočasného adresára (nepatrí do src/, aby ho netypoval
 * `tsc` ani nelintoval eslint, a aby ho Next nepovažoval za trasy).
 */
const SCRIPT = path.resolve(__dirname, "../../../../../scripts/ops/route-gates.mjs");

const PROXY = `
const PUBLIC_PATHS = new Set(["/api/healthz", "/api/ping"]);
const CRON_PATH_PREFIX = "/api/agents";
const CRON_API_PATH_PREFIX = "/api/cron/";
const CRON_AUTH_API_PATHS = new Set(["/api/followup"]);
const SCORING_CRON_PATHS = ["/api/scoring"];
const DEPRECATED_API_SHIMS = new Set(["/api/old"]);
const REMOVED_API_PATHS = new Set(["/api/scrape"]);
const WEBHOOK_API_SEGMENT = "/api/webhooks";
const HARDWIRED = ["/api/realvia/import", "/api/uc/import", "/api/realsoft/import", "/api/healthz"];
`;

const ROUTES: Record<string, string> = {
  // 1) gated: session + tenant filter
  "leads/route.ts": `
    import { createClient } from "@/lib/supabase/server";
    import { sameAgency } from "@/lib/tenant-scope";
    export async function GET() {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return Response.json({}, { status: 401 });
      const rows = [] as { agency_id: string }[];
      return Response.json(rows.filter((r) => sameAgency(r.agency_id, "a")));
    }
  `,
  // 2) ungated: cron prefix obchádza session v proxy, v trase žiadna brána
  "cron/export/route.ts": `
    import { createAdminClient } from "@/lib/supabase/admin";
    export async function POST() {
      const db = createAdminClient();
      await db.from("leads").update({ x: 1 }).eq("id", 1);
      return Response.json({ ok: true });
    }
  `,
  // 3) public: v PUBLIC_PATHS
  "ping/route.ts": `
    export async function GET() { return Response.json({ ok: true }); }
  `,
  // 4) 410 shim
  "old/route.ts": `
    import { NextResponse } from "next/server";
    export async function GET() {
      return NextResponse.json({ error: "Gone" }, { status: 410 });
    }
  `,
  // hrany
  "cron/secured/route.ts": `
    import { isAuthorizedCronBearer } from "@/lib/cron-auth";
    export async function GET(req: Request) {
      if (!isAuthorizedCronBearer(req)) return new Response("no", { status: 401 });
      return Response.json({ ok: true });
    }
  `,
  "cron/commented/route.ts": `
    export async function POST() {
      // const { data: { user } } = await supabase.auth.getUser();  <- len komentár
      /* isAuthorizedCronBearer(req) */
      return Response.json({ ok: true });
    }
  `,
  "cron/mixed/route.ts": `
    import { isAuthorizedCronBearer } from "@/lib/cron-auth";
    export async function GET(req: Request) {
      if (!isAuthorizedCronBearer(req)) return new Response("no", { status: 401 });
      return Response.json({ ok: true });
    }
    export async function POST() { return Response.json({ ok: true }); }
  `,
  "inbound/route.ts": `
    export async function POST(req: Request) {
      const s = process.env.INBOUND_WEBHOOK_SECRET;
      return Response.json({ s: !!s, h: req.headers.get("x-custom-signature") });
    }
  `,
  "settings/route.ts": `
    export async function GET() { return Response.json({ ok: true }); }
  `,
  "(group)/grouped/route.ts": `
    export async function GET() { return Response.json({ ok: true }); }
  `,
};

type Row = {
  urlPath: string;
  category: string;
  proxyMode: string;
  methods: string[];
  methodClasses: Record<string, string>;
  publicReason?: string;
};

let dir: string;
let apiRoot: string;
let proxyFile: string;

function run(extra: string[] = []) {
  return spawnSync(process.execPath, [SCRIPT, "--root", apiRoot, "--proxy", proxyFile, ...extra], {
    encoding: "utf8",
  });
}

function byPath(rows: Row[]): Record<string, Row> {
  return Object.fromEntries(rows.map((r) => [r.urlPath, r]));
}

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "route-gates-"));
  apiRoot = path.join(dir, "api");
  proxyFile = path.join(dir, "proxy.ts");
  fs.writeFileSync(proxyFile, PROXY);
  for (const [rel, src] of Object.entries(ROUTES)) {
    const f = path.join(apiRoot, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, src);
  }
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("route-gates: klasifikácia na fixture strome", () => {
  it("štyri hlavné trasy (gated / ungated / public / 410) majú správnu kategóriu", () => {
    const res = run(["--json"]);
    expect(res.status).toBe(0);
    const rows = byPath(JSON.parse(res.stdout) as Row[]);
    expect(rows["/api/leads"].category).toBe("GATED-TENANT");
    expect(rows["/api/cron/export"].category).toBe("UNGATED");
    expect(rows["/api/ping"].category).toBe("PUBLIC-BY-DESIGN");
    expect(rows["/api/old"].category).toBe("GONE");
  });

  it("hranové prípady: secret, komentár nie je brána, najslabšia metóda, UNKNOWN, proxy-only, route group", () => {
    const rows = byPath(JSON.parse(run(["--json"]).stdout) as Row[]);
    expect(rows["/api/cron/secured"].category).toBe("GATED-SECRET");
    // zakomentovaná brána sa nepočíta
    expect(rows["/api/cron/commented"].category).toBe("UNGATED");
    // GET má secret, POST nie -> trasa je podľa najslabšej metódy
    expect(rows["/api/cron/mixed"].category).toBe("UNGATED");
    expect(rows["/api/cron/mixed"].methodClasses).toEqual({ GET: "GATED-SECRET", POST: "UNGATED" });
    // len slabý náznak brány -> UNKNOWN, nikdy GATED
    expect(rows["/api/inbound"].category).toBe("UNKNOWN");
    // session iba z proxy
    expect(rows["/api/settings"].category).toBe("GATED-SESSION");
    expect(rows["/api/settings"].proxyMode).toBe("session");
    // (group) sa do URL nepočíta
    expect(rows["/api/grouped"]).toBeDefined();
  });

  it("PUBLIC-BY-DESIGN má vyplnený dôvod (NEZNÁME ak cesta nie je v mape)", () => {
    const rows = byPath(JSON.parse(run(["--json"]).stdout) as Row[]);
    expect(rows["/api/ping"].publicReason).toMatch(/NEZNÁME/);
  });

  it("výstup je deterministický a markdown obsahuje sekciu o tom, čo skript nedokazuje", () => {
    const a = run(["--json"]).stdout;
    const b = run(["--json"]).stdout;
    expect(a).toBe(b);
    const md = run().stdout;
    expect(md).toContain("Čo skript NEDOKAZUJE");
    expect(md).toContain("node scripts/ops/route-gates.mjs --out docs/audit/route-gates.md");
  });

  it("zlyhá nahlas, keď proxy.ts nemá očakávanú štruktúru", () => {
    const bad = path.join(dir, "bad-proxy.ts");
    fs.writeFileSync(bad, "export const x = 1;");
    const res = spawnSync(process.execPath, [SCRIPT, "--root", apiRoot, "--proxy", bad, "--json"], { encoding: "utf8" });
    expect(res.status).not.toBe(0);
  });
});
