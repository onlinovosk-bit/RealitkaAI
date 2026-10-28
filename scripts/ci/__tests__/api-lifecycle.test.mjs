// Spustenie: node --test scripts/ci/__tests__/api-lifecycle.test.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { join, resolve } from "node:path";
import { buildInventory, classifyNotice, migrationDecision } from "../lib/api-lifecycle.mjs";

const ROOT = resolve(new URL("../../..", import.meta.url).pathname);
const readFile = (rel) => readFileSync(join(ROOT, rel), "utf8");
const codeownersPresent = existsSync(join(ROOT, "CODEOWNERS")) || existsSync(join(ROOT, ".github/CODEOWNERS"));

const confirmed = {
  claim: "model retired",
  source_url: "https://example.invalid/deprecation",
  source_quote: "this model is retired",
  verified: true,
  verification_method: "primary_source",
  retrieved_at: "2026-10-23T00:00:00Z",
};

test("chýbajúci zdroj, neoverené oznámenie a potvrdené oznámenie nemigrujú samy", () => {
  const missing = classifyNotice({ claim: "shut down tomorrow" });
  assert.equal(missing.class, "missing_source");
  assert.equal(missing.autoMigrate, false);
  assert.equal(migrationDecision({ claim: "shut down tomorrow" }, { explicit: true, actor: "founder", action: "migrate" }).allowed, false);

  const unverified = classifyNotice({
    claim: "v18 is sunset",
    source_url: "https://example.invalid/not-checked",
    source_quote: "v18 is sunset",
    verified: false,
  });
  assert.equal(unverified.class, "unverified_notice");
  assert.equal(unverified.autoMigrate, false);
  assert.equal(migrationDecision({
    source_url: "https://example.invalid/not-checked",
    source_quote: "v18 is sunset",
  }).code, "unverified_shutdown_no_migration");

  const ok = classifyNotice(confirmed);
  assert.equal(ok.class, "confirmed_deprecation");
  assert.equal(ok.autoMigrate, false);
  assert.equal(migrationDecision(confirmed, null).code, "confirmed_requires_founder");
  const authorized = migrationDecision(confirmed, { explicit: true, actor: "founder", action: "migrate" });
  assert.equal(authorized.allowed, true);
  assert.equal(authorized.autoMigrate, false);
  assert.equal(authorized.code, "founder_authorized_not_automatic");
});

test("inventár berie ID len zo súborov a medzeru vlastníka nezakrýva", () => {
  const inv = buildInventory({ readFile, codeownersPresent });
  const byId = Object.fromEntries(inv.entries.map((e) => [e.id, e]));
  for (const id of ["anthropic-sonnet", "anthropic-haiku", "openai-ghostwriter", "openai-call-script", "openai-assistant-chat", "openai-transcribe", "google-ads-rest", "stripe-node-client", "dep-anthropic-sdk", "dep-openai", "dep-stripe"]) {
    assert.ok(byId[id], `chýba záznam ${id}`);
  }
  const sonnet = byId["anthropic-sonnet"];
  assert.ok(readFile(sonnet.source_file).includes(sonnet.model_or_api));
  assert.equal(sonnet.api_version, null);
  assert.equal(sonnet.api_version_gap, true);
  assert.equal(byId["google-ads-rest"].api_version_gap, false);
  assert.match(readFile(byId["google-ads-rest"].source_file), new RegExp(`"${byId["google-ads-rest"].api_version}"`));
  assert.equal(byId["stripe-node-client"].api_version, null);
  assert.equal(byId["stripe-node-client"].api_version_gap, true);
  const pkg = JSON.parse(readFile("apps/crm/package.json")).dependencies;
  assert.equal(byId["dep-stripe"].dependency_range, pkg.stripe);
  assert.equal(byId["dep-openai"].dependency_range, pkg.openai);
  assert.equal(codeownersPresent, false);
  for (const entry of inv.entries) {
    assert.equal(entry.ownership_gap, true);
    assert.equal(entry.owner, null);
    assert.equal(entry.vendor_live, false);
    assert.equal(entry.autoMigrate, undefined);
  }
  assert.equal(inv.vendor_deprecation_fetched, false);
  const committed = JSON.parse(readFile("scripts/ci/api-lifecycle-inventory.json"));
  assert.deepEqual(committed, inv);
});
