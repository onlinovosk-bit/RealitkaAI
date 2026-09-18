import { FixtureAdapter } from "./adapters/fixture.js";
import { ShoptetPrivateAdapter } from "./adapters/shoptet-private.js";
import type { ShopAdapter } from "./adapters/types.js";
import { UnconnectedAdapter } from "./adapters/unconnected.js";

export function resolveAdapter(env: NodeJS.ProcessEnv = process.env): ShopAdapter {
  const mode = (env.ONLINOVO_SHOP_ADAPTER ?? "fixture").trim().toLowerCase();
  if (mode === "unconnected") return new UnconnectedAdapter();
  if (mode === "shoptet") {
    return new ShoptetPrivateAdapter(env.SHOPTET_PRIVATE_API_TOKEN);
  }
  return new FixtureAdapter();
}
