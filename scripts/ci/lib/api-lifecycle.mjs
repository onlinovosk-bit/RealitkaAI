// API lifecycle guard.
// Inventár sa skladá len z textu, ktorý extraktor v súbore naozaj nájde.
// Oznámenie bez primárneho zdroja nespustí migráciu. autoMigrate je vždy false:
// ani potvrdené oznámenie sa nemigruje samo.

export const SOURCE_RULES = [
  {
    id: "anthropic-sonnet",
    file: "apps/crm/src/lib/ai/claude.ts",
    provider: "anthropic",
    purpose: "Claude messages in the CRM",
    pattern: /export const CLAUDE_SONNET\s*=\s*"([^"]+)"/,
    field: "model_or_api",
  },
  {
    id: "anthropic-haiku",
    file: "apps/crm/src/lib/ai/claude.ts",
    provider: "anthropic",
    purpose: "Claude messages in the CRM",
    pattern: /export const CLAUDE_HAIKU\s*=\s*"([^"]+)"/,
    field: "model_or_api",
  },
  {
    id: "openai-ghostwriter",
    file: "apps/crm/src/app/api/ghostwriter/generate/route.ts",
    provider: "openai",
    purpose: "ghostwriter generation",
    pattern: /const model = "([^"]+)"/,
    field: "model_or_api",
  },
  {
    id: "openai-call-script",
    file: "apps/crm/src/app/api/call-script/route.ts",
    provider: "openai",
    purpose: "call script generation",
    pattern: /const OPENAI_MODEL = "([^"]+)"/,
    field: "model_or_api",
  },
  {
    id: "openai-assistant-chat",
    file: "apps/crm/src/lib/assistant-chat.ts",
    provider: "openai",
    purpose: "assistant chat",
    pattern: /model:\s+"([^"]+)"/,
    field: "model_or_api",
  },
  {
    id: "openai-transcribe",
    file: "apps/crm/src/app/api/ai/call/transcribe/route.ts",
    provider: "openai",
    purpose: "call transcription",
    pattern: /model: "([^"]+)"/,
    field: "model_or_api",
  },
  {
    id: "google-ads-rest",
    file: "apps/crm/src/lib/acquisition/google-ads-client.ts",
    provider: "google-ads",
    purpose: "Google Ads REST client",
    pattern: /export const GOOGLE_ADS_API_VERSION = "([^"]+)"/,
    field: "api_version",
  },
];

const PACKAGE_LIBS = [
  { id: "dep-anthropic-sdk", name: "@anthropic-ai/sdk", provider: "anthropic", purpose: "Anthropic SDK dependency range" },
  { id: "dep-openai", name: "openai", provider: "openai", purpose: "OpenAI SDK dependency range" },
  { id: "dep-stripe", name: "stripe", provider: "stripe", purpose: "Stripe SDK dependency range" },
];

export function classifyNotice(notice) {
  const url = typeof notice?.source_url === "string" && /^https:\/\//.test(notice.source_url);
  const quote = typeof notice?.source_quote === "string" && notice.source_quote.trim().length > 0;
  if (!url || !quote) return { class: "missing_source", autoMigrate: false, code: "missing_source" };
  const confirmed = notice.verified === true
    && notice.verification_method === "primary_source"
    && typeof notice.retrieved_at === "string"
    && notice.retrieved_at.trim().length > 0;
  if (!confirmed) return { class: "unverified_notice", autoMigrate: false, code: "unverified_notice" };
  return { class: "confirmed_deprecation", autoMigrate: false, code: "confirmed_no_auto_migration" };
}

export function migrationDecision(notice, authorization) {
  const found = classifyNotice(notice);
  if (found.class !== "confirmed_deprecation") {
    return { allowed: false, autoMigrate: false, code: "unverified_shutdown_no_migration", class: found.class };
  }
  const explicit = authorization?.explicit === true
    && authorization?.actor === "founder"
    && authorization?.action === "migrate";
  if (!explicit) {
    return { allowed: false, autoMigrate: false, code: "confirmed_requires_founder", class: found.class };
  }
  return { allowed: true, autoMigrate: false, code: "founder_authorized_not_automatic", class: found.class };
}

function entryBase(partial, codeownersPresent) {
  return {
    model_or_api: null,
    api_version: null,
    api_version_gap: true,
    dependency_range: null,
    owner: null,
    ownership_gap: !codeownersPresent,
    vendor_live: false,
    ...partial,
  };
}

export function buildInventory({ readFile, codeownersPresent = false }) {
  const entries = [];
  for (const rule of SOURCE_RULES) {
    let text = "";
    try { text = readFile(rule.file); } catch { continue; }
    const match = text.match(rule.pattern);
    if (!match) continue;
    const value = match[1];
    entries.push(entryBase({
      id: rule.id,
      provider: rule.provider,
      purpose: rule.purpose,
      source_file: rule.file,
      model_or_api: rule.field === "model_or_api" ? value : null,
      api_version: rule.field === "api_version" ? value : null,
      api_version_gap: rule.field !== "api_version",
    }, codeownersPresent));
  }

  const stripeFile = "apps/crm/src/lib/billing-store.ts";
  try {
    const text = readFile(stripeFile);
    if (text.includes("new Stripe(") && !text.includes("apiVersion")) {
      entries.push(entryBase({
        id: "stripe-node-client",
        provider: "stripe",
        purpose: "Stripe client constructed without an apiVersion pin",
        source_file: stripeFile,
        api_version: null,
        api_version_gap: true,
      }, codeownersPresent));
    }
  } catch { /* súbor chýba → záznam sa nevymyslí */ }

  try {
    const pkg = JSON.parse(readFile("apps/crm/package.json"));
    const deps = pkg.dependencies || {};
    for (const lib of PACKAGE_LIBS) {
      if (typeof deps[lib.name] !== "string") continue;
      entries.push(entryBase({
        id: lib.id,
        provider: lib.provider,
        purpose: lib.purpose,
        source_file: "apps/crm/package.json",
        dependency_range: deps[lib.name],
        api_version_gap: true,
      }, codeownersPresent));
    }
  } catch { /* package.json sa neparsuje → rozsahy sa nevymyslia */ }

  return {
    generated_from: "source-extract",
    vendor_deprecation_fetched: false,
    entries,
  };
}
