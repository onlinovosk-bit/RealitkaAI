/**
 * DEV SEED — nie produktový kód. Nepatří do Acquisition OS sync/PASS checklistu.
 *
 * Prečo toto nie je porušenie "žiadny write" z Stage 0 PASS checklistu:
 * - PASS checklist (blueprint §11 / PR-S0.7) zakazuje write v sync workeroch
 *   a v CRM produktovom kóde (kampane, budgety, conversion upload).
 * - Tento súbor je jednorazový lokálny dev nástroj na naplnenie Google
 *   *test* účtov dummy dátami, aby mock-first sync (PR-S0.4 / S0.5) mal
 *   neskôr čo ťahať. Štandardný postup pre Google Ads test accounts.
 * - Do apps/crm/src sa neimportuje. CI ho nespúšťa.
 *
 * Guard: skript ODMIETNE bežať, ak GOOGLE_ADS_LOGIN_CUSTOMER_ID nie je
 * hardcoded test MCC 7024414113. Produkčný / ROOT MCC sa nedá pustiť
 * ani omylom (žiadny override flag).
 *
 * Cieľové test účty (hardcoded whitelist):
 *   RK A  3726370609  kampaň RKA-test-byty
 *   RK B  2272781649  kampaň RKB-test-domy
 * V každom: 1 PAUSED Search kampaň, 1 ad group, 4 keywords, 1 RSA.
 *
 * Env: apps/crm/.env.local (GOOGLE_ADS_DEVELOPER_TOKEN,
 * GOOGLE_ADS_LOGIN_CUSTOMER_ID, GOOGLE_ADS_SA_KEY_JSON).
 *
 * Spustenie (lokálne, founder):
 *   npx tsx scripts/seed-test-campaigns.ts --dry-run
 *   npx tsx scripts/seed-test-campaigns.ts
 *   npm run seed:test-campaigns
 */

import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

/** Test MCC only. Not ROOT 1645629013. Not any production login. */
const ALLOWED_LOGIN_CUSTOMER_ID = "7024414113";

const GOOGLE_ADS_API_VERSION = "v18";
const GOOGLE_ADS_API_BASE = "https://googleads.googleapis.com";
const ADWORDS_SCOPE = "https://www.googleapis.com/auth/adwords";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

type SeedTarget = {
  customerId: string;
  campaignName: string;
  adGroupName: string;
  keywords: string[];
  headlines: string[];
  descriptions: string[];
  finalUrl: string;
};

const TARGETS: readonly SeedTarget[] = [
  {
    customerId: "3726370609",
    campaignName: "RKA-test-byty",
    adGroupName: "RKA-test-byty-ag",
    keywords: ["byty presov", "byt na predaj", "3 izbovy byt", "reality byty"],
    headlines: ["Byty na predaj", "Test kampan byty", "Revolis test ucet"],
    descriptions: [
      "Testovacia reklama. Ziadny realny predaj.",
      "Paused seed pre Revolis Acquisition OS.",
    ],
    finalUrl: "https://revolis.ai",
  },
  {
    customerId: "2272781649",
    campaignName: "RKB-test-domy",
    adGroupName: "RKB-test-domy-ag",
    keywords: ["domy kosice", "dom na predaj", "rodinny dom", "reality domy"],
    headlines: ["Domy na predaj", "Test kampan domy", "Revolis test ucet"],
    descriptions: [
      "Testovacia reklama. Ziadny realny predaj.",
      "Paused seed pre Revolis Acquisition OS.",
    ],
    finalUrl: "https://revolis.ai",
  },
];

function digitsOnly(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

function loadEnvFiles(): void {
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, "apps/crm/.env.local"),
    resolve(cwd, ".env.local"),
    resolve(cwd, "apps/crm/.env"),
  ];
  for (const file of candidates) {
    if (existsSync(file)) {
      loadDotenv({ path: file, override: false });
    }
  }
}

