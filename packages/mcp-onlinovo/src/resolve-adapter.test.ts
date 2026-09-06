import assert from "node:assert/strict";
import { test } from "node:test";
import { FixtureAdapter } from "./adapters/fixture.js";
import { ShoptetPrivateAdapter } from "./adapters/shoptet-private.js";
import { resolveAdapter } from "./resolve-adapter.js";

test("default adapter is fixture", () => {
  const adapter = resolveAdapter({} as NodeJS.ProcessEnv);
  assert.equal(adapter.source, "fixture");
});

test("unconnected adapter selected by env", () => {
  const adapter = resolveAdapter({ ONLINOVO_SHOP_ADAPTER: "unconnected" } as NodeJS.ProcessEnv);
  assert.equal(adapter.source, "unconnected");
});

test("shoptet without token is fail-closed on health", async () => {
  const adapter = resolveAdapter({ ONLINOVO_SHOP_ADAPTER: "shoptet" } as NodeJS.ProcessEnv);
  assert.equal(adapter.source, "shoptet");
  const health = await adapter.health();
  assert.equal(health.shop_connected, false);
  assert.equal(health.detail, "SHOP_TOKEN_MISSING");
});

test("shoptet adapter does not fetch when token missing", async () => {
  let called = 0;
  const fakeFetch: typeof fetch = async () => {
    called += 1;
    return new Response("nope", { status: 500 });
  };
  const adapter = new ShoptetPrivateAdapter(undefined, fakeFetch);
  await adapter.health();
  assert.equal(called, 0);
});

test("fixture stock_low filters below threshold", async () => {
  const items = await new FixtureAdapter().stockLow(5);
  assert.ok(items.every((item) => item.qty < 5));
  assert.ok(items.some((item) => item.sku === "FIX-SKU-001"));
});
