import assert from "node:assert/strict";
import { test } from "node:test";
import { WRITE_DISABLED_CODE } from "./policy.js";
import { tools } from "./server.js";
import { handleHealth } from "./tools/health.js";
import { handleOrdersOpen } from "./tools/orders-open.js";
import { handleStockLow } from "./tools/stock-low.js";
import { handleWriteProduct } from "./tools/write-stub.js";

function parseBody(result: { content: Array<{ text: string }>; isError?: boolean }) {
  return JSON.parse(result.content[0].text) as {
    success: boolean;
    data?: Record<string, unknown>;
    error?: { code: string; message: string };
  };
}

test("server registers four onlinovo tools", () => {
  assert.deepEqual(
    tools.map((tool) => tool.name).sort(),
    ["onlinovo_health", "onlinovo_orders_open", "onlinovo_stock_low", "onlinovo_write_product"]
  );
});

test("health in fixture mode is not live shop", async () => {
  process.env.ONLINOVO_SHOP_ADAPTER = "fixture";
  delete process.env.SHOPTET_PRIVATE_API_TOKEN;
  const body = parseBody(await handleHealth({}));
  assert.equal(body.success, true);
  assert.equal(body.data?.adapter, "fixture");
  assert.equal(body.data?.write_enabled, false);
  assert.equal(body.data?.shop_connected, false);
});

test("stock_low fixture source is labeled fixture", async () => {
  process.env.ONLINOVO_SHOP_ADAPTER = "fixture";
  const body = parseBody(await handleStockLow({ threshold: 5 }));
  assert.equal(body.success, true);
  assert.equal(body.data?.source, "fixture");
  const items = body.data?.items as Array<{ sku: string }>;
  assert.ok(items.length >= 1);
  assert.ok(items.every((item) => item.sku.startsWith("FIX-")));
});

test("orders_open has no emails", async () => {
  process.env.ONLINOVO_SHOP_ADAPTER = "fixture";
  const result = await handleOrdersOpen({});
  const text = result.content[0].text;
  assert.equal(text.includes("@"), false);
  const body = JSON.parse(text);
  assert.equal(body.data.source, "fixture");
  for (const order of body.data.orders) {
    assert.equal(Object.keys(order).sort().join(","), "age_hours,id,status");
  }
});

test("write stub is denied", async () => {
  const result = await handleWriteProduct({ sku: "FIX-SKU-001" });
  assert.equal(result.isError, true);
  const body = parseBody(result);
  assert.equal(body.success, false);
  assert.equal(body.error?.code, WRITE_DISABLED_CODE);
});

test("unconnected stock is empty and labeled", async () => {
  process.env.ONLINOVO_SHOP_ADAPTER = "unconnected";
  const body = parseBody(await handleStockLow({}));
  assert.equal(body.data?.source, "unconnected");
  assert.deepEqual(body.data?.items, []);
});

test("shoptet stock without mapping is blocked, not faked", async () => {
  process.env.ONLINOVO_SHOP_ADAPTER = "shoptet";
  delete process.env.SHOPTET_PRIVATE_API_TOKEN;
  const result = await handleStockLow({});
  const body = parseBody(result);
  assert.equal(body.success, false);
  assert.equal(body.error?.code, "SHOP_MAPPING_BLOCKED");
  assert.notEqual(body.data?.source, "shoptet");
});