export function assertAllowedTestMcc(loginCustomerId: string): string {
  const normalized = digitsOnly(loginCustomerId);
  if (normalized !== ALLOWED_LOGIN_CUSTOMER_ID) {
    throw new Error(
      `REFUSED: login_customer_id ${normalized || "(empty)"} is not the hardcoded test MCC ${ALLOWED_LOGIN_CUSTOMER_ID}. This seed never runs against production / ROOT MCC.`,
    );
  }
  return normalized;
}

function resolveSaKeyJson(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const asPath = resolve(trimmed);
  if (existsSync(asPath)) {
    return readFileSync(asPath, "utf8");
  }
  throw new Error(
    "GOOGLE_ADS_SA_KEY_JSON must be JSON or an existing file path",
  );
}

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64url");
}

function signServiceAccountJwt(saKeyJson: string): string {
  const sa = JSON.parse(saKeyJson) as {
    client_email?: string;
    private_key?: string;
  };
  if (!sa.client_email || !sa.private_key) {
    throw new Error(
      "GOOGLE_ADS_SA_KEY_JSON missing client_email or private_key",
    );
  }
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: ADWORDS_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(sa.private_key);
  return `${unsigned}.${base64url(signature)}`;
}

async function fetchAccessToken(saKeyJson: string): Promise<string> {
  const assertion = signServiceAccountJwt(saKeyJson);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`OAuth token exchange failed (${res.status})`);
  }
  return json.access_token;
}

function resourceId(resourceName: string): string {
  const parts = resourceName.split("/");
  return parts[parts.length - 1] ?? resourceName;
}

type AdsResponse = { status: number; body: Record<string, unknown> };

async function adsMutate(opts: {
  accessToken: string;
  developerToken: string;
  loginCustomerId: string;
  customerId: string;
  method: "GET" | "POST";
  path: string;
  body?: unknown;
}): Promise<AdsResponse> {
  const url = `${GOOGLE_ADS_API_BASE}/${GOOGLE_ADS_API_VERSION}/customers/${opts.customerId}/${opts.path}`;
  const res = await fetch(url, {
    method: opts.method,
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "developer-token": opts.developerToken,
      "login-customer-id": opts.loginCustomerId,
      "Content-Type": "application/json",
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    parsed = { raw: text.slice(0, 400) };
  }
  if (!res.ok) {
    const msg =
      typeof parsed.message === "string"
        ? parsed.message
        : JSON.stringify(parsed).slice(0, 800);
    throw new Error(`Google Ads ${opts.path} failed ${res.status}: ${msg}`);
  }
  return { status: res.status, body: parsed };
}

async function findCampaignByName(
  ctx: {
    accessToken: string;
    developerToken: string;
    loginCustomerId: string;
    customerId: string;
  },
  name: string,
): Promise<string | null> {
  const escaped = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const result = await adsMutate({
    ...ctx,
    method: "POST",
    path: "googleAds:search",
    body: {
      query: `SELECT campaign.id, campaign.name FROM campaign WHERE campaign.name = '${escaped}' LIMIT 1`,
    },
  });
  const results = result.body.results;
  if (!Array.isArray(results) || results.length === 0) return null;
  const row = results[0] as {
    campaign?: { id?: string; resourceName?: string };
  };
  if (row.campaign?.id) return String(row.campaign.id);
  if (row.campaign?.resourceName) return resourceId(row.campaign.resourceName);
  return null;
}

async function mutateCreate(
  ctx: {
    accessToken: string;
    developerToken: string;
    loginCustomerId: string;
    customerId: string;
  },
  collection: string,
  resource: Record<string, unknown>,
): Promise<string> {
  const result = await adsMutate({
    ...ctx,
    method: "POST",
    path: `${collection}:mutate`,
    body: { operations: [{ create: resource }] },
  });
  const results = result.body.results;
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error(`${collection}:mutate returned no results`);
  }
  const resourceName = (results[0] as { resourceName?: string }).resourceName;
  if (!resourceName) {
    throw new Error(`${collection}:mutate missing resourceName`);
  }
  return resourceName;
}

