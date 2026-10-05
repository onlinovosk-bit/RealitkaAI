import { buildFixtureSnapshot } from "./fixture-data.js";
import type { DataSourceName, RevenueSnapshot } from "./types.js";

/**
 * Narrow input port for the three agents. It is deliberately NOT a `ShopAdapter` and not a
 * generic provider resolver: `ShopAdapter` has no customer history and must not grow into a
 * universal adapter, and there is no `LeadHubProvider` in this repository (P08 §A).
 * Only two honest sources exist: `fixture` and `unconnected`. A live source needs a verified
 * contract first.
 */
export interface RevenueDataPort {
  readonly source: DataSourceName;
  snapshot(now: Date): Promise<RevenueSnapshot>;
}

export class FixtureDataPort implements RevenueDataPort {
  readonly source = "fixture" as const;
  async snapshot(now: Date): Promise<RevenueSnapshot> {
    return buildFixtureSnapshot(now);
  }
}

export class UnconnectedDataPort implements RevenueDataPort {
  readonly source = "unconnected" as const;
  async snapshot(now: Date): Promise<RevenueSnapshot> {
    return { source: "unconnected", as_of: now.toISOString(), customers: [], orders: [], products: [] };
  }
}

export const INTELLIGENCE_SOURCE_UNSUPPORTED = "INTELLIGENCE_SOURCE_UNSUPPORTED";

/** Fail-closed: anything that is not exactly `fixture` or `unconnected` resolves to unconnected plus an error code. */
export function resolveDataPort(env: NodeJS.ProcessEnv = process.env): {
  port: RevenueDataPort;
  error_code: string | null;
} {
  const mode = (env.ONLINOVO_INTELLIGENCE_SOURCE ?? "fixture").trim().toLowerCase();
  if (mode === "fixture") return { port: new FixtureDataPort(), error_code: null };
  if (mode === "unconnected") return { port: new UnconnectedDataPort(), error_code: null };
  return { port: new UnconnectedDataPort(), error_code: INTELLIGENCE_SOURCE_UNSUPPORTED };
}