async function seedAccount(
  ctx: {
    accessToken: string;
    developerToken: string;
    loginCustomerId: string;
  },
  target: SeedTarget,
  dryRun: boolean,
): Promise<void> {
  const customerId = target.customerId;
  const ads = { ...ctx, customerId };

  const existing = await findCampaignByName(ads, target.campaignName);
  if (existing) {
    console.log(
      `SKIP ${target.campaignName} on ${customerId}: already exists (campaign id ${existing})`,
    );
    return;
  }

  if (dryRun) {
    console.log(
      `DRY-RUN would create PAUSED search campaign ${target.campaignName} on ${customerId} + ad group + ${target.keywords.length} keywords + 1 RSA`,
    );
    return;
  }

  const budgetName = `${target.campaignName} budget`;
  const budgetRn = await mutateCreate(ads, "campaignBudgets", {
    name: budgetName,
    amountMicros: "1000000",
    deliveryMethod: "STANDARD",
    explicitlyShared: false,
  });

  const campaignRn = await mutateCreate(ads, "campaigns", {
    name: target.campaignName,
    status: "PAUSED",
    advertisingChannelType: "SEARCH",
    campaignBudget: budgetRn,
    containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
    networkSettings: {
      targetGoogleSearch: true,
      targetSearchNetwork: true,
      targetContentNetwork: false,
      targetPartnerSearchNetwork: false,
    },
    manualCpc: { enhancedCpcEnabled: false },
  });

  const adGroupRn = await mutateCreate(ads, "adGroups", {
    name: target.adGroupName,
    campaign: campaignRn,
    status: "PAUSED",
    type: "SEARCH_STANDARD",
    cpcBidMicros: "1000000",
  });

  for (const text of target.keywords) {
    await mutateCreate(ads, "adGroupCriteria", {
      adGroup: adGroupRn,
      status: "PAUSED",
      keyword: { text, matchType: "BROAD" },
    });
  }

  await mutateCreate(ads, "adGroupAds", {
    adGroup: adGroupRn,
    status: "PAUSED",
    ad: {
      responsiveSearchAd: {
        headlines: target.headlines.map((text) => ({ text })),
        descriptions: target.descriptions.map((text) => ({ text })),
      },
      finalUrls: [target.finalUrl],
    },
  });

  console.log(
    `CREATED ${target.campaignName} on ${customerId}: campaign=${resourceId(campaignRn)} adGroup=${resourceId(adGroupRn)} keywords=${target.keywords.length} rsa=1 (all PAUSED)`,
  );
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  if (args.has("--help") || args.has("-h")) {
    console.log(
      "Usage: npx tsx scripts/seed-test-campaigns.ts [--dry-run]\nEnv: apps/crm/.env.local (GOOGLE_ADS_*). Refuses unless login MCC is 7024414113.",
    );
    return;
  }
  const dryRun = args.has("--dry-run");

  loadEnvFiles();

  const loginRaw = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? "";
  const loginCustomerId = assertAllowedTestMcc(loginRaw);
  const developerToken = (process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "").trim();
  const saRaw = (process.env.GOOGLE_ADS_SA_KEY_JSON ?? "").trim();
  if (!developerToken) {
    throw new Error("Missing GOOGLE_ADS_DEVELOPER_TOKEN in .env.local");
  }
  if (!saRaw) {
    throw new Error("Missing GOOGLE_ADS_SA_KEY_JSON in .env.local");
  }

  const saKeyJson = resolveSaKeyJson(saRaw);
  const accessToken = await fetchAccessToken(saKeyJson);

  console.log(
    `OK test MCC ${loginCustomerId}. Seeding ${TARGETS.length} accounts (dryRun=${dryRun}).`,
  );

  for (const target of TARGETS) {
    await seedAccount(
      { accessToken, developerToken, loginCustomerId },
      target,
      dryRun,
    );
  }
}

const invokedDirectly =
  Boolean(process.argv[1]) &&
  resolve(process.argv[1]).endsWith("seed-test-campaigns.ts");

if (invokedDirectly) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "seed failed";
    console.error(message);
    process.exit(1);
  });
}
